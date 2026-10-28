import { describe, expect, it } from 'vitest';
import { parsePayrollReadback } from './payroll-readback.js';

const value = {
  company: { companyId: 'company-a', revision: '8' },
  holdings: {
    payroll: {
      atTick: '2000',
      publicRevision: '8',
      pools: [
        {
          poolId: 'local',
          walletId: 'purse',
          location: { kind: 'AT', siteId: 'village', areaId: 'square' },
          cashQ: '20',
          reservedQ: '0',
          spendableQ: '20',
        },
      ],
      services: [],
      claims: [
        {
          claimId: 'claim-a',
          membershipId: 'worker-a',
          poolId: 'local',
          payee: { kind: 'CHARACTER', id: 'worker-a' },
          dueAt: '2000',
          estimatedQ: '20',
          cashPaidQ: '0',
          currentMaintenanceQ: '0',
          pendingQ: '0',
          unsecuredQ: '20',
        },
      ],
      owedQ: '20',
      dueQ: '20',
      payableQ: '20',
      duePayableQ: '20',
    },
  },
};

describe('payroll readback', () => {
  it('keeps only a well-formed payroll projection for the requested company', () => {
    expect(parsePayrollReadback(value, 'company-a')).toEqual({
      revision: '8',
      payroll: value.holdings.payroll,
    });
    expect(parsePayrollReadback(value, 'company-b')).toBeUndefined();
    expect(
      parsePayrollReadback(
        {
          ...value,
          company: { ...value.company, revision: '-1' },
        },
        'company-a',
      ),
    ).toBeUndefined();
    expect(parsePayrollReadback({ ...value, holdings: null }, 'company-a')).toBeUndefined();
  });
});
