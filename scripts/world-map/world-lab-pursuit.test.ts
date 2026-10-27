import { expect, it } from 'vitest';
import { parseWorldLabPursuit } from '../../apps/server/src/world-lab/pursuit.js';

it('rejects control IDs and client-supplied destination coordinates at the command boundary', () => {
  const order = {
    schemaVersion: 1,
    commandId: 'pursuit-1',
    expectedPublicRevision: '3',
    expectedMovementEpoch: '2',
    targetGroupId: 'lab-bandits',
  };
  expect([
    parseWorldLabPursuit(order),
    parseWorldLabPursuit({ ...order, commandId: '\u0000' }),
    parseWorldLabPursuit({ ...order, targetGroupId: '\n' }),
    parseWorldLabPursuit({ ...order, point: { xFp: 0, zFp: 0 } }),
  ]).toEqual([order, undefined, undefined, undefined]);
});
