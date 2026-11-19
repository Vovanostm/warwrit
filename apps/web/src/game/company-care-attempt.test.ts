import { describe, expect, it } from 'vitest';
import { classifyCompanyCarePost, readCompanyCareAttempt } from './company-care-attempt.js';

const request = {
  schemaVersion: 2 as const,
  commandId: 'care-command',
  expectedPublicRevision: '7',
  type: 'ApplyCare' as const,
  payload: {
    characterId: 'patient',
    conditionId: 'wound-instance',
    providerId: 'doctor',
    resourceItemId: 'medical-unit',
  },
};

describe('company care command retry', () => {
  it('restores the exact pending request for the same account and company', () => {
    const raw = JSON.stringify({ accountId: 'account', companyId: 'company', request });
    expect(readCompanyCareAttempt(raw, 'account', 'company')).toEqual(request);
    expect(readCompanyCareAttempt(raw, 'other-account', 'company')).toBeUndefined();
    expect(readCompanyCareAttempt(raw, 'account', 'other-company')).toBeUndefined();
  });

  it('keeps mismatched and incomplete responses unknown until a terminal receipt arrives', () => {
    expect(
      classifyCompanyCarePost(
        200,
        { commandId: 'other', ok: true, publicRevision: '8' },
        request.commandId,
      ),
    ).toBe('UNKNOWN');
    expect(
      classifyCompanyCarePost(
        200,
        { commandId: request.commandId, ok: true, publicRevision: '8' },
        request.commandId,
      ),
    ).toBe('ACCEPTED');
    expect(
      classifyCompanyCarePost(
        409,
        { commandId: request.commandId, ok: false, publicRevision: '7', code: 'STALE_REVISION' },
        request.commandId,
      ),
    ).toBe('REJECTED');
  });
});
