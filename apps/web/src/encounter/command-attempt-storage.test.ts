import { describe, expect, it } from 'vitest';
import type { EncounterCommandDto } from '@warwrit/protocol';
import {
  clearEncounterCommandAttempt,
  encounterCommandAttemptStorageKey,
  readEncounterCommandAttempt,
  writeEncounterCommandAttempt,
  type EncounterCommandAttemptStorage,
} from './command-attempt-storage.js';

const scope = { accountId: 'account-a', companyId: 'company-a' };
const foreignScope = { accountId: 'account-b', companyId: 'company-a' };
const encounterId = '11111111-1111-4111-8111-111111111111';
const command: EncounterCommandDto = {
  encounterId,
  commandId: 'command-1',
  expectedRevision: 3,
  activationId: 'activation-1',
  actorId: 'fighter-1',
  version: 2,
  intent: { type: 'wait' },
};

class MemoryStorage implements EncounterCommandAttemptStorage {
  readonly values = new Map<string, string>();
  failRead = false;
  failWrite = false;
  getItem(key: string) {
    if (this.failRead) throw new Error('read denied');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('write denied');
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('encounter command attempt storage', () => {
  it('restores the exact committed-or-unknown command by account, company and encounter', () => {
    const storage = new MemoryStorage();
    const attempt = writeEncounterCommandAttempt(storage, scope, command);
    expect(attempt.body).toBe(JSON.stringify(command));
    expect(readEncounterCommandAttempt(storage, scope, encounterId)).toEqual({
      kind: 'FOUND',
      attempt,
    });
    expect(readEncounterCommandAttempt(storage, foreignScope, encounterId)).toEqual({
      kind: 'EMPTY',
    });
    expect(
      readEncounterCommandAttempt(storage, scope, '22222222-2222-4222-8222-222222222222'),
    ).toEqual({ kind: 'EMPTY' });
  });

  it('rejects foreign envelopes, mismatched command encounter IDs and damaged bodies', () => {
    const storage = new MemoryStorage();
    const key = encounterCommandAttemptStorageKey(scope, encounterId);
    storage.values.set(
      key,
      JSON.stringify({
        version: 1,
        accountId: foreignScope.accountId,
        companyId: scope.companyId,
        encounterId,
        body: JSON.stringify(command),
      }),
    );
    expect(readEncounterCommandAttempt(storage, scope, encounterId)).toEqual({ kind: 'INVALID' });
    storage.values.set(
      key,
      JSON.stringify({
        version: 1,
        accountId: scope.accountId,
        companyId: scope.companyId,
        encounterId,
        body: JSON.stringify({ ...command, encounterId: '22222222-2222-4222-8222-222222222222' }),
      }),
    );
    expect(readEncounterCommandAttempt(storage, scope, encounterId)).toEqual({ kind: 'INVALID' });
    storage.values.set(key, '{broken');
    expect(readEncounterCommandAttempt(storage, scope, encounterId)).toEqual({ kind: 'INVALID' });
  });

  it('fails closed when storage cannot be read or written and clears only the exact matching attempt', () => {
    const storage = new MemoryStorage();
    storage.failRead = true;
    expect(readEncounterCommandAttempt(storage, scope, encounterId)).toEqual({
      kind: 'UNAVAILABLE',
    });
    storage.failRead = false;
    storage.failWrite = true;
    expect(() => writeEncounterCommandAttempt(storage, scope, command)).toThrow();
    storage.failWrite = false;
    const attempt = writeEncounterCommandAttempt(storage, scope, command);
    const replacement = writeEncounterCommandAttempt(storage, scope, {
      ...command,
      commandId: 'command-2',
    });
    expect(clearEncounterCommandAttempt(storage, attempt)).toBe(false);
    expect(clearEncounterCommandAttempt(storage, replacement)).toBe(true);
  });
});
