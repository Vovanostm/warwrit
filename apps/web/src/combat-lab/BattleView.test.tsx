import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CombatLabView } from '@warwrit/protocol';
import { BattleView } from './BattleView.js';

const view: CombatLabView = {
  version: 1,
  sessionId: 'session',
  battleId: 'battle',
  scenarioId: 'm0-3v3-v1',
  controlledSideId: 'human',
  viewRevision: 7,
  status: 'active',
  round: 2,
  map: {
    hexes: [
      { q: -1, r: -1 },
      { q: 1, r: 1 },
    ],
    blocked: [{ q: 1, r: 1 }],
  },
  sides: [{ id: 'human', retreatHexes: [{ q: -1, r: -1 }] }],
  units: [
    {
      id: 'opponent',
      sideId: 'enemy',
      weaponId: 'bow',
      position: { q: -1, r: -1 },
      status: 'active',
      guarding: true,
      initiative: 17,
      pools: {
        health: { current: 9, maximum: 31 },
        armor: { current: 0, maximum: 11 },
        stamina: { current: 12, maximum: 40 },
        morale: { current: 3, maximum: 90 },
      },
      wounds: ['severe'],
    },
  ],
  initiativeOrder: ['opponent'],
  turnIndex: 0,
  activation: { id: 'activation', actorId: 'opponent', actionPoints: { current: 1, maximum: 3 } },
  events: [
    {
      id: 'event',
      revision: 7,
      ordinal: 0,
      type: 'attack.resolved',
      unitId: 'opponent',
      targetId: 'human',
      hit: false,
      healthDamage: null,
      armorDamage: null,
    },
  ],
  omittedEventPrefix: 4,
  outcome: null,
};

const render = (observation = view) =>
  renderToStaticMarkup(
    <BattleView
      view={observation}
      selectedUnitId="opponent"
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );

it('structurally renders received facts without simulating or mutating them', () => {
  const observation = structuredClone(view);
  Object.assign(observation, { secret: 'hidden-seed' });
  const before = JSON.stringify(observation);
  const html = render(observation);
  for (const text of [
    '9/31',
    '0/11',
    '12/40',
    '3/90',
    'Очки действий: 1/3',
    'Инициатива: 17',
    'тяжёлая',
    'промах',
    'Ранних событий не показано: 4',
  ])
    expect(html).toContain(text);
  expect(html).not.toContain('hidden-seed');
  expect(html).not.toContain('Победитель:');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('aria-label="Осмотреть opponent: Противник (enemy), В строю"');
  expect(JSON.stringify(observation)).toBe(before);
});

it('structurally preserves signed axial geometry and labelled inspection targets', () => {
  const html = render();
  const translations = [...html.matchAll(/translate\(([-\d.]+) ([-\d.]+)\)/g)];
  expect(Number(translations[0]?.[1])).toBeCloseTo(-62.353829);
  expect(Number(translations[0]?.[2])).toBe(-36);
  expect(Number(translations[1]?.[1])).toBeCloseTo(62.353829);
  expect(Number(translations[1]?.[2])).toBe(36);
  expect(html).toContain('Клетка -1,-1, выход: Ваша сторона (human)');
  expect(html).toContain('Клетка 1,1, препятствие');
  expect(html).toContain('tabindex="0"');
  const unit = view.units[0]!;
  const overlap = render({
    ...view,
    units: [
      { ...unit, id: 'live' },
      { ...unit, id: 'dead', status: 'dead' },
    ],
  });
  const board = overlap.split('</svg>')[0] ?? '';
  expect(board.indexOf('Осмотреть dead')).toBeLessThan(board.indexOf('Осмотреть live'));
  expect(overlap).toContain('1. Осмотреть live');
});

it('shows terminal facts without deriving victory from remaining units', () => {
  const resolved: CombatLabView = {
    ...view,
    status: 'resolved',
    activation: null,
    outcome: { reason: 'round-limit', winnerSideId: null },
  };
  expect(render(resolved)).toContain('Победителя нет');
  expect(render(resolved)).toContain('предел раундов');
  expect(render(resolved)).toContain('Активного хода нет');
});
