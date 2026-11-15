// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanySummaryDto,
  type HostileLootAvailabilityDto,
} from '@warwrit/protocol';
import { HostileLootPanel } from './HostileLootPanel.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const company: CompanySummaryDto = {
  companyId: 'company-one',
  revision: '8',
  companyPresentation: null,
  leaderId: 'mora',
  runStatus: 'ACTIVE',
  characters: [
    {
      characterId: 'mora',
      name: 'Мора',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE',
    },
  ],
};

const availability: HostileLootAvailabilityDto = {
  schemaVersion: 1,
  publicRevision: '8',
  sources: [
    {
      hostileId: 'world.raider.old-mill.front.01',
      terminalSourceId: 'terminal-one',
      terminalRevision: 1,
      location: { siteId: 'old-mill', areaId: 'yard' },
      items: [
        {
          itemId: 'bow-one',
          definitionId: 'bow',
          currentCondition: 50,
          maximumCondition: 100,
        },
      ],
    },
  ],
  targetContainerIds: ['mora-pack'],
};

const scope = {
  accountId: 'account-one',
  company,
  instanceId: 'ci.m1.raider-standard.01',
  refreshKey: 0,
  onRefresh: vi.fn(),
  onUnauthorized: vi.fn(),
};

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

it('keeps an exact hostile-loot pickup after a lost reply and retries it across remount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const postedBodies: string[] = [];
  const apiCalls: string[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    apiCalls.push(input);
    if (input === '/api/auth/session') return Response.json({ accountId: 'account-one' });
    if (input.endsWith('/company/hostile-loot/ci.m1.raider-standard.01')) {
      expect((init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
        company.companyId,
      );
      return Response.json(availability);
    }
    if (input === '/api/company')
      return Response.json({
        company,
        holdings: {
          transfer: {
            containers: [{ containerId: 'mora-pack', carrierCharacterId: 'mora', kind: 'CARRIED' }],
          },
        },
      });
    if (!input.endsWith('/pickup')) throw new Error(`Unexpected UI request: ${input}`);
    postedBodies.push(String(init?.body));
    if (postedBodies.length === 1) throw new Error('lost reply');
    return Response.json({
      schemaVersion: 1,
      commandId: (JSON.parse(String(init?.body)) as { commandId: string }).commandId,
      ok: true,
      receiptId: 'receipt-one',
      publicRevision: '9',
    });
  });

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<HostileLootPanel {...scope} />));
  expect(container.textContent).toContain('Налётчик с топором');
  expect(container.textContent).toContain('Лук');
  expect(container.textContent).toContain('Сумка: Мора');

  const select = container.querySelector('select')!;
  await act(async () => {
    Object.defineProperty(select, 'value', { configurable: true, value: 'mora-pack' });
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const take = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Забрать',
  );
  expect(take?.disabled).toBe(false);
  await act(async () => take?.click());
  expect(postedBodies).toHaveLength(1);
  const firstAttempt = JSON.parse(postedBodies[0]!) as Record<string, unknown>;
  expect(firstAttempt).toMatchObject({
    schemaVersion: 1,
    expectedPublicRevision: '8',
    instanceId: 'ci.m1.raider-standard.01',
    hostileId: 'world.raider.old-mill.front.01',
    itemId: 'bow-one',
    toContainerId: 'mora-pack',
  });
  expect(container.textContent).toContain('Ответ неизвестен');

  await act(async () => root?.unmount());
  root = createRoot(container);
  await act(async () => root?.render(<HostileLootPanel {...scope} />));
  const retry = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Повторить тот же приказ',
  );
  expect(retry).toBeDefined();
  await act(async () => retry?.click());
  expect(postedBodies).toEqual([postedBodies[0], postedBodies[0]]);
  expect(window.sessionStorage.length).toBe(0);
  expect(scope.onRefresh).toHaveBeenCalledOnce();
  expect(container.textContent).toContain('Вещь забрана.');
  expect(apiCalls).toContain('/api/company');
});

it('shows the canonical capacity rejection and refreshes available spoils', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input === '/api/auth/session') return Response.json({ accountId: 'account-one' });
    if (input.endsWith('/company/hostile-loot/ci.m1.raider-standard.01'))
      return Response.json(availability);
    if (input === '/api/company')
      return Response.json({ company, holdings: { transfer: { containers: [] } } });
    if (input.endsWith('/pickup'))
      return Response.json({
        schemaVersion: 1,
        commandId: (JSON.parse(String(init?.body)) as { commandId: string }).commandId,
        ok: false,
        publicRevision: '8',
        code: 'CAPACITY',
      });
    throw new Error(`Unexpected UI request: ${input}`);
  });

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<HostileLootPanel {...scope} />));
  const select = container.querySelector('select')!;
  await act(async () => {
    Object.defineProperty(select, 'value', { configurable: true, value: 'mora-pack' });
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const take = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Забрать',
  );
  await act(async () => take?.click());
  expect(container.textContent).toContain('В контейнере не хватает места');
  expect(container.textContent).toContain('Лук');
  expect(window.sessionStorage.length).toBe(0);
});
