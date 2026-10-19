import { expect, it } from 'vitest';
import {
  defaultSpriteBattle,
  createCustomBattleFixture,
} from '../../../server/src/combat-lab/custom-battle.js';
import { projectCombatLabView } from '../../../server/src/combat-lab/projection.js';
import { isCombatLabView } from './view-validation.js';
import { readSessionView } from './session-transport.js';

function viewFixture() {
  const battle = defaultSpriteBattle();
  const fixture = createCustomBattleFixture('validation', battle);
  const { state, events } = fixture.start();
  return projectCombatLabView('session', 'human', state, events, battle);
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
