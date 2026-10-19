import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { CombatLabView } from '@warwrit/protocol';
import { CommandDesk } from './CommandDesk.js';
import type { CombatLabHotkeyAction } from './command-input.js';

const unit = (
  id: string,
  sideId: string,
  weaponId: CombatLabView['units'][number]['weaponId'],
) => ({
  id,
  profileId: id,
  sideId,
  weaponId,
  position: { q: 0, r: 0 },
  status: 'active' as const,
  guarding: false,
  initiative: 10,
  pools: {
    health: { current: 20, maximum: 20 },
    armor: { current: 0, maximum: 0 },
    stamina: { current: 30, maximum: 30 },
    morale: { current: 80, maximum: 100 },
  },
  wounds: [],
});
const view: CombatLabView = {
  version: 1,
  sessionId: 's',
  battleId: 'b',
  scenarioId: 'sprite-6v6-v1',
  controlledSideId: 'human',
  viewRevision: 7,
  status: 'active',
  round: 1,
  map: { hexes: [], blocked: [] },
  sides: [],
  units: [unit('actor', 'human', 'spear'), unit('enemy', 'enemy', 'bow')],
  initiativeOrder: [],
  turnIndex: 0,
  activation: { id: 'a', actorId: 'actor', actionPoints: { current: 4, maximum: 4 } },
  events: [],
  omittedEventPrefix: 0,
  outcome: null,
  ruleHints: {
    hit: {
      shakenMoraleThreshold: 20,
      shakenPenalty: 10,
      lowStaminaThresholdPercent: 25,
      lowStaminaPenalty: 10,
    },
    weapons: [
      { id: 'spear', actionPointCost: 2, staminaCost: 3 },
      { id: 'bow', actionPointCost: 4, staminaCost: 16 },
    ],
    defend: { actionPointCost: 2, staminaCost: 8 },
    recovery: { staminaPerActivation: 18 },
  },
  attackPreview: [{ targetId: 'enemy', hitChance: 60, actionPointCost: 2, staminaCost: 3 }],
  availableActions: ['wait', 'defend'],
};
const props = () => ({
  view,
  selectedUnitId: 'enemy',
  selectedHex: null,
  commonReason: '',
  selectedSkillId: null,
  menuOpen: false,
  hotkeyActions: { current: {} as Record<string, CombatLabHotkeyAction> },
  act: vi.fn(),
  actOnField: vi.fn(),
  autoplay: false,
  pending: null,
  retryAction: vi.fn(),
  notice: '',
});

it.each([false, true])(
  'keeps the full transport message and retry in one feedback allocation (uncertain=%s)',
  (uncertain) => {
    const html = renderToStaticMarkup(
      <CommandDesk {...props()} pending={{ uncertain, description: 'Завершение хода' }} />,
    );
    expect(html).toContain(
      `<span>${uncertain ? 'Неизвестный' : 'Ожидается'} ответ: Завершение хода.</span>`,
    );
    expect(html.includes('Повторить тот же запрос')).toBe(uncertain);
  },
);

it('marks unavailable controls without disabling focus, mutes their prices and outlines only a ready attack', () => {
  const p = props();
  const html = renderToStaticMarkup(<CommandDesk {...p} />);
  expect(html).toContain('data-unavailable="true"');
  expect(html).toContain('class="battle-unavailable-mark" aria-hidden="true"');
  expect(html).toContain('data-ready="true"');
  expect(html).toContain('aria-label="Переместиться" aria-disabled="true"');
  expect(html).toContain('aria-describedby="command-Переместиться"');
  expect(html).not.toMatch(/\sdisabled="/);
  for (const extra of [{ commonReason: 'Ожидание' }, { selectedSkillId: 'aimed-shot' as const }])
    expect(renderToStaticMarkup(<CommandDesk {...p} {...extra} />)).not.toContain(
      'data-ready="true"',
    );
});

it('routes an available registered wait directly through the existing action', () => {
  const p = props();
  renderToStaticMarkup(<CommandDesk {...p} />);
  p.hotkeyActions.current['4']!.run();
  expect(p.act).toHaveBeenCalledExactlyOnceWith({ type: 'wait' }, 'Завершение хода');
});

it.each([
  { menuOpen: true },
  { selectedSkillId: 'aimed-shot' as const },
  { pending: { uncertain: false, description: 'Приказ' } },
  { pending: { uncertain: true, description: 'Приказ' } },
  { autoplay: true },
  { commonReason: 'Ход противника' },
])('never bypasses unavailable manual wait: %j', (extra) => {
  const p = props();
  renderToStaticMarkup(<CommandDesk {...p} {...extra} />);
  p.hotkeyActions.current['4']!.run();
  p.hotkeyActions.current['4']!.run();
  expect(p.act).not.toHaveBeenCalled();
});

it('keeps missing optional hints and previews safe without suppressing available wait', () => {
  const older = { ...view };
  delete older.ruleHints;
  delete older.attackPreview;
  delete older.availableActions;
  const p = { ...props(), view: older };
  const html = renderToStaticMarkup(<CommandDesk {...p} />);
  expect(html).toContain('Цена не опубликована');
  expect(html).toContain('Цель недоступна для атаки');
  expect(html).not.toContain('data-ready="true"');
  p.hotkeyActions.current['4']!.run();
  expect(p.act).toHaveBeenCalledExactlyOnceWith({ type: 'wait' }, 'Завершение хода');
});
