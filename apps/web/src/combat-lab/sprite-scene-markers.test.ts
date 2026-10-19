import { expect, it } from 'vitest';
import type { CombatLabView } from '@warwrit/protocol';
import { actorMarkerKey, markerPlan, unitEdgeTone } from './sprite-scene-markers.js';
const actor: CombatLabView['units'][number] = {
  id: 'actor',
  sideId: 'human',
  weaponId: 'bow',
  position: { q: 0, r: 0 },
  status: 'active',
  guarding: false,
  initiative: 1,
  wounds: [],
  pools: {
    health: { current: 20, maximum: 20 },
    armor: { current: 0, maximum: 0 },
    stamina: { current: 20, maximum: 20 },
    morale: { current: 20, maximum: 20 },
  },
  weaponReach: {
    minimumRange: 1,
    maximumRange: 3,
    cells: [
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 8, r: 8 },
    ],
  },
};
const enemy = { ...actor, id: 'enemy', sideId: 'enemy', position: { q: 2, r: 0 } };
const tiles = [0, 1, 2, 3].map((q) => ({ q, r: 0, blocked: q === 3 }));
const selection = {
  selectedId: null,
  selectedSkill: null,
  selectedCell: null,
  hoveredTarget: null,
  highlightedId: null,
  showFullGrid: false,
};
const view = {
  status: 'active' as const,
  controlledSideId: 'human',
  units: [actor, enemy],
  activation: { id: 'activation', actorId: 'actor', actionPoints: { current: 4, maximum: 4 } },
  movementPreview: [
    {
      to: { q: 1, r: 0 },
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      actionPointCost: 1,
      staminaCost: 1,
    },
  ],
  attackPreview: [{ targetId: 'enemy', hitChance: 80, actionPointCost: 2, staminaCost: 1 }],
};

it('combines public movement and passive reach, while legal targets and map boundaries keep their own authority', () => {
  const plan = markerPlan(view, tiles, selection);
  expect(plan.cells.get('1,0')).toEqual({ fill: 'combined', border: 'combined', priority: 4 });
  expect(plan.cells.get('2,0')).toEqual({ fill: 'target', border: 'target', priority: 6 });
  expect(plan.cells.get('3,0')).toEqual({ fill: null, border: 'blocked', priority: 2 });
  expect(plan.cells.has('8,8')).toBe(false);
  expect([...plan.attackableIds]).toEqual(['enemy']);
});

it('keeps passive inspection reach at AP zero without presenting attacks or movement as legal', () => {
  const plan = markerPlan(
    { ...view, activation: { ...view.activation, actionPoints: { current: 0, maximum: 4 } } },
    tiles,
    { ...selection, selectedId: 'actor' },
  );
  expect(plan.cells.get('1,0')).toEqual({ fill: 'shot', border: 'shot', priority: 4 });
  expect(plan.cells.get('2,0')).toEqual({ fill: 'shot', border: 'shot', priority: 4 });
  expect([...plan.attackableIds]).toEqual([]);
});

it('skill mode uses only matching legal previews and preserves threat then hover priority', () => {
  const threatening = {
    ...actor,
    threat: {
      targetId: 'enemy',
      targetHex: enemy.position,
      range: 2 as const,
      damage: { minimum: 2, maximum: 6 },
      retargeted: false,
      responseReceived: false,
    },
  };
  const skillView = {
    ...view,
    units: [threatening, enemy],
    skillPreview: [
      {
        skillId: 'aimed-shot' as const,
        targetId: 'enemy',
        name: 'Aim',
        rank: 1 as const,
        target: 'enemy' as const,
        minimumRange: 1,
        maximumRange: 4,
        duration: 'instant' as const,
        description: '',
        equipmentAvailable: true,
        rulesetId: 'sprite-prototype-v3' as const,
        revision: 4,
        activationId: 'activation',
        actorId: 'actor',
        legal: true,
        actionPointCost: 2,
        staminaCost: 1,
      },
      {
        skillId: 'rally' as const,
        targetId: 'actor',
        name: 'Rally',
        rank: 1 as const,
        target: 'ally' as const,
        minimumRange: 0,
        maximumRange: 1,
        duration: 'instant' as const,
        description: '',
        equipmentAvailable: true,
        rulesetId: 'sprite-prototype-v3' as const,
        revision: 4,
        activationId: 'activation',
        actorId: 'actor',
        legal: true,
        actionPointCost: 2,
        staminaCost: 1,
      },
    ],
  };
  const aimed = {
    ...selection,
    selectedSkill: 'aimed-shot' as const,
    selectedCell: enemy.position,
  };
  const threat = markerPlan(skillView, tiles, aimed);
  expect(threat.cells.has('1,0')).toBe(false);
  expect(threat.cells.get('2,0')).toEqual({ fill: 'threat', border: 'threat', priority: 9 });
  const hover = markerPlan(skillView, tiles, {
    ...aimed,
    hoveredTarget: { hex: enemy.position, unitId: 'enemy' },
  });
  expect(hover.cells.get('2,0')).toEqual({ fill: 'threat', border: 'inspection', priority: 10 });
  expect([...hover.attackableIds]).toEqual(['enemy']);
  const refused = markerPlan(
    { ...skillView, skillPreview: skillView.skillPreview.map((row) => ({ ...row, legal: false })) },
    tiles,
    aimed,
  );
  expect([...refused.attackableIds]).toEqual([]);
});

it('silhouette hover wins over attack tint only for living units', () => {
  const attackable = new Set(['enemy', 'actor']);
  expect(unitEdgeTone(enemy, view, 'enemy', attackable, false)).toBe('hover');
  expect(unitEdgeTone(enemy, view, null, attackable, true)).toBe('target');
  expect(unitEdgeTone(actor, view, null, attackable, false)).toBe('day');
  expect(unitEdgeTone({ ...enemy, status: 'dead' }, view, 'enemy', attackable, true)).toBe('night');
});

it('keeps one supplied actor marker through every inspection state, skill mode and AP zero', () => {
  for (const inspected of [
    selection,
    { ...selection, selectedId: 'actor' },
    { ...selection, selectedId: 'enemy', highlightedId: 'enemy' },
    {
      ...selection,
      selectedCell: { q: 3, r: 0 },
      hoveredTarget: { hex: enemy.position, unitId: 'enemy' },
    },
    { ...selection, selectedSkill: 'aimed-shot' as const, showFullGrid: true },
  ]) {
    const plan = markerPlan(
      {
        ...view,
        units: [{ ...actor, name: 'Лучник' }, enemy],
        activation: { ...view.activation, actionPoints: { current: 0, maximum: 4 } },
      },
      tiles,
      inspected,
    );
    expect(plan.actor).toEqual({
      id: 'actor',
      name: 'Лучник',
      sideId: 'human',
      position: actor.position,
    });
  }
  expect(markerPlan(view, tiles, selection).cells.get('0,0')).toEqual({
    fill: null,
    border: 'friendly',
    priority: 1,
  });
  expect(
    markerPlan({ ...view, activation: { ...view.activation, actorId: 'enemy' } }, tiles, selection)
      .actor,
  ).toEqual({ id: 'enemy', name: 'enemy', sideId: 'enemy', position: enemy.position });
});

it('clears the composite actor for terminal, null, missing and inactive activations', () => {
  for (const absent of [
    { ...view, status: 'resolved' as const },
    { ...view, activation: null },
    { ...view, activation: { ...view.activation, actorId: 'missing' } },
    { ...view, units: [{ ...actor, status: 'dead' as const }, enemy] },
  ])
    expect(markerPlan(absent, tiles, selection).actor).toBeNull();
});

it('retains marker textures on movement and refreshes them for projected name or side changes', () => {
  const descriptor = markerPlan(view, tiles, selection).actor!;
  const key = actorMarkerKey(descriptor, 'human');
  expect(actorMarkerKey({ ...descriptor, position: { q: 3, r: 1 } }, 'human')).toBe(key);
  expect(actorMarkerKey({ ...descriptor, name: 'Другой боец' }, 'human')).not.toBe(key);
  expect(actorMarkerKey({ ...descriptor, sideId: 'enemy' }, 'human')).not.toBe(key);
  expect(actorMarkerKey(descriptor, 'enemy')).not.toBe(key);
  expect(actorMarkerKey(null, 'human')).toBeNull();
});
