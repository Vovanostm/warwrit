import { describe, expect, it } from 'vitest';

import { isHostileLootPickupRequestDto } from './hostile-loot.js';

describe('hostile loot transport', () => {
  const request = {
    schemaVersion: 1,
    commandId: 'loot-command-1',
    expectedPublicRevision: '8',
    instanceId: 'ci.m1.wolf-trail.01',
    hostileId: 'raider-a',
    itemId: 'raider-item-a',
    toContainerId: 'fixture-supply',
  };

  it('accepts one exact item claim request', () => {
    expect(isHostileLootPickupRequestDto(request)).toBe(true);
  });

  it('rejects extra fields and non-canonical revisions', () => {
    expect(isHostileLootPickupRequestDto({ ...request, owner: 'world' })).toBe(false);
    expect(isHostileLootPickupRequestDto({ ...request, expectedPublicRevision: '08' })).toBe(false);
  });

  it('accepts game entity IDs up to 256 characters without widening command IDs', () => {
    expect(isHostileLootPickupRequestDto({ ...request, itemId: 'x'.repeat(200) })).toBe(true);
    expect(isHostileLootPickupRequestDto({ ...request, itemId: 'x'.repeat(257) })).toBe(false);
    expect(isHostileLootPickupRequestDto({ ...request, itemId: `invalid\nitem` })).toBe(false);
    expect(isHostileLootPickupRequestDto({ ...request, commandId: 'x'.repeat(129) })).toBe(false);
  });
});
