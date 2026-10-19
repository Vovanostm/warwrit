import { expect, it, vi } from 'vitest';
import { handleCombatLabKey } from './command-input.js';

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

it.each(['4', ' '])('routes %s to the same guarded single-input wait', (key) => {
  const run = vi.fn();
  const preventDefault = vi.fn();
  handleCombatLabKey(
    { ...event, key, preventDefault },
    board,
    { '4': { reason: '', run } },
    vi.fn(),
  );
  expect(run).toHaveBeenCalledExactlyOnceWith();
  expect(preventDefault).toHaveBeenCalledExactlyOnceWith();
});

it('keeps Escape selection cancellation and other board commands', () => {
  const cancel = vi.fn();
  const run = vi.fn();
  const actions = { '3': { reason: '', run } };
  handleCombatLabKey({ ...event, key: 'Escape' }, board, actions, cancel);
  expect(cancel).toHaveBeenCalledExactlyOnceWith();
  expect(run).not.toHaveBeenCalled();
  handleCombatLabKey({ ...event, key: '3' }, board, actions, cancel);
  expect(run).toHaveBeenCalledExactlyOnceWith();
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
