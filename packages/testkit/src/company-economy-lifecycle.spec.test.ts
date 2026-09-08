import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  COMPANY_RULES,
  createCompanyEconomyState,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  prepareCompanyLifecycle,
  quoteCompanyFarewell,
  publicRevision,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  FinanceEvidence,
  OpeningEvidence,
  ServiceTermsEvidence,
} from '@warwrit/game-core';
import {
  access,
  advance,
  cash,
  claims,
  command,
  context,
  economy,
  observation,
  pay,
  person,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';

function terms(state: CompanyEconomyState, id: string, wage = '1'): ServiceTermsEvidence {
  return {
    ...scope(state, `terms-${id}`),
    kind: 'SERVICE_TERMS',
    characterId: id,
    poolId: 'local',
    recipient: { kind: 'CHARACTER', id },
    signingWalletId: `wallet-${id}`,
    rates: COMPANY_RULES.economy.qualificationBands.map((b) => ({
      minimumLevel: b.level,
      dailyWageMilli: String(BigInt(wage) * BigInt(b.multiplierBps)),
    })),
  };
}
describe('WP02.3 — real lifecycle requirements, debt and parting', () => {
  it('P1/P8: opening consumes actual assets atomically, retaining only nonfinancial requirements', () => {
    const old = economy();
    const lifecycle = {
      ...old.lifecycle,
      company: null,
      characters: [person('contact', false), person('provider', false)],
      memberships: [],
      parties: [],
      knowledge: {
        ...old.lifecycle.knowledge,
        leaderId: null,
        runStatus: 'UNKNOWN' as const,
        characters: [],
      },
    };
    const state = createCompanyEconomyState(
      lifecycle,
      [
        {
          walletId: 'purse',
          owner: { kind: 'COMPANY', id: 'company' },
          location: place,
          cashQ: cash(0),
        },
        ...['leader', 'front'].map((id) => ({
          walletId: `wallet-${id}`,
          owner: { kind: 'CHARACTER' as const, id },
          location: place,
          cashQ: cash(0),
        })),
      ],
      [{ poolId: 'local', walletId: 'purse' }],
    );
    const fact: OpeningEvidence = {
      ...scope(state, 'opening'),
      kind: 'OPENING',
      profileId: 'm1-company-start',
      originId: 'broken-company',
      familyStoryId: 'adult-sibling-home',
      cultureId: 'north',
      location: place,
      birthplaceIds: ['village'],
      leaderId: 'leader',
      partyId: 'party',
      seed: 23,
      candidates: [
        { characterId: 'front', templateId: 'front', name: 'Front', sex: 'male' },
        { characterId: 'reach', templateId: 'reach', name: 'Reach', sex: 'female' },
        { characterId: 'support', templateId: 'support', name: 'Support', sex: 'male' },
      ],
      relatives: [{ characterId: 'sibling', name: 'Sibling', sex: 'female' }],
      contactId: 'contact',
      providerId: 'provider',
    };
    const { characterId: _id, ...leaderInput } = person('leader').identity;
    const cmd = command(state, 'CreateCompany', {
      companyId: 'company',
      worldId: 'world',
      originId: fact.originId,
      cultureId: fact.cultureId,
      homelandId: place.siteId,
      familyStoryId: fact.familyStoryId,
      leaderInput,
      candidateSetId: fact.id,
      selectedCandidateIds: ['front'],
      name: 'Company',
      bannerId: 'banner',
    });
    const financeFacts: FinanceEvidence[] = [
      {
        ...scope(state, 'funds'),
        sourceEventId: fact.sourceEventId,
        kind: 'OPENING_FUNDS',
        openingEvidenceId: fact.id,
        poolId: 'local',
        amountQ: cash(
          BigInt(COMPANY_CATALOGUE.origins.find((o) => o.id === fact.originId)!.cashCrowns) *
            BigInt(COMPANY_RULES.moneyQPerCrown),
        ),
      },
      terms(state, 'leader'),
      terms(state, 'front'),
    ];
    const ctx = context(state, cmd, financeFacts, [fact]);
    const lifecycleOnly = prepareCompanyLifecycle(state.lifecycle, cmd, ctx);
    expect(lifecycleOnly.kind).toBe('PREPARED');
    const result = prepared(prepareCompanyEconomy(state, cmd, ctx));
    expect(result.receipt.lifecycleReceipt?.requirements[0]?.kind).toBe('OPENING_ASSETS');
    expect(result.receipt.requirements.map((r) => r.kind)).toEqual(['OPENING_NONFINANCIAL']);
    expect(result.next.finance.accounts).toHaveLength(result.next.lifecycle.memberships.length);
    const grant = financeFacts[0];
    if (grant?.kind !== 'OPENING_FUNDS') throw new Error('fixture');
    expect(result.next.finance.wallets.reduce((sum, w) => sum + BigInt(w.cashQ), 0n)).toBe(
      BigInt(grant.amountQ),
    );
    const absent = prepareCompanyEconomy(
      state,
      cmd,
      context(state, cmd, financeFacts.slice(1), [fact]),
    );
    expect(absent).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(absent.state).toBe(state);
    const replay = prepared(prepareCompanyEconomy(result.next, cmd, context(result.next, cmd)));
    expect(replay.replayed).toBe(true);
    expect(replay.next).toBe(result.next);
  });
  it('P3/P8: hiring cannot commit membership or money independently; retained tariffs own their data', () => {
    const old = economy([1n], 2n);
    const state = {
      ...old,
      finance: {
        ...old.finance,
        wallets: [
          ...old.finance.wallets,
          {
            walletId: 'wallet-provider',
            owner: { kind: 'CHARACTER' as const, id: 'provider' },
            location: place,
            cashQ: cash(0),
          },
        ],
      },
    };
    const cmd = command(state, 'Recruit', {
      companyId: 'company',
      characterId: 'provider',
      offerId: 'recruit',
      offerRevision: '1',
      basis: 'PAID',
      poolId: 'local',
    });
    const offer = {
      ...scope(state, 'recruit'),
      kind: 'RECRUIT' as const,
      characterId: 'provider',
      basis: 'PAID' as const,
      offerRevision: '1',
      expiresAt: tick(2000),
      signingQ: cash(3),
      dailyWageMilli: '10000',
      itemIds: ['real-item'],
    };
    const tariff = terms(state, 'provider');
    const rejected = prepareCompanyEconomy(state, cmd, context(state, cmd, [tariff], [offer]));
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });
    expect(rejected.state).toBe(state);
    const funded = {
      ...state,
      finance: {
        ...state.finance,
        wallets: state.finance.wallets.map((w) =>
          w.walletId === 'purse' ? { ...w, cashQ: cash(10) } : w,
        ),
      },
    };
    const accepted = prepared(
      prepareCompanyEconomy(funded, cmd, context(funded, cmd, [tariff], [offer])),
    );
    expect(accepted.next.lifecycle.memberships.some((m) => m.characterId === 'provider')).toBe(
      true,
    );
    expect(accepted.next.finance.wallets.find((w) => w.walletId === 'purse')?.cashQ).toBe('7');
    expect(accepted.receipt.requirements).toContainEqual(
      expect.objectContaining({ kind: 'RECRUIT_ITEMS', itemIds: ['real-item'] }),
    );
    const text = JSON.stringify(accepted.next);
    (tariff.rates as { minimumLevel: number; dailyWageMilli: string }[])[0]!.dailyWageMilli = '999';
    expect(JSON.stringify(accepted.next)).toBe(text);
  });
  it('P1/P4: notices apply prospectively at a day boundary; final warning is immutable under partial payments and reload', () => {
    const initial = economy([3n], 100000n, 0);
    const notice: FinanceEvidence = {
      ...scope(initial, 'qualified', tick(333)),
      kind: 'QUALIFICATION_NOTICE',
      membershipId: 'service-worker-0',
      lifetimeLevel: 25,
      noticeVersion: 'qualified-v2',
    };
    const notified = advance(initial, 333, [notice]).next;
    expect(projectCompanyEconomy(notified, 'company')?.finance.services[1]).toMatchObject({
      currentAgreedRateMilli: '3',
      notices: [{ dailyWageMilli: '6', effectiveAt: '1000', notifiedAt: '333' }],
    });
    const changed = advance(notified, 1500).next;
    expect(changed.finance.claims.reduce((n, c) => n + BigInt(c.reportedQ), 0n)).toBe(6000n);
    expect(changed.finance.accounts[1]?.schedule?.notices[0]?.effectiveAt).toBe('1000');
    const owing = claims(economy([1n], 100000n), [100n]);
    const communication: FinanceEvidence = {
      ...scope(owing, 'warning', tick(3000)),
      kind: 'WAGE_COMMUNICATION',
      membershipId: 'service-worker-0',
      leaderId: 'leader',
      relation: { friend: 0, respect: 0, rivalry: 0 },
    };
    const warned = advance(owing, 3000, [communication]);
    const warning = warned.next.finance.arrears[0]?.warning;
    expect(warning?.deadline).toBe('5000');
    const partial = pay(JSON.parse(JSON.stringify(warned.next)), 50n).next;
    const expired = advance(partial, 5000).next;
    expect(expired.finance.arrears[0]?.warning).toEqual(warning);
    expect(expired.finance.departures).toContainEqual(
      expect.objectContaining({ reason: 'WAGE_BREACH', requestedAt: '5000' }),
    );
    const observed = observation(expired, 'worker-0', [access(expired)]).result.next;
    const total = observed.finance.claims.reduce(
      (n, c) => n + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ) - BigInt(c.paidQ),
      0n,
    );
    const restored = pay(observed, total).next;
    expect(restored.finance.departures[0]?.cancelledAt).toBe('5000');
    expect(restored.finance.arrears[0]?.resolvedAt).toBe('5000');
  });
  it('P5: final partial-day debt survives an empty purse; farewell follows mandatory settlement and has a cumulative cap', () => {
    let state = advance(economy([2n], 0n, 0), 500).next;
    state = observation(state, 'worker-0').result.next;
    const request = command(state, 'RequestDeparture', {
      membershipId: 'service-worker-0',
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: state.lifecycle.knowledge.revision,
    });
    state = prepared(prepareCompanyEconomy(state, request, context(state, request))).next;
    const intent = state.finance.departures[0]!;
    const cmd = command(
      state,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: intent.intentId,
        returnContainerId: 'real-local-container',
      },
      'leave',
      'SYSTEM',
    );
    const result = prepared(prepareCompanyEconomy(state, cmd, context(state, cmd)));
    expect(result.receipt.requirements).toContainEqual(
      expect.objectContaining({ kind: 'PHYSICAL_DEPARTURE', atTick: '500' }),
    );
    expect(result.next.lifecycle.memberships[1]?.endedAt).toBeNull(); // PREPARED is not the physical exit.
    expect(result.next.finance.claims[0]).toMatchObject({
      dueAt: '500',
      reportedQ: '1000',
      paidQ: '0',
    });
    const available = {
      ...result.next,
      finance: {
        ...result.next.finance,
        wallets: result.next.finance.wallets.map((w) =>
          w.walletId === 'purse' ? { ...w, cashQ: cash(10000) } : w,
        ),
      },
    };
    const paid = pay(available, 1000n).next;
    const relation: FinanceEvidence = {
      ...scope(paid, 'farewell-relation'),
      kind: 'FAREWELL_CONTEXT',
      departureIntentId: intent.intentId,
      membershipId: 'service-worker-0',
      leaderId: 'leader',
      friendship: 40,
    };
    const gift = command(paid, 'GrantFarewell', {
      membershipId: 'service-worker-0',
      quoteRevision: paid.lifecycle.knowledge.revision,
      amountQ: '1500',
      poolId: 'local',
    });
    const ctx = context(paid, gift, [access(paid), relation]);
    expect(quoteCompanyFarewell(paid, 'service-worker-0', ctx).maximumAdditionalQ).toBe('2000');
    const farewell = prepared(prepareCompanyEconomy(paid, gift, ctx));
    expect(farewell.next.finance.farewells[0]?.amountQ).toBe('1500');
    const later = farewell.next;
    const excessive = command(later, 'GrantFarewell', {
      membershipId: 'service-worker-0',
      quoteRevision: later.lifecycle.knowledge.revision,
      amountQ: '501',
      poolId: 'local',
    });
    expect(
      prepareCompanyEconomy(
        later,
        excessive,
        context(later, excessive, [
          access(later),
          { ...relation, revision: later.lifecycle.revision },
        ]),
      ),
    ).toMatchObject({ kind: 'REJECTED', error: 'INVALID_ARGUMENT' });
    expect(prepared(prepareCompanyEconomy(later, gift, context(later, gift))).replayed).toBe(true);
    expect(later.lifecycle.knowledge.revision).not.toBe(publicRevision('0'));
  });

  it('P5/P8: final settlement consumes existing backed reservations once before spending the remainder', () => {
    const base = claims(economy([1n], 400n), [300n]);
    const unknown = {
      ...base,
      finance: {
        ...base.finance,
        accounts: base.finance.accounts.map((a) => ({ ...a, confirmedAt: tick(0) })),
      },
    };
    let state = observation(pay(unknown, 100n).next, 'worker-0').result.next;
    expect(state.finance.reservations[0]?.amountQ).toBe('100');
    const ask = command(state, 'RequestDeparture', {
      membershipId: 'service-worker-0',
      reason: 'DISMISSED',
      causeId: 'choice',
      acknowledgedQuoteRevision: state.lifecycle.knowledge.revision,
    });
    state = prepared(prepareCompanyEconomy(state, ask, context(state, ask))).next;
    const leave = command(
      state,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: state.finance.departures[0]!.intentId,
        returnContainerId: 'local-container',
      },
      'final-held',
      'SYSTEM',
    );
    const result = prepared(
      prepareCompanyEconomy(state, leave, context(state, leave, [access(state)])),
    );
    expect(result.next.finance.claims[0]?.paidQ).toBe('300');
    expect(result.next.finance.reservations).toEqual([]);
    expect(result.next.finance.wallets.find((w) => w.walletId === 'purse')?.cashQ).toBe('100');
    expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-0')?.cashQ).toBe(
      '300',
    );
    expect(result.receipt.allocations.reduce((sum, a) => sum + BigInt(a.amountQ), 0n)).toBe(300n);
    expect(
      prepared(prepareCompanyEconomy(result.next, leave, context(result.next, leave))).next,
    ).toBe(result.next);
  });
  it('P1/P3: real acting-leader transitions preserve old claims and restore the original paid basis prospectively', () => {
    let state = advance(economy([2n], 10000n, 0), 500).next;
    function acting(unavailableId: string, candidateId: string, id: string) {
      state = {
        ...state,
        lifecycle: {
          ...state.lifecycle,
          characters: state.lifecycle.characters.map((p) => ({
            ...p,
            conditionIds: p.identity.characterId === unavailableId ? ['critical-bleed'] : [],
          })),
        },
      };
      const cmd = command(
        state,
        'ResolveLeadership',
        { companyId: 'company', crisisId: id, candidateId, mode: 'ACTING' },
        id,
      );
      state = prepared(
        prepareCompanyEconomy(
          state,
          cmd,
          context(
            state,
            cmd,
            [],
            [
              {
                ...scope(state, id),
                kind: 'CRISIS',
                leaderId: unavailableId,
                reason: 'LEADER_UNAVAILABLE',
              },
            ],
          ),
        ),
      ).next;
      const seen = command(
        state,
        'Observe',
        {
          observationId: `see-${id}`,
          observerRef: { kind: 'COMPANY', id: 'company' },
          subjectRef: { kind: 'COMPANY', id: 'company' },
          factId: `see-${id}`,
          sourceId: `source-see-${id}`,
        },
        `see-${id}`,
        'DOMAIN_RECEIPT',
      );
      state = prepared(
        prepareCompanyEconomy(
          state,
          seen,
          context(
            state,
            seen,
            [],
            [
              {
                ...scope(state, `see-${id}`),
                kind: 'COMPANY_OBSERVATION',
                subject: { kind: 'COMPANY', id: 'company' },
              },
            ],
          ),
        ),
      ).next;
    }
    const schedule = state.finance.accounts[1]!.schedule;
    acting('leader', 'worker-0', 'crisis-one');
    state = advance(state, 1000).next;
    expect(state.finance.claims.reduce((sum, c) => sum + BigInt(c.reportedQ), 0n)).toBe(1000n);
    acting('worker-0', 'leader', 'crisis-two');
    state = advance(state, 1500).next;
    expect(state.finance.claims.reduce((sum, c) => sum + BigInt(c.reportedQ), 0n)).toBe(2000n);
    expect(state.lifecycle.memberships[1]?.basis).toBe('PAID');
    expect(state.finance.accounts[1]?.schedule).toEqual(schedule);
  });

  it('P3/P4/P8: a local report and departure retain distant debt rather than demand a remote purse', () => {
    const fresh = claims(economy([3n], 100n), [17n]);
    const distantClaim = {
      ...fresh.finance.claims[0]!,
      poolId: 'distant',
      fromTick: tick(499),
      toTick: tick(500),
      dueAt: tick(500),
      earned: [
        { fromTick: tick(499), toTick: tick(500), dailyWageMilli: '17', maintenanceId: null },
      ],
    };
    const state: CompanyEconomyState = {
      ...fresh,
      finance: {
        ...fresh.finance,
        wallets: [
          ...fresh.finance.wallets,
          {
            walletId: 'distant-purse',
            owner: { kind: 'COMPANY', id: 'company' },
            location: { ...place, siteId: 'outpost' },
            cashQ: cash(30),
          },
        ],
        pools: [...fresh.finance.pools, { poolId: 'distant', walletId: 'distant-purse' }],
        claims: [
          distantClaim,
          {
            ...fresh.finance.claims[0]!,
            claimId: 'local-claim',
            dailyWageMilli: '3',
            reportedQ: cash(3),
            earned: [
              { fromTick: tick(999), toTick: tick(1000), dailyWageMilli: '3', maintenanceId: null },
            ],
          },
        ],
        reservations: [
          {
            reservationId: 'old-hold',
            claimId: distantClaim.claimId,
            walletId: 'distant-purse',
            amountQ: cash(5),
            purpose: 'PENDING_CONFIRMATION',
          },
        ],
      },
    };
    const noCashReport = observation(state, 'worker-0').result;
    const localReport = observation(state, 'worker-0', [access(state)]).result;
    expect(projectCompanyEconomy(localReport.next, 'company')).toEqual(
      projectCompanyEconomy(noCashReport.next, 'company'),
    );
    let next = localReport.next;
    const request = command(next, 'RequestDeparture', {
      membershipId: 'service-worker-0',
      reason: 'DISMISSED',
      causeId: 'owner-choice',
      acknowledgedQuoteRevision: next.lifecycle.knowledge.revision,
    });
    next = prepared(prepareCompanyEconomy(next, request, context(next, request))).next;
    const execute = command(
      next,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-0',
        intentId: next.finance.departures[0]!.intentId,
        returnContainerId: 'local-return-container',
      },
      'local-departure',
      'SYSTEM',
    );
    const departure = prepared(
      prepareCompanyEconomy(next, execute, context(next, execute, [access(next)])),
    );
    expect(
      departure.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-0')?.cashQ,
    ).toBe('3');
    expect(departure.next.finance.wallets.find((w) => w.walletId === 'distant-purse')?.cashQ).toBe(
      '30',
    );
    expect(departure.next.finance.reservations).toEqual(state.finance.reservations);
    expect(
      departure.next.finance.claims.find((c) => c.claimId === distantClaim.claimId)?.paidQ,
    ).toBe('0');
    expect(departure.receipt.requirements).toContainEqual(
      expect.objectContaining({ kind: 'PHYSICAL_DEPARTURE' }),
    );
    const retry = prepared(
      prepareCompanyEconomy(departure.next, execute, context(departure.next, execute)),
    );
    expect(retry.next).toBe(departure.next);
    // A forged capability for that distant purse still fails instead of silently bypassing authorization.
    const forged = { ...access(state), poolIds: ['local', 'distant'] };
    const payDistant = command(state, 'PayClaims', {
      poolId: 'distant',
      mode: 'DEFAULT',
      claimIds: [],
      amountQ: '1',
    });
    const rejection = prepareCompanyEconomy(
      state,
      payDistant,
      context(state, payDistant, [forged]),
    );
    expect(rejection.kind).toBe('REJECTED');
    expect(rejection.state).toBe(state);
  });
});
