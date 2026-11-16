import { describe, expect, it } from 'vitest';
import type { OrdinaryContractCommandDto } from '@warwrit/protocol';
import {
  clearOrdinaryContractAttempt,
  ordinaryContractAttemptStorageKey,
  readOrdinaryContractAttempt,
  writeOrdinaryContractAttempt,
  type OrdinaryContractAttemptStorage,
} from './ordinary-contract-attempt-storage.js';

const scope = { accountId: 'account-a', companyId: 'company-a' };
const otherScope = { accountId: 'account-b', companyId: 'company-a' };
const command: OrdinaryContractCommandDto = {
  schemaVersion: 1,
  commandId: '11111111-1111-4111-8111-111111111111',
  instanceId: 'ci.m1.road-tracks.01',
  expectedRevision: '7',
  type: 'STEP',
  stepId: 'inspect-bank',
};

class MemoryStorage implements OrdinaryContractAttemptStorage {
  readonly values = new Map<string, string>();
  failRead = false;
  failWrite = false;
  failRemove = false;
  getItem(key: string) {
    if (this.failRead) throw new Error('read denied');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('write denied');
    this.values.set(key, value);
  }
  removeItem(key: string) {
    if (this.failRemove) throw new Error('remove denied');
    this.values.delete(key);
  }
}

describe('ordinary contract attempt storage', () => {
  it('persists the exact command before it can be sent and restores it after reload', () => {
    const storage = new MemoryStorage();
    const attempt = writeOrdinaryContractAttempt(storage, scope, command);
    expect(attempt.body).toBe(JSON.stringify(command));
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({ kind: 'FOUND', attempt });
    expect(readOrdinaryContractAttempt(storage, otherScope)).toEqual({ kind: 'EMPTY' });
  });

  it('rejects foreign-scope and malformed records and does not clear a different command body', () => {
    const storage = new MemoryStorage();
    const key = ordinaryContractAttemptStorageKey(scope);
    const originalAttempt = writeOrdinaryContractAttempt(storage, scope, command);
    storage.values.set(
      key,
      JSON.stringify({
        version: 1,
        accountId: otherScope.accountId,
        companyId: scope.companyId,
        body: JSON.stringify(command),
      }),
    );
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({ kind: 'INVALID' });
    storage.values.set(
      key,
      JSON.stringify({
        version: 1,
        accountId: scope.accountId,
        companyId: scope.companyId,
        body: JSON.stringify({ ...command, commandId: '22222222-2222-4222-8222-222222222222' }),
      }),
    );
    expect(clearOrdinaryContractAttempt(storage, originalAttempt)).toBe(false);
    storage.values.set(key, '{broken');
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({ kind: 'INVALID' });
  });

  it('fails closed on unavailable storage and clears only the matching exact attempt', () => {
    const storage = new MemoryStorage();
    storage.failRead = true;
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({ kind: 'UNAVAILABLE' });
    storage.failRead = false;
    const attempt = writeOrdinaryContractAttempt(storage, scope, command);
    const replacement = writeOrdinaryContractAttempt(storage, scope, {
      ...command,
      commandId: '22222222-2222-4222-8222-222222222222',
    });
    expect(clearOrdinaryContractAttempt(storage, attempt)).toBe(false);
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({
      kind: 'FOUND',
      attempt: replacement,
    });
    expect(clearOrdinaryContractAttempt(storage, replacement)).toBe(true);
    expect(readOrdinaryContractAttempt(storage, scope)).toEqual({ kind: 'EMPTY' });
  });
});
