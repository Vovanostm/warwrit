// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { WorldSurroundingsDto } from '@warwrit/protocol';
import { GameShell } from './GameShell.js';
import type * as SurroundingsModule from './surroundings.js';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

const movement = vi.hoisted(() => ({ mode: 'STATIONARY_SITE' as string | null }));
vi.mock('./continuous-movement.js', () => ({
  useContinuousMovement: () => ({
    current: movement.mode === null ? null : { mode: movement.mode, plan: null },
    clock: { current: { serverMs: 0, receivedAt: 0 } },
  }),
}));
vi.mock('./MovementTerrain.js', () => ({ MovementTerrain: () => null }));
vi.mock('./WorldAmbience.js', () => ({ WorldAmbience: () => null }));
vi.mock('./ContinuousMapCanvas.js', () => ({
  ContinuousMapCanvas: ({ onSelectSite }: { onSelectSite: (id: string) => void }) => (
    <button onClick={() => onSelectSite('bereznyak')}>Выбрать Березняк на карте</button>
  ),
}));
vi.mock('./PlaceScene.js', () => ({
  PlaceScene: ({ name }: { name: string }) => <section aria-label={`Локация: ${name}`} />,
}));
vi.mock('./surroundings.js', async (original) => ({
  ...(await original<typeof SurroundingsModule>()),
  useSurroundings: () => ({
    status: 'ready',
    stale: false,
    reading: {
      receivedAt: 0,
      dto: {
        schemaVersion: 1,
        serverTimeMs: '0',
        campaign: { tick: '0', ticksPerDay: '1000', msPerTick: '21600' },
        light: { phase: 'DAY', msIntoPhase: '0', phaseMs: '600000' },
        observerSiteId: 'severny-dvor',
        observedCompanies: [],
        observedHostiles: [],
        map: {
          regionVersion: 'test',
          regionName: 'Поречье',
          edges: [],
          continuous: {},
          sites: [
            {
              siteId: 'severny-dvor',
              name: 'Северный Двор',
              kind: 'VILLAGE',
              danger: 'SAFE',
              q: 0,
              r: 0,
            },
            { siteId: 'bereznyak', name: 'Березняк', kind: 'VILLAGE', danger: 'SAFE', q: 1, r: 0 },
          ],
        },
      } as unknown as WorldSurroundingsDto,
    },
  }),
}));

// These tests exercise UI selection against supplied server projections, not travel simulation.
const props = {
  company: {
    companyId: 'company',
    companyPresentation: { name: 'Test', bannerId: 'broken-company' },
    revision: '0',
    leaderId: null,
    characters: [],
    runStatus: 'ACTIVE',
  },
  world: {
    schemaVersion: 2,
    publicRevision: '0',
    execution: null,
    availableDepartures: [],
    party: { location: 'severny-dvor' },
  },
  holdings: undefined,
  freeMovement: null,
  freeMovementScope: { accountId: 'account', companyId: 'company' },
  placeSlot: () => null,
  onSignOut: () => undefined,
} as unknown as ComponentProps<typeof GameShell>;

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  movement.mode = 'STATIONARY_SITE';
});

async function mount() {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  await act(async () => root.render(<GameShell {...props} />));
  cleanup = () => {
    act(() => root.unmount());
    element.remove();
  };
  return {
    element,
    click: async (label: string) => {
      const button = [...element.querySelectorAll('button')].find(
        (node) => node.textContent === label,
      );
      expect(button, label).toBeDefined();
      await act(async () => button!.click());
    },
  };
}

it('keeps Place at the actual settlement after a distant map selection', async () => {
  const ui = await mount();
  await ui.click('Выбрать Березняк на карте');
  expect(ui.element.querySelector('.tab-active')?.textContent).toBe('Путь');
  expect(ui.element.querySelector('[aria-label^="Локация:"]')).toBeNull();
  expect(ui.element.textContent).toContain('Выбрано на карте: Березняк');
  await ui.click('Место');
  expect(ui.element.querySelector('[aria-label^="Локация:"]')?.getAttribute('aria-label')).toBe(
    'Локация: Северный Двор',
  );
  expect(ui.element.querySelector('.place-panel h2')?.textContent).toBe('Северный Двор');
});

it.each([
  ['STATIONARY_TERRAIN', 'Здания и услуги доступны после прибытия'],
  [null, 'Сверяем положение отряда'],
])('does not open a remembered settlement with movement mode %s', async (mode, message) => {
  movement.mode = mode;
  const ui = await mount();
  await ui.click('Выбрать Березняк на карте');
  await ui.click('Место');
  expect(ui.element.querySelector('[aria-label^="Локация:"]')).toBeNull();
  expect(ui.element.querySelector('.place-panel')?.textContent).toContain(message!);
});
