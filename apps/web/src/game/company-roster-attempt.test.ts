import { describe, expect, it } from 'vitest';
import {
  clearCompanyRosterAttempt,
  companyRosterAttemptKey,
  createCompanyRosterAttempt,
  postCompanyRosterAttempt,
  persistCompanyRosterAttempt,
  matchesCompanyRosterScope,
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

it('never replaces or clears another pending command and isolates company scope', () => {
  const storage = new MemoryStorage();
  const original = createCompanyRosterAttempt(scope, request);
  expect(saveCompanyRosterAttempt(storage, original)).toBe(true);
  const different = createCompanyRosterAttempt(scope, {
    ...request,
    commandId: 'different-command',
  });
  expect(clearCompanyRosterAttempt(storage, different)).toBe(false);
  const retained = persistCompanyRosterAttempt(storage, scope, different.request);
  expect(retained.kind).toBe('EXISTING');
  expect(readCompanyRosterAttempt(storage, scope, 'Recruit')?.body).toBe(original.body);
  const otherCompany = { ...scope, companyId: 'company-two' };
  expect(readCompanyRosterAttempt(storage, otherCompany, 'Recruit')).toBeUndefined();
  expect(matchesCompanyRosterScope(undefined, scope)).toBe(false);
  expect(matchesCompanyRosterScope(otherCompany, scope)).toBe(false);
  expect(matchesCompanyRosterScope(scope, scope)).toBe(true);
  storage.setItem(companyRosterAttemptKey(scope, 'Recruit'), 'damaged-request');
  expect(persistCompanyRosterAttempt(storage, scope, different.request).kind).toBe('OCCUPIED');
  expect(storage.getItem(companyRosterAttemptKey(scope, 'Recruit'))).toBe('damaged-request');
});
