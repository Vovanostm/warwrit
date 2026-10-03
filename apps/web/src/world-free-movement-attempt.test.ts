import { describe, expect, it } from 'vitest';
import {
  classifyFreeMovementPost,
  createFreeMovementAttempt,
  readFreeMovementAttempt,
  saveFreeMovementAttempt,
  type FreeMovementStorage,
} from './world-free-movement-attempt.js';

class MemoryStorage implements FreeMovementStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const current = {
  schemaVersion: 1 as const,
  worldTick: '20',
  publicRevision: '7',
  party: { partyId: 'party', routeEpoch: '3', position: { kind: 'TERRAIN' as const, q: 0, r: 0 } },
  movement: null,
};

describe('free movement command attempts', () => {
  it('persists the same revision-bound body for a safe exact retry and isolates company scope', () => {
    const scope = { accountId: 'account-a', companyId: 'company-a' };
    const attempt = createFreeMovementAttempt({
      scope,
      current,
      commandId: 'movement-1',
      action: { kind: 'START', destination: { q: 2, r: 1 } },
    });
    const storage = new MemoryStorage();
    saveFreeMovementAttempt(storage, attempt);

    expect(readFreeMovementAttempt(storage, scope)).toEqual(attempt);
    expect(
      readFreeMovementAttempt(storage, { accountId: 'account-b', companyId: 'company-a' }),
    ).toBeUndefined();
  });

  it('accepts only a response bound to the exact command id', () => {
    const accepted = {
      schemaVersion: 1,
      commandId: 'movement-1',
      worldTick: '20',
      publicRevision: '8',
      party: current.party,
      movement: null,
    };
    expect(classifyFreeMovementPost(200, accepted, 'movement-1').kind).toBe('ACCEPTED');
    expect(classifyFreeMovementPost(200, accepted, 'movement-2')).toEqual({ kind: 'UNKNOWN' });
  });
});
