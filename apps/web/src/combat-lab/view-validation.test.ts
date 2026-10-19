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
