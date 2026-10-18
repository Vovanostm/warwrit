import { expect, it, vi } from 'vitest';
import { advanceEndTurnConfirmation, handleCombatLabKey } from './command-input.js';

const input = {
  context: 'session/battle/activation/actor/7',
  current: 4,
  maximum: 4,
  attackCost: 3,
  available: true,
};
const board = { closest: (selector: string) => selector === '.battle-view' };
const event = {
  key: '4',
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  preventDefault: vi.fn(),
};

it.each([1999, 2000, 2001])(
  'confirms only strictly inside the two-second window (%i ms)',
  (elapsed) => {
    const first = advanceEndTurnConfirmation(null, input, 100);
    expect(first.dispatch).toBe(false);
    expect(first.confirmation?.deadline).toBe(2100);
    expect(advanceEndTurnConfirmation(first.confirmation, input, 100 + elapsed).dispatch).toBe(
      elapsed < 2000,
    );
  },
);

it.each([
  [4, 4, 5, false],
  [3, 4, 3, false],
  [2, 4, 3, true],
  [0, 4, 3, true],
  [1, 4, undefined, false],
  [0, 4, undefined, true],
])('uses published AP/cost only: %i/%i, cost %s', (current, maximum, attackCost, dispatch) => {
  expect(
    advanceEndTurnConfirmation(null, { ...input, current, maximum, attackCost }, 0).dispatch,
  ).toBe(dispatch);
});

it('rejects unavailable input and stale context, while the same context preserves confirmation', () => {
  const first = advanceEndTurnConfirmation(null, input, 0).confirmation;
  expect(advanceEndTurnConfirmation(first, { ...input, available: false }, 1)).toEqual({
    confirmation: null,
    dispatch: false,
  });
  for (const context of [
    'new-session',
    'new-battle',
    'new-activation',
    'new-actor',
    'new-revision',
  ]) {
    expect(advanceEndTurnConfirmation(first, { ...input, context }, 1).dispatch).toBe(false);
  }
  expect(advanceEndTurnConfirmation(first, { ...input }, 1).dispatch).toBe(true);
});

it.each([
  ['4', ' '],
  [' ', '4'],
  ['4', '4'],
  [' ', ' '],
])('shares confirmation for %s then %s and cancels on Escape or another order', (first, second) => {
  let confirmation: ReturnType<typeof advanceEndTurnConfirmation>['confirmation'] = null;
  const dispatch = vi.fn();
  const cancel = vi.fn(() => {
    confirmation = null;
  });
  const actions = {
    '4': {
      reason: '',
      cancel,
      run: () => {
        const result = advanceEndTurnConfirmation(confirmation, input, 10);
        confirmation = result.confirmation;
        if (result.dispatch) dispatch();
      },
    },
    '3': { reason: '', run: vi.fn() },
  };
  const press = (key: string) => handleCombatLabKey({ ...event, key }, board, actions, vi.fn());
  press(first);
  expect(dispatch).not.toHaveBeenCalled();
  press(second);
  expect(dispatch).toHaveBeenCalledTimes(1);
  press(first);
  press('Escape');
  press(second);
  expect(dispatch).toHaveBeenCalledTimes(1);
  press('3');
  press(first);
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalledTimes(2);
});

it('ignores held keys, modifiers, interactive controls and targets outside the board', () => {
  const run = vi.fn();
  const actions = { '4': { reason: '', run } };
  for (const flag of ['repeat', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
    handleCombatLabKey({ ...event, [flag]: true }, board, actions, vi.fn());
  for (const target of [null, { closest: () => false }, { closest: () => true }])
    handleCombatLabKey(event, target, actions, vi.fn());
  handleCombatLabKey(event, board, { '4': { reason: 'Недоступно', run } }, vi.fn());
  expect(run).not.toHaveBeenCalled();
});
