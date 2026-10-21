import { expect, it } from 'vitest';
import {
  COMBAT_LAB_VERSION,
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabView,
} from '@warwrit/protocol';
import { createEmptyTiles } from './editor-model.js';
import { isCombatLabView } from './view-validation.js';
import { readSessionView } from './session-transport.js';

// Synthetic wire data; real projector/admission integration is tested on the server.
function viewFixture(): CombatLabView {
  const tiles = createEmptyTiles();
  const units: CombatLabView['units'] = ['human', 'opponent'].map((sideId, index) => ({
    id: `${sideId}-1`,
    sideId,
    weaponId: 'bow',
    position: { q: 2 + index * 5, r: 5 },
    status: 'active',
    guarding: false,
    initiative: 10,
    pools: {
      health: { current: 100, maximum: 100 },
      armor: { current: 0, maximum: 0 },
      stamina: { current: 100, maximum: 100 },
      morale: { current: 100, maximum: 100 },
    },
    wounds: [],
  }));
  return {
    version: COMBAT_LAB_VERSION,
    sessionId: 'session',
    battleId: 'validation',
    scenarioId: SPRITE_COMBAT_LAB_SCENARIO,
    controlledSideId: 'human',
    viewRevision: 1,
    status: 'active',
    round: 1,
    battle: {
      version: 1,
      name: 'Validation fixture',
      seed: 1,
      map: { name: 'Validation field', tiles },
      units: [
        { id: 'human-1', sideId: 'human', profileId: 'W01', position: { q: 2, r: 5 } },
        { id: 'opponent-1', sideId: 'opponent', profileId: 'W01', position: { q: 7, r: 5 } },
      ],
    },
    map: { hexes: tiles, blocked: [], tiles },
    sides: [
      { id: 'human', retreatHexes: [] },
      { id: 'opponent', retreatHexes: [] },
    ],
    units,
    initiativeOrder: ['human-1', 'opponent-1'],
    turnIndex: 0,
    activation: {
      id: 'activation-1',
      actorId: 'human-1',
      actionPoints: { current: 4, maximum: 4 },
    },
    movementPreview: [
      { to: { q: 3, r: 5 }, path: [{ q: 3, r: 5 }], actionPointCost: 1, staminaCost: 4 },
    ],
    attackPreview: [],
    attackRefusals: [
      {
        targetId: 'opponent-1',
        code: 'out-of-range',
        distance: 5,
        minimumRange: 1,
        maximumRange: 4,
      },
    ],
    events: [],
    omittedEventPrefix: 0,
    outcome: null,
  };
}

it('admits new and legacy omissions through the real session reader', async () => {
  const view = viewFixture();
  expect(isCombatLabView(view)).toBe(true);
  await expect(
    readSessionView(new Response(JSON.stringify(view)), view.sessionId),
  ).resolves.toEqual(view);
  const { attackRefusals: _, ...legacy } = view;
  expect(isCombatLabView(legacy)).toBe(true);
  await expect(
    readSessionView(new Response(JSON.stringify(legacy)), view.sessionId),
  ).resolves.toEqual(legacy);
  for (const code of [
    'panicking',
    'not-actor-turn',
    'battle-resolved',
    'threat-not-available',
    'no-line-of-sight',
  ]) {
    expect(isCombatLabView({ ...view, attackRefusals: [{ targetId: 'opponent-1', code }] })).toBe(
      true,
    );
  }
});

it('rejects corrupt refusals before transport admission, including terminal views', async () => {
  const view = viewFixture();
  for (const attackRefusals of [
    null,
    {},
    [null],
    [{ targetId: 'foreign', code: 'panicking' }],
    [{ targetId: 'human-1', code: 'panicking' }],
    [{ targetId: 'opponent-1', code: 'unknown' }],
    [{ targetId: 'opponent-1', code: 'no-line-of-sight', blockerId: 'hidden' }],
    [{ targetId: 'opponent-1', code: 'panicking', available: { stamina: 2, actionPoints: 2 } }],
    [
      {
        targetId: 'opponent-1',
        code: 'out-of-range',
        distance: 5,
        minimumRange: 4,
        maximumRange: 1,
      },
    ],
    [
      {
        targetId: 'opponent-1',
        code: 'insufficient-stamina',
        available: { stamina: 2 },
        required: { stamina: 3, actionPoints: 4 },
      },
    ],
    [
      { targetId: 'opponent-1', code: 'panicking' },
      { targetId: 'opponent-1', code: 'panicking' },
    ],
  ]) {
    const payload = { ...view, attackRefusals };
    expect(isCombatLabView(payload)).toBe(false);
    expect(isCombatLabView({ ...payload, status: 'resolved', activation: null })).toBe(false);
    await expect(
      readSessionView(new Response(JSON.stringify(payload)), view.sessionId),
    ).rejects.toThrow('invalid view');
  }
  expect(
    isCombatLabView({
      ...view,
      attackPreview: [{ targetId: 'opponent-1' }],
      attackRefusals: [{ targetId: 'opponent-1', code: 'panicking' }],
    }),
  ).toBe(false);
  expect(
    isCombatLabView({
      ...view,
      attackRefusals: [
        {
          targetId: 'opponent-1',
          code: 'out-of-range',
          distance: NaN,
          minimumRange: 1,
          maximumRange: 4,
        },
      ],
    }),
  ).toBe(false);
});

it.each([{}, 'corrupt', null])(
  'rejects malformed attackPreview %j before refusal overlap validation',
  (attackPreview) => {
    const payload = {
      ...viewFixture(),
      attackPreview,
      attackRefusals: [{ targetId: 'opponent-1', code: 'panicking' }],
    };
    expect(isCombatLabView(payload)).toBe(false);
  },
);

it.each([{}, 'corrupt', null])(
  'reports invalid view for malformed attackPreview %j combined with refusals',
  async (attackPreview) => {
    const view = viewFixture();
    const payload = {
      ...view,
      attackPreview,
      attackRefusals: [{ targetId: 'opponent-1', code: 'panicking' }],
    };
    await expect(
      readSessionView(new Response(JSON.stringify(payload)), view.sessionId),
    ).rejects.toThrow('invalid view');
  },
);

it('admits absent, empty, omitted, present and mixed affordability through the reader', async () => {
  const view = viewFixture();
  const movement = view.movementPreview![0]!;
  for (const movementPreview of [
    undefined,
    [],
    [movement],
    [{ ...movement, attackAffordableAfter: true }],
    [{ ...movement, attackAffordableAfter: false }],
    [
      movement,
      { ...movement, attackAffordableAfter: true },
      { ...movement, attackAffordableAfter: false },
    ],
  ]) {
    const payload = JSON.parse(JSON.stringify({ ...view, movementPreview }));
    expect(isCombatLabView(payload)).toBe(true);
    await expect(
      readSessionView(new Response(JSON.stringify(payload)), view.sessionId),
    ).resolves.toEqual(payload);
  }
});

it('rejects malformed affordability before transport admission, including terminal views', async () => {
  const view = viewFixture();
  const movement = view.movementPreview![0]!;
  for (const movementPreview of [
    null,
    {},
    [null],
    [[]],
    ...[null, 0, 'false', {}, []].map((flag) => [{ ...movement, attackAffordableAfter: flag }]),
  ]) {
    for (const status of ['active', 'resolved']) {
      const payload = { ...view, status, activation: null, movementPreview };
      expect(isCombatLabView(payload)).toBe(false);
      await expect(
        readSessionView(new Response(JSON.stringify(payload)), view.sessionId),
      ).rejects.toThrow('invalid view');
    }
  }
});

function skillReachView(): CombatLabView {
  const view = viewFixture();
  return {
    ...view,
    rulesetId: 'sprite-prototype-v3',
    units: view.units.map((unit) =>
      unit.id === 'human-1' ? { ...unit, skillRanks: { 'aimed-shot': 2 } } : unit,
    ),
    skills: [
      {
        skillId: 'aimed-shot',
        name: 'Прицельный выстрел',
        rank: 2,
        target: 'enemy',
        minimumRange: 2,
        maximumRange: 4,
        actionPointCost: 4,
        staminaCost: 24,
        duration: 'instant',
        description: '',
        equipmentAvailable: true,
      },
    ],
    skillReach: [
      {
        actorId: 'human-1',
        activationId: 'activation-1',
        revision: 1,
        skillId: 'aimed-shot',
        minimumRange: 2,
        maximumRange: 4,
        cells: [{ q: 4, r: 5 }],
      },
    ],
  };
}
async function rejectsReach(payload: unknown) {
  expect(isCombatLabView(payload)).toBe(false);
  await expect(readSessionView(new Response(JSON.stringify(payload)), 'session')).rejects.toThrow(
    'invalid view',
  );
}
it('admits optional, empty and signed skill geometry without computing range or LOS', async () => {
  const view = skillReachView();
  const row = view.skillReach![0]!;
  const negative = { q: -7, r: -3 };
  for (const payload of [
    view,
    { ...view, rulesetId: 'sprite-prototype-v4' },
    { ...view, skillReach: undefined },
    { ...view, skillReach: [] },
    { ...view, skillReach: [{ ...row, cells: [] }] },
    {
      ...view,
      map: { ...view.map, hexes: [...view.map.hexes, negative] },
      skillReach: [{ ...row, cells: [negative] }],
    },
    ...['m0-prototype-v1', 'sprite-prototype-v1', 'sprite-prototype-v2'].flatMap((rulesetId) =>
      [undefined, []].map((skillReach) => ({
        ...view,
        rulesetId,
        scenarioId: rulesetId === 'm0-prototype-v1' ? 'm0-3v3-v1' : view.scenarioId,
        skillReach,
      })),
    ),
    { ...view, status: 'resolved', activation: null, skillReach: [] },
  ]) {
    const parsed = JSON.parse(JSON.stringify(payload));
    expect(isCombatLabView(parsed)).toBe(true);
    await expect(readSessionView(new Response(JSON.stringify(parsed)), 'session')).resolves.toEqual(
      parsed,
    );
  }
});
it('rejects every malformed reach row and cell through the real reader', async () => {
  const view = skillReachView();
  const row = view.skillReach![0]!;
  for (const skillReach of [
    null,
    {},
    'bad',
    [null],
    [[]],
    [42],
    [row, row],
    ...Object.keys(row).map((key) => [{ ...row, [key]: undefined }]),
    ...['', 'foreign'].map((actorId) => [{ ...row, actorId }]),
    ...['', 'stale'].map((activationId) => [{ ...row, activationId }]),
    ...[-1, 0, 2, 1.5, Number.MAX_SAFE_INTEGER + 1].map((revision) => [{ ...row, revision }]),
    ...['unknown', 'rally'].map((skillId) => [{ ...row, skillId }]),
    ...[-1, 1.5, Number.MAX_SAFE_INTEGER + 1, 5].map((minimumRange) => [{ ...row, minimumRange }]),
    [{ ...row, maximumRange: 1 }],
    [{ ...row, maximumRange: 5 }],
    [{ ...row, targetId: 'hidden' }],
    ...[
      null,
      {},
      [null],
      [[]],
      [{ q: 4 }],
      [{ q: 4, r: 5, extra: 1 }],
      [{ q: 4.1, r: 5 }],
      [{ q: 999, r: 5 }],
      [{ q: 4, r: Number.MAX_SAFE_INTEGER + 1 }],
      [row.cells[0], row.cells[0]],
    ].map((cells) => [{ ...row, cells }]),
  ])
    await rejectsReach({ ...view, skillReach });
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(isCombatLabView({ ...view, skillReach: [{ ...row, revision: value }] })).toBe(false);
    expect(isCombatLabView({ ...view, skillReach: [{ ...row, minimumRange: value }] })).toBe(false);
    expect(
      isCombatLabView({ ...view, skillReach: [{ ...row, cells: [{ q: value, r: 5 }] }] }),
    ).toBe(false);
  }
});
it('rejects mismatched reach context and malformed companions safely on both scenarios and terminal views', async () => {
  const view = skillReachView();
  for (const patch of [
    { activation: null },
    { activation: [] },
    { activation: { id: '', actorId: 'human-1' } },
    { activation: { ...view.activation!, actorId: 'opponent-1' } },
    { units: view.units.filter((unit) => unit.id !== 'human-1') },
    { units: view.units.map((unit) => ({ ...unit, status: 'dead' })) },
    { units: view.units.map((unit) => ({ ...unit, sideId: 'foreign' })) },
    { skills: undefined },
    { skills: [] },
    { skills: null },
    { skills: {} },
    { skills: [null] },
    { skills: [{ ...view.skills![0], minimumRange: -1 }] },
    { skills: [{ ...view.skills![0], maximumRange: 3 }] },
    { units: [null] },
    { units: {} },
    { map: { ...view.map, hexes: [null] } },
    { map: { ...view.map, blocked: [null] } },
    { map: { ...view.map, blocked: view.skillReach![0]!.cells } },
  ]) {
    for (const scenarioId of ['m0-3v3-v1', 'sprite-6v6-v1']) {
      const payload = { ...view, ...patch, scenarioId };
      await rejectsReach(payload);
      await rejectsReach({ ...payload, status: 'resolved' });
    }
  }
  for (const rulesetId of [
    undefined,
    'm0-prototype-v1',
    'sprite-prototype-v1',
    'sprite-prototype-v2',
  ])
    await rejectsReach({ ...view, rulesetId });
});
