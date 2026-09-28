import { expect, it, vi } from 'vitest';
import type { CombatLabAction, CombatLabView } from '@warwrit/protocol';
import { handleCombatLabActionReply, latestCombatLabView } from './controller.js';

const view = (viewRevision: number): CombatLabView => ({
  version: 1,
  sessionId: 'session',
  battleId: 'battle',
  scenarioId: 'm0-3v3-v1',
  controlledSideId: 'human',
  viewRevision,
  status: 'active',
  round: 1,
  map: { hexes: [], blocked: [] },
  sides: [],
  units: [],
  initiativeOrder: [],
  turnIndex: 0,
  activation: null,
  events: [],
  omittedEventPrefix: 0,
  outcome: null,
});

it('keeps older or foreign views from replacing the latest projection', () => {
  const latest = view(9);
  const before = JSON.stringify(latest);

  expect(latestCombatLabView(latest, view(4))).toBe(latest);
  expect(latestCombatLabView(latest, { ...view(10), sessionId: 'replacement-session' })).toBe(
    latest,
  );
  expect(latestCombatLabView(latest, { ...view(10), battleId: 'replacement-battle' })).toBe(latest);
  expect(JSON.stringify(latest)).toBe(before);
});

it.each([
  ['unreadable JSON', null],
  ['bare rejection code', { code: 'INVALID_ACTION' }],
  [
    'wrong request ID',
    {
      version: 1,
      sessionId: 'session',
      battleId: 'battle',
      requestId: 'other-request',
      status: 'accepted',
      viewRevision: 10,
    },
  ],
])(
  'keeps a %s action reply uncertain when the latest-view read fails',
  async (_description, reply) => {
    const action: CombatLabAction = {
      version: 1,
      sessionId: 'session',
      battleId: 'battle',
      requestId: 'request-1',
      expectedViewRevision: 9,
      activationId: 'activation',
      actorId: 'unit',
      intent: { type: 'wait' },
    };
    const refreshLatest = vi.fn(async () => {
      throw new Error('latest-view GET failed');
    });

    await expect(handleCombatLabActionReply(200, reply, action, refreshLatest)).resolves.toEqual({
      status: 'uncertain',
    });
    expect(refreshLatest).toHaveBeenCalledOnce();
  },
);
