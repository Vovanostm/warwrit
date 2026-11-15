import { describe, expect, it } from 'vitest';

import { isResolveCompanyNicknameRequest } from './nicknames.js';

describe('nickname resolution request parser', () => {
  const valid = {
    schemaVersion: 1,
    commandId: 'command-1',
    expectedPublicRevision: '4',
    proposalId: 'proposal-1',
    accept: true,
  };

  it('accepts an exact versioned request', () => {
    expect(isResolveCompanyNicknameRequest(valid)).toBe(true);
  });

  it('rejects malformed, stale-shaped, or authority-bearing fields', () => {
    expect(isResolveCompanyNicknameRequest({ ...valid, expectedPublicRevision: '04' })).toBe(false);
    expect(isResolveCompanyNicknameRequest({ ...valid, accept: 'yes' })).toBe(false);
    expect(isResolveCompanyNicknameRequest({ ...valid, companyId: 'company-1' })).toBe(false);
    expect(isResolveCompanyNicknameRequest(null)).toBe(false);
  });
});
