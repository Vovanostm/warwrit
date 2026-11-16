import { describe, expect, it } from 'vitest';
import { classifyPayrollResponse, readPayrollAttempt } from './payroll-attempt.js';

const attempt = {
  schemaVersion: 2,
  commandId: '11111111-1111-4111-8111-111111111111',
  expectedPublicRevision: '7',
  type: 'PayClaims',
  payload: { poolId: 'local', amountQ: '19', claimIds: [], mode: 'DEFAULT' },
} as const;

describe('payroll attempts', () => {
  it('restores only the exact company scoped request', () => {
    const stored = JSON.stringify({
      accountId: 'account-a',
      companyId: 'company-a',
      request: attempt,
    });
    expect(readPayrollAttempt(stored, 'account-a', 'company-a')).toEqual(attempt);
    expect(readPayrollAttempt(stored, 'account-a', 'company-b')).toBeUndefined();
    expect(readPayrollAttempt(stored, 'account-b', 'company-a')).toBeUndefined();
    expect(readPayrollAttempt('{broken', 'account-a', 'company-a')).toBeUndefined();
    expect(
      readPayrollAttempt(
        JSON.stringify({
          accountId: 'account-a',
          companyId: 'company-a',
          request: { ...attempt, payload: { ...attempt.payload, amountQ: '0' } },
        }),
        'account-a',
        'company-a',
      ),
    ).toBeUndefined();
  });

  it('retains unknown and mismatched results but accepts only a matching terminal response', () => {
    expect(classifyPayrollResponse(502, {}, attempt.commandId)).toEqual({ kind: 'UNKNOWN' });
    expect(
      classifyPayrollResponse(
        200,
        { commandId: 'another', ok: true, publicRevision: '8' },
        attempt.commandId,
      ),
    ).toEqual({ kind: 'UNKNOWN' });
    expect(
      classifyPayrollResponse(
        200,
        { commandId: attempt.commandId, ok: true, publicRevision: '8' },
        attempt.commandId,
      ),
    ).toEqual({ kind: 'ACCEPTED' });
    expect(
      classifyPayrollResponse(
        409,
        {
          commandId: attempt.commandId,
          ok: false,
          publicRevision: '8',
          code: 'STALE_REVISION',
        },
        attempt.commandId,
      ),
    ).toEqual({ kind: 'REJECTED', code: 'STALE_REVISION' });
    expect(classifyPayrollResponse(401, {}, attempt.commandId)).toEqual({
      kind: 'UNAUTHENTICATED',
    });
  });
});
