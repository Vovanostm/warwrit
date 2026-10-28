import { describe, expect, it } from 'vitest';
import { isPayrollPayload } from './payroll-intent.js';

describe('PayClaims V2 intent', () => {
  it('accepts exact DEFAULT and TARGETED payloads', () => {
    expect(
      isPayrollPayload({ poolId: 'local', amountQ: '19', claimIds: [], mode: 'DEFAULT' }),
    ).toBe(true);
    expect(
      isPayrollPayload({
        poolId: 'local',
        amountQ: '19',
        claimIds: ['claim-1'],
        mode: 'TARGETED',
        payeeId: 'worker-1',
      }),
    ).toBe(true);
    expect(
      isPayrollPayload({
        poolId: 'local',
        amountQ: '19',
        claimIds: [],
        mode: 'TARGETED',
        payeeId: 'worker-1',
      }),
    ).toBe(true);
  });

  it('rejects zero, extra fields, duplicate claim IDs, and mismatched mode fields', () => {
    const base = { poolId: 'local', amountQ: '19', claimIds: [], mode: 'DEFAULT' };
    expect(isPayrollPayload({ ...base, amountQ: '0' })).toBe(false);
    expect(isPayrollPayload({ ...base, unexpected: true })).toBe(false);
    expect(isPayrollPayload({ ...base, claimIds: ['claim-1', 'claim-1'] })).toBe(false);
    expect(isPayrollPayload({ ...base, payeeId: 'worker-1' })).toBe(false);
    expect(isPayrollPayload({ ...base, mode: 'TARGETED' })).toBe(false);
  });
});
