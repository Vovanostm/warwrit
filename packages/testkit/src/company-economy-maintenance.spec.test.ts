import { describe, expect, it } from 'vitest';
import { entityId, prepareCompanyEconomy, projectCompanyEconomy } from '@warwrit/game-core';
import type { CompanyEconomyState, FinanceEvidence } from '@warwrit/game-core';
import {
  access,
  advance,
  claims,
  pay,
  command,
  context,
  economy,
  observation,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';

function offer(state: CompanyEconomyState): FinanceEvidence {
  return {
    ...scope(state, 'standing-service-offer'),
    kind: 'SAFE_SERVICE_OFFER',
    partyId: 'party',
    location: place,
    providerId: 'provider',
    offerRevision: state.lifecycle.knowledge.revision,
    termsVersion: 'terms-v1',
    expiresAt: tick(BigInt(state.finance.processedTick) + 1000n),
    permittedBeneficiaryIds: state.lifecycle.characters
      .filter((p) => p.presence.fieldPartyId === 'party')
      .map((p) => p.identity.characterId),
    safe: true,
    inhabited: true,
    accessible: true,
  };
}
function admit(state: CompanyEconomyState) {
  const cmd = command(state, 'AcceptSafeService', {
    partyId: 'party',
    offerId: 'standing-service-offer',
    beneficiaryIds: state.lifecycle.characters
      .filter((p) => p.presence.fieldPartyId === 'party')
      .map((p) => p.identity.characterId),
    fundingPoolId: 'local',
    quoteRevision: state.lifecycle.knowledge.revision,
  });
  return prepareCompanyEconomy(state, cmd, context(state, cmd, [access(state), offer(state)]));
}
function unable(state: CompanyEconomyState): CompanyEconomyState {
  // An input snapshot supplied by the future condition producer, not a fabricated condition handler.
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      characters: state.lifecycle.characters.map((p) =>
        p.presence.fieldPartyId ? { ...p, conditionIds: ['critical-bleed'] } : p,
      ),
    },
  };
}
describe('WP02.3 — physical maintenance intervals', () => {
  it('P6: F1 reserves pre-entry earnings, covers only named current intervals and creates no cash or practice', () => {
    let state = advance(economy([1n], 10000n, 0), 500).next;
    state = observation(state, 'worker-0').result.next;
    state = observation(state, 'leader').result.next;
    const accepted = prepared(admit(state));
    expect(accepted.next.finance.reservations).toContainEqual(
      expect.objectContaining({ amountQ: '500', purpose: 'PRE_ENTRY' }),
    );
    const one = advance(accepted.next, 1500).next;
    const fragments = advance(advance(accepted.next, 777).next, 1500).next;
    expect(one.finance.claims).toEqual(fragments.finance.claims);
    expect(one.finance.maintenanceReceipts).toEqual(fragments.finance.maintenanceReceipts);
    expect(one.finance.claims.reduce((s, c) => s + BigInt(c.reportedCoveredQ), 0n)).toBe(1000n);
    expect(
      one.finance.claims.reduce((s, c) => s + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ), 0n),
    ).toBe(500n);
    expect(one.finance.wallets).toEqual(state.finance.wallets);
    expect(one.lifecycle.characters.map((p) => p.skills)).toEqual(
      state.lifecycle.characters.map((p) => p.skills),
    );
    expect(
      one.finance.maintenanceReceipts.every((r) => r.fromTick === '500' && r.toTick === '1500'),
    ).toBe(true);
    expect(one.finance.maintenanceReceipts.map((r) => r.beneficiaryId).sort()).toEqual([
      'leader',
      'worker-0',
    ]);
    const overdue = advance(economy([1n], 10000n, 0), 1000).next;
    const informed = observation(observation(overdue, 'worker-0').result.next, 'leader').result
      .next;
    expect(admit(informed)).toMatchObject({ kind: 'REJECTED', error: 'UNPAID_OBLIGATIONS' });
  });
  it('P6: already accepted temporary incapacity keeps support; incapable newcomers cannot obtain a standing offer', () => {
    const fresh = economy([1n], 10000n);
    expect(admit(unable(fresh))).toMatchObject({
      kind: 'REJECTED',
      error: 'INCOMPATIBLE_ACTIVITY',
    });
    const accepted = prepared(admit(fresh)).next;
    const resting = advance(unable(accepted), 2000).next;
    expect(
      resting.finance.claims.reduce(
        (s, c) => s + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ),
        0n,
      ),
    ).toBe(0n);
    expect(resting.finance.maintenance[0]?.endedAt).toBeNull();
    expect(
      resting.lifecycle.characters
        .filter((p) => p.presence.fieldPartyId)
        .every((p) => p.conditionIds.includes('critical-bleed')),
    ).toBe(true); // F1 is not healing.
  });
  it('P6: field camp covers food, not pay; source-verified interruption stops coverage at the causal boundary', () => {
    const fresh = economy([2n], 10000n, 0);
    const camp = command(fresh, 'BeginFieldCamp', {
      partyId: 'party',
      siteEligibilityId: 'camp-site',
    });
    const site: FinanceEvidence = {
      ...scope(fresh, 'camp-site'),
      kind: 'CAMP_SITE',
      partyId: 'party',
      location: place,
      stationary: true,
      conflict: false,
    };
    const begun = prepared(prepareCompanyEconomy(fresh, camp, context(fresh, camp, [site]))).next;
    const boundary: FinanceEvidence = {
      ...scope(begun, 'encounter', tick(500)),
      kind: 'MAINTENANCE_BOUNDARY',
      agreementId: begun.finance.maintenance[0]!.agreementId,
      reason: 'ENCOUNTER',
    };
    const ended = advance(begun, 1000, [boundary]);
    expect(
      ended.next.finance.claims.reduce(
        (s, c) => s + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ),
        0n,
      ),
    ).toBe(2000n);
    expect(
      ended.next.finance.maintenanceReceipts.every(
        (r) => r.fromTick === '0' && r.toTick === '500' && r.fulfillment === 'CURRENT_FOOD',
      ),
    ).toBe(true);
    expect(ended.receipt.requirements.filter((r) => r.kind === 'FOOD_CONSUMPTION')).toHaveLength(2);
    expect(projectCompanyEconomy(ended.next, 'company')?.finance.maintenance[0]?.endedAt).toBe(
      '500',
    );
    expect(ended.next.lifecycle.characters).toEqual(fresh.lifecycle.characters); // No movement/combat/XP producer is smuggled in.
  });

  it('P6/P3: detaching a paid companion ends only that interval; the accepted remainder keeps F1 until its leader leaves', () => {
    let state = prepared(admit(economy([1n, 2n], 10000n, 0))).next;
    state = advance(state, 500).next;
    function detach(characterId: string) {
      const cmd = command(state, 'SetAssignment', {
        characterId,
        assignment: 'GARRISON',
        locationId: 'village',
        dutyEvidenceId: `duty-${characterId}`,
        fundingPoolId: 'local',
      });
      const result = prepared(
        prepareCompanyEconomy(
          state,
          cmd,
          context(
            state,
            cmd,
            [],
            [
              {
                ...scope(state, `duty-${characterId}`),
                kind: 'DUTY',
                characterId,
                assignment: 'GARRISON',
                location: place,
                fundingPoolId: 'local',
                handoverToId: 'provider',
                partyId: null,
              },
            ],
          ),
        ),
      );
      expect(result.receipt.requirements).toContainEqual(
        expect.objectContaining({ kind: 'CARE_HANDOVER', characterId }),
      );
      state = result.next;
    }
    detach('worker-0');
    state = advance(state, 1000).next;
    expect(
      state.finance.claims
        .filter((c) => c.membershipId === 'service-worker-0')
        .reduce((n, c) => n + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ), 0n),
    ).toBe(500n);
    expect(
      state.finance.claims
        .filter((c) => c.membershipId === 'service-worker-1')
        .reduce((n, c) => n + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ), 0n),
    ).toBe(0n);
    expect(state.finance.maintenance[0]?.endedAt).toBeNull();
    detach('leader');
    state = advance(state, 1500).next;
    expect(
      state.finance.claims
        .filter((c) => c.membershipId === 'service-worker-1')
        .reduce((n, c) => n + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ), 0n),
    ).toBe(1000n);
    expect(state.finance.maintenance[0]?.endedAt).toBe('1000');
  });

  it('P6: F1 admission needs local-duty capacity, not merely the ability to forage', () => {
    const fresh = economy([1n], 10000n);
    const wounded = (s: CompanyEconomyState): CompanyEconomyState => ({
      ...s,
      lifecycle: {
        ...s.lifecycle,
        characters: s.lifecycle.characters.map((p) =>
          p.presence.fieldPartyId ? { ...p, conditionIds: ['severe-stable-wound'] } : p,
        ),
      },
    });
    const newcomers = wounded(fresh);
    const refused = admit(newcomers);
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'INCOMPATIBLE_ACTIVITY' });
    expect(refused.state).toBe(newcomers);
    // Previously admitted beneficiaries keep ordinary support; this is not a recurring fitness test.
    const resting = advance(wounded(prepared(admit(fresh)).next), 1500).next;
    expect(resting.finance.claims.every((c) => c.reportedQ === c.reportedCoveredQ)).toBe(true);
  });

  it('P4/P6: rehire cannot hide a beneficiary’s previous earned debt from F1 admission', () => {
    const start = claims(economy([1n], 10000n), [13n]);
    const member = start.lifecycle.memberships[1]!;
    const account = start.finance.accounts[1]!;
    // A reloaded service history: physical departure belongs to 02.4, not a test double here.
    const state: CompanyEconomyState = {
      ...start,
      lifecycle: {
        ...start.lifecycle,
        memberships: [
          start.lifecycle.memberships[0]!,
          { ...member, startedAt: tick(1000) },
          {
            ...member,
            membershipId: entityId<'Membership'>('previous-service'),
            wageScheduleId: entityId<'WageSchedule'>('previous-terms'),
            endedAt: tick(1000),
          },
        ],
      },
      finance: {
        ...start.finance,
        accounts: [
          ...start.finance.accounts,
          {
            ...account,
            membershipId: entityId<'Membership'>('previous-service'),
            schedule: { ...account.schedule!, scheduleId: 'previous-terms' },
          },
        ],
        claims: start.finance.claims.map((c) => ({
          ...c,
          membershipId: entityId<'Membership'>('previous-service'),
        })),
      },
    };
    const refused = admit(state);
    expect(refused).toMatchObject({ kind: 'REJECTED', error: 'UNPAID_OBLIGATIONS' });
    expect(refused.state).toBe(state);
    const settled = pay(state, 13n, 'TARGETED', 'worker-0').next;
    expect(admit(settled).kind).toBe('PREPARED');
    expect(settled.finance.claims[0]?.paidQ).toBe('13');
  });
});
