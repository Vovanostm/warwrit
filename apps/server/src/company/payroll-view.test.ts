import { describe, expect, it } from 'vitest';

import {
  campaignTick,
  createCombatEncounterApplication,
  createCompanyLearningState,
  moneyQ,
  createSocialState,
  canonicalRevision,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState } from '@warwrit/game-core';
import type { CompanyReadResponseDto } from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { projectCompanyHoldings } from './holdings.js';
import { projectPayroll } from './payroll-view.js';

function stateWithClaims() {
  const root = createCompanyCombatAggregateFixture().f.root;
  const claims = [
    {
      claimId: 'claim-0',
      membershipId: 'service-worker-0',
      poolId: 'local',
      rateVersion: 'rate-worker-0',
      dueAt: campaignTick('999'),
      fromTick: campaignTick('998'),
      toTick: campaignTick('999'),
      dailyWageMilli: '1',
      maintenanceId: null,
      earned: [
        {
          fromTick: campaignTick('998'),
          toTick: campaignTick('999'),
          dailyWageMilli: '9007199254740993',
          maintenanceId: null,
        },
      ],
      paidQ: moneyQ('5'),
      reportedQ: moneyQ('9007199254740993'),
      reportedCoveredQ: moneyQ('3'),
    },
    {
      claimId: 'claim-1',
      membershipId: 'service-worker-1',
      poolId: 'local',
      rateVersion: 'rate-worker-1',
      dueAt: campaignTick('2000'),
      fromTick: campaignTick('1999'),
      toTick: campaignTick('2000'),
      dailyWageMilli: '1',
      maintenanceId: null,
      earned: [
        {
          fromTick: campaignTick('1999'),
          toTick: campaignTick('2000'),
          dailyWageMilli: '1',
          maintenanceId: null,
        },
      ],
      paidQ: moneyQ('0'),
      reportedQ: moneyQ('1'),
      reportedCoveredQ: moneyQ('0'),
    },
    {
      claimId: 'claim-2',
      membershipId: 'service-worker-1',
      poolId: 'local',
      rateVersion: 'rate-worker-1',
      dueAt: campaignTick('900'),
      fromTick: campaignTick('899'),
      toTick: campaignTick('900'),
      dailyWageMilli: '1',
      maintenanceId: null,
      earned: [
        {
          fromTick: campaignTick('899'),
          toTick: campaignTick('900'),
          dailyWageMilli: '4',
          maintenanceId: null,
        },
      ],
      paidQ: moneyQ('4'),
      reportedQ: moneyQ('4'),
      reportedCoveredQ: moneyQ('0'),
    },
  ] satisfies typeof root.finance.claims;
  let economy = {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      characters: root.lifecycle.characters.map((person) =>
        person.identity.characterId === 'a-worker-0'
          ? {
              ...person,
              presence: { ...person.presence, assignment: 'NONE' as const, fieldPartyId: null },
            }
          : person,
      ),
      memberships: root.lifecycle.memberships.map((membership) =>
        membership.membershipId === 'service-worker-0'
          ? { ...membership, endedAt: campaignTick('999') }
          : membership,
      ),
    },
  };
  economy = {
    ...economy,
    finance: {
      ...economy.finance,
      claims,
      reservations: [
        {
          reservationId: 'pending-claim-0',
          walletId: 'purse',
          claimId: 'claim-0',
          amountQ: moneyQ('7'),
          purpose: 'PENDING_CONFIRMATION',
        },
      ],
    },
  };
  const aggregate: CompanyCombatAggregateState = {
    economy,
    learning: createCompanyLearningState(),
    social: createSocialState(),
    encounter: createCombatEncounterApplication(),
  };
  return aggregate;
}

describe('payroll projection', () => {
  it('uses the safe observation for exact totals and retained known claim history', () => {
    const state = stateWithClaims();
    const before = structuredClone(state);
    const payroll = projectPayroll(state.economy, 'a-company');

    expect(payroll).toEqual({
      atTick: '1000',
      publicRevision: '0',
      owedQ: '9007199254740986',
      dueQ: '9007199254740985',
      payableQ: '9007199254740979',
      duePayableQ: '9007199254740978',
      pools: [
        {
          poolId: 'local',
          walletId: 'purse',
          location: { kind: 'AT', siteId: 'village', areaId: 'square' },
          cashQ: '100',
          reservedQ: '7',
          spendableQ: '93',
        },
      ],
      services: [
        {
          membershipId: 'service-leader',
          poolId: 'local',
          currentAgreedRateMilli: '0',
          materialSupportOnly: true,
        },
        {
          membershipId: 'service-worker-0',
          poolId: 'local',
          currentAgreedRateMilli: '1',
          materialSupportOnly: false,
        },
        {
          membershipId: 'service-worker-1',
          poolId: 'local',
          currentAgreedRateMilli: '1',
          materialSupportOnly: false,
        },
      ],
      claims: [
        {
          claimId: 'claim-0',
          membershipId: 'service-worker-0',
          payee: { kind: 'CHARACTER', id: 'a-worker-0' },
          dueAt: '999',
          estimatedQ: '9007199254740993',
          poolId: 'local',
          cashPaidQ: '5',
          currentMaintenanceQ: '3',
          pendingQ: '7',
          unsecuredQ: '9007199254740978',
        },
        {
          claimId: 'claim-1',
          membershipId: 'service-worker-1',
          poolId: 'local',
          payee: { kind: 'CHARACTER', id: 'a-worker-1' },
          dueAt: '2000',
          estimatedQ: '1',
          cashPaidQ: '0',
          currentMaintenanceQ: '0',
          pendingQ: '0',
          unsecuredQ: '1',
        },
        {
          claimId: 'claim-2',
          membershipId: 'service-worker-1',
          poolId: 'local',
          payee: { kind: 'CHARACTER', id: 'a-worker-1' },
          dueAt: '900',
          estimatedQ: '4',
          cashPaidQ: '4',
          currentMaintenanceQ: '0',
          pendingQ: '0',
          unsecuredQ: '0',
        },
      ],
    });
    expect(JSON.stringify(state)).toBe(JSON.stringify(before));
    const reloaded = readCompanyCombatAggregateState(JSON.parse(JSON.stringify(state)));
    expect(projectPayroll(reloaded.economy, 'a-company')).toEqual(payroll);
    expect(projectPayroll(state.economy, 'a-company')).toEqual(payroll);
  });

  it('attaches safe payroll totals to holdings and leaves historical responses compatible', () => {
    const state = stateWithClaims();
    const holdings = projectCompanyHoldings(state, 'a-company', ['a-leader']);
    const oldResponse: CompanyReadResponseDto = {
      schemaVersion: 1,
      company: null,
      holdings: {
        cashQ: '0',
        wallets: [],
        items: [],
        people: [],
        fieldCamp: false,
        wagesOwedQ: '5',
        wagesDueQ: '5',
      },
    };

    expect(holdings).toMatchObject({
      wagesOwedQ: '9007199254740986',
      wagesDueQ: '9007199254740985',
      payroll: { owedQ: '9007199254740986', dueQ: '9007199254740985' },
    });
    expect(oldResponse.holdings?.payroll).toBeUndefined();
  });

  it('uses the finance observation tick and excludes claims from unknown service accounts', () => {
    const state = stateWithClaims();
    const changed = {
      ...state,
      economy: {
        ...state.economy,
        lifecycle: { ...state.economy.lifecycle, campaignTick: campaignTick('3000') },
        finance: {
          ...state.economy.finance,
          accounts: state.economy.finance.accounts.map((account) =>
            account.membershipId === 'service-worker-1' ? { ...account, known: false } : account,
          ),
        },
      },
    };
    const { payroll, wagesOwedQ, wagesDueQ } = projectCompanyHoldings(changed, 'a-company', [
      'a-leader',
    ]);
    expect({ payroll, wagesOwedQ, wagesDueQ }).toMatchObject({
      wagesOwedQ: '9007199254740985',
      wagesDueQ: '9007199254740985',
      payroll: { atTick: '1000', claims: [{ claimId: 'claim-0' }] },
    });
    expect(
      projectPayroll({ ...state.economy, lifecycle: changed.economy.lifecycle }, 'a-company')?.dueQ,
    ).toBe('9007199254740985');
  });

  it('does not reveal private accruals or canonical revision through the payroll view', () => {
    const original = stateWithClaims();
    const altered = {
      ...original,
      economy: {
        ...original.economy,
        lifecycle: {
          ...original.economy.lifecycle,
          revision: canonicalRevision('900'),
        },
        finance: {
          ...original.economy.finance,
          claims: original.economy.finance.claims.map((claim) => ({
            ...claim,
            earned: claim.earned.map((period) => ({
              ...period,
              dailyWageMilli: String(BigInt(period.dailyWageMilli) + 1n),
            })),
          })),
          accounts: original.economy.finance.accounts.map((account) => ({
            ...account,
            death: account.knownDeath
              ? account.death
              : {
                  sourceId: 'hidden-death',
                  atTick: campaignTick('999'),
                  recipient: { kind: 'ESTATE' as const, id: 'hidden-estate' },
                },
          })),
        },
      },
    };

    expect(projectPayroll(original.economy, 'a-company')).toEqual(
      projectPayroll(
        readCompanyCombatAggregateState(JSON.parse(JSON.stringify(altered))).economy,
        'a-company',
      ),
    );
    expect(projectCompanyHoldings(original, 'a-company', ['a-leader'])).toMatchObject({
      wagesOwedQ: '9007199254740986',
      wagesDueQ: '9007199254740985',
    });
    expect(projectCompanyHoldings(altered, 'a-company', ['a-leader'])).toMatchObject({
      wagesOwedQ: '9007199254740986',
      wagesDueQ: '9007199254740985',
    });
    expect(projectPayroll(original.economy, 'unknown-company')).toBeNull();
  });
});
