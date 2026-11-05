import { describe, expect, it } from 'vitest';
import {
  clearCompanyRosterAttempt,
  companyRosterAttemptKey,
  createCompanyRosterAttempt,
  postCompanyRosterAttempt,
  readCompanyRosterAttempt,
  saveCompanyRosterAttempt,
  type CompanyRosterStorage,
} from './company-roster-attempt.js';

class MemoryStorage implements CompanyRosterStorage {
  readonly values = new Map<string, string>();
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

const scope = { accountId: 'account-one', companyId: 'company-one' };
const request = {
  schemaVersion: 2 as const,
  commandId: 'hire-command-one',
  expectedPublicRevision: '7',
  type: 'Recruit' as const,
  payload: { offerId: 'offer-one', offerRevision: '1' },
};

function response(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('company roster command attempts', () => {
  it('retries a lost hire after remount with the exact persisted body', async () => {
    const storage = new MemoryStorage();
    const attempt = createCompanyRosterAttempt(scope, request);
    expect(saveCompanyRosterAttempt(storage, attempt)).toBe(true);
    const bodies: string[] = [];
    const lostReply: typeof fetch = async (_input, init) => {
      bodies.push(String(init?.body));
      throw new Error('connection lost after server commit');
    };
    expect(await postCompanyRosterAttempt('/api', attempt, lostReply)).toBe('UNKNOWN');

    const restored = readCompanyRosterAttempt(storage, scope, 'Recruit');
    expect(restored).toBeDefined();
    const retry: typeof fetch = async (_input, init) => {
      bodies.push(String(init?.body));
      return response(200, {
        commandId: request.commandId,
        ok: true,
        publicRevision: '8',
      });
    };
    expect(await postCompanyRosterAttempt('/api', restored!, retry)).toBe('ACCEPTED');
    expect(bodies).toEqual([attempt.body, attempt.body]);
    expect(clearCompanyRosterAttempt(storage, restored!)).toBe(true);
    expect(storage.getItem(companyRosterAttemptKey(scope, 'Recruit'))).toBeNull();
  });

  it('keeps the exact request after 401 and malformed acknowledgements', async () => {
    const storage = new MemoryStorage();
    const attempt = createCompanyRosterAttempt(scope, {
      schemaVersion: 2,
      commandId: 'join-command-one',
      expectedPublicRevision: '9',
      type: 'JoinFieldParty',
      payload: { characterId: 'character-one' },
    });
    expect(saveCompanyRosterAttempt(storage, attempt)).toBe(true);
    const unauthenticated: typeof fetch = async () => response(401, {});
    expect(await postCompanyRosterAttempt('/api', attempt, unauthenticated)).toBe(
      'UNAUTHENTICATED',
    );
    expect(readCompanyRosterAttempt(storage, scope, 'JoinFieldParty')?.body).toBe(attempt.body);
    const malformed: typeof fetch = async () => response(200, { commandId: 'other', ok: true });
    expect(await postCompanyRosterAttempt('/api', attempt, malformed)).toBe('UNKNOWN');
    expect(readCompanyRosterAttempt(storage, scope, 'JoinFieldParty')?.body).toBe(attempt.body);
  });
});
