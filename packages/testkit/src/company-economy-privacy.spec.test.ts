import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  bindFinancialSocialConsequences,
  createSocialState,
  COMPANY_CATALOGUE,
  COMPANY_RULES,
  PROGRESSION_RULES,
  initialSkillProgress,
  prepareCompanyLifecycle,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  projectEconomyRejection,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  FinanceEvidence,
  PhysicalEvidence,
  PracticeEvidence,
  ServiceTermsEvidence,
} from '@warwrit/game-core';
import {
  access,
  advance,
  cash,
  command,
  context,
  economy,
  observation,
  physicalScope,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';
import { careHandover, withCareProvider } from './company-physical-fixture.js';

function death(state: CompanyEconomyState, characterId: string, sourceEventId?: string) {
  const id = `death-${characterId}`;
  const custodyOutcomeId = `death-outcome-${characterId}`;
  const cmd = command(
    state,
    'RecordDeath',
    {
      receiptId: id,
      characterId,
      actualDeathTick: state.finance.processedTick,
      causeId: 'battle-outcome',
      custodyOutcomeId,
    },
    id,
    'OUTCOME_RECEIPT',
  );
  if (sourceEventId) cmd.sourceEventId = sourceEventId;
  const fact: FinanceEvidence = {
    ...scope(state, id),
    sourceEventId: cmd.sourceEventId,
    kind: 'FINANCIAL_DEATH',
    characterId,
    actualDeathTick: state.finance.processedTick,
    recipient: { kind: 'ESTATE', id: characterId },
    causeId: 'battle-outcome',
    custodyOutcomeId,
  };
  const physicalFact: PhysicalEvidence = {
    ...physicalScope(state, custodyOutcomeId),
    sourceEventId: cmd.sourceEventId,
    kind: 'DEATH_OUTCOME',
    characterId,
    actualDeathTick: state.finance.processedTick,
    causeId: 'battle-outcome',
    location: place,
    corpseContainerId: `corpse-${characterId}`,
  };
  const ctx = context(state, cmd, [fact], [], [physicalFact]);
  return { cmd, ctx, input: state, result: prepared(prepareCompanyEconomy(state, cmd, ctx)) };
}

function view(state: CompanyEconomyState) {
  return projectCompanyEconomy(state, 'company');
}

function serviceTerms(state: CompanyEconomyState, characterId: string): ServiceTermsEvidence {
  return {
    ...scope(state, `terms-${characterId}`),
    kind: 'SERVICE_TERMS',
    characterId,
    poolId: 'local',
    recipient: { kind: 'CHARACTER', id: characterId },
    signingWalletId: `wallet-${characterId}`,
    rates: COMPANY_RULES.economy.qualificationBands.map((band) => ({
      minimumLevel: band.level,
      dailyWageMilli: String(band.multiplierBps),
    })),
  };
}

function earned(state: CompanyEconomyState, membershipId: string) {
  return state.finance.claims
    .filter((c) => c.membershipId === membershipId)
    .reduce(
      (s, c) =>
        s +
        c.earned.reduce(
          (sum, e) => sum + (BigInt(e.toTick) - BigInt(e.fromTick)) * BigInt(e.dailyWageMilli),
          0n,
        ),
      0n,
    );
}

describe('WP02.3 — financial knowledge and exact replay', () => {
  it('P7: hidden death is noninterfering over DEFAULT/TARGETED, insufficient funds and retries, until a legitimate report', () => {
    const loaded = advance(economy([10n, 10n], 12000n, 0), 500).next;
    const unobserved: CompanyEconomyState = {
      ...loaded,
      lifecycle: {
        ...loaded.lifecycle,
        characters: loaded.lifecycle.characters.map((character) =>
          character.identity.characterId === 'provider'
            ? {
                ...character,
                skills: {
                  ...character.skills,
                  archery: initialSkillProgress(0, 'provider-opening-archery'),
                },
                aptitudeBySkill: { ...character.aptitudeBySkill, archery: 10000 },
              }
            : character,
        ),
        knowledge: {
          ...loaded.lifecycle.knowledge,
          characters: loaded.lifecycle.knowledge.characters.filter(
            (character) => character.identity.characterId !== 'provider',
          ),
        },
      },
    };
    const practice = command(
      unobserved,
      'CreditPractice',
      {
        receiptId: 'provider-practice-transport',
        characterId: 'provider',
        skillId: 'archery',
        methodId: 'weapon-attack',
        challengeLevel: 0,
        outcome: 'SUCCESS',
        effortTicks: '1',
      },
      'provider-practice',
      'DOMAIN_RECEIPT',
    );
    const practiceFact: PracticeEvidence = {
      worldId: unobserved.lifecycle.worldId,
      companyId: unobserved.lifecycle.companyId,
      sourceEventId: practice.sourceEventId!,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload: practice.payload as PracticeEvidence['payload'],
      startedAt: '490',
      completedAt: '495',
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'weapon-attack',
        weaponProfile: 'bow',
        interaction: {
          sourceEventId: practice.sourceEventId!,
          attackerId: 'provider',
          defenderId: 'threat',
          atTick: '495',
          origin: 'EXTERNAL',
        },
      },
    };
    const practiced = prepared(
      prepareCompanyEconomy(unobserved, practice, {
        ...context(unobserved, practice),
        practiceFacts: [practiceFact],
      }),
    ).next;
    let alive = unobserved;
    let hidden = death(practiced, 'worker-0').result.next;
    expect(view(hidden)?.characters.some((character) => character.characterId === 'provider')).toBe(
      false,
    );
    expect(view(hidden)).toEqual(view(alive));
    alive = advance(alive, 1000).next;
    hidden = advance(hidden, 1000).next;
    expect(earned(hidden, 'service-worker-0')).toBe(5000n);
    expect(earned(alive, 'service-worker-0')).toBe(10000n);
    expect(view(hidden)).toEqual(view(alive));
    const operations = [
      { mode: 'DEFAULT', amountQ: '6000' },
      { mode: 'TARGETED', amountQ: '4000', payeeId: 'worker-0' },
      { mode: 'DEFAULT', amountQ: '3000' },
      { mode: 'DEFAULT', amountQ: '2000' },
    ];
    for (const [index, op] of operations.entries()) {
      const cmd = command(
        alive,
        'PayClaims',
        { poolId: 'local', claimIds: [], ...op },
        `payment-${index}`,
      );
      const a = prepareCompanyEconomy(alive, cmd, context(alive, cmd, [access(alive)]));
      const b = prepareCompanyEconomy(hidden, cmd, context(hidden, cmd, [access(hidden)]));
      expect(b.kind).toBe(a.kind);
      if (a.kind === 'REJECTED' && b.kind === 'REJECTED') {
        expect(a.error).toBe('INSUFFICIENT_FUNDS');
        expect(projectEconomyRejection(hidden, b.error, 'company')).toEqual(
          projectEconomyRejection(alive, a.error, 'company'),
        );
        expect(a.state).toBe(alive);
        expect(b.state).toBe(hidden);
      } else {
        if (a.kind !== 'PREPARED' || b.kind !== 'PREPARED')
          throw new Error('paired outcome mismatch');
        expect(b.receipt.allocations).toEqual(a.receipt.allocations);
        alive = a.next;
        hidden = b.next;
        for (const world of [alive, hidden]) {
          const retry = prepared(prepareCompanyEconomy(world, cmd, context(world, cmd)));
          expect(retry.replayed).toBe(true);
          expect(retry.next).toBe(world);
          expect(
            bindFinancialSocialConsequences(createSocialState(), retry, []).social.chronicle,
          ).toEqual([]);
        }
      }
      expect(view(hidden)).toEqual(view(alive));
    }
    expect(view(hidden)?.finance.wallets[0]?.spendableQ).toBe('0');
    const candidateReport = observation(hidden, 'provider');
    const wrongObserver = {
      ...candidateReport.cmd,
      payload: {
        ...(candidateReport.cmd.payload as Record<string, unknown>),
        observerRef: { kind: 'COMPANY' as const, id: 'other-company' },
      },
    };
    const wrongObserverResult = prepareCompanyLifecycle(
      hidden.lifecycle,
      wrongObserver,
      candidateReport.ctx,
    );
    expect(wrongObserverResult).toMatchObject({
      kind: 'REJECTED',
      state: hidden.lifecycle,
      error: 'INVALID_SOURCE',
    });
    expect(projectCompanyEconomy(hidden, 'other-company')).toBeNull();
    const unchangedView = view(hidden);
    const observationId = (candidateReport.cmd.payload as { observationId: string }).observationId;
    const foreignObservationContext = {
      ...candidateReport.ctx,
      physicalFacts: (candidateReport.ctx.physicalFacts ?? []).map((fact) =>
        fact.id === observationId && fact.kind === 'PHYSICAL_OBSERVATION'
          ? {
              ...fact,
              companyId: 'other-company',
              worldId: 'other-world',
              observerCompanyId: 'other-company',
            }
          : fact,
      ),
    };
    const foreignObservation = prepareCompanyEconomy(
      hidden,
      candidateReport.cmd,
      foreignObservationContext,
    );
    expect(foreignObservation).toMatchObject({
      kind: 'REJECTED',
      state: hidden,
      error: 'INVALID_SOURCE',
    });
    expect(foreignObservation.state).toBe(hidden);
    expect(view(foreignObservation.state)).toEqual(unchangedView);

    expect(view(hidden)?.characters.some((character) => character.characterId === 'provider')).toBe(
      false,
    );
    const candidate = observation(hidden, 'provider');
    const recruit = command(candidate.result.next, 'Recruit', {
      companyId: 'company',
      characterId: 'provider',
      offerId: 'provider-offer',
      offerRevision: '1',
      basis: 'PAID',
      poolId: 'local',
    });
    const offer = {
      ...scope(candidate.result.next, 'provider-offer'),
      kind: 'RECRUIT' as const,
      characterId: 'provider',
      basis: 'PAID' as const,
      offerRevision: '1',
      expiresAt: tick(2000),
      signingQ: cash(0),
      dailyWageMilli: '10000',
      itemIds: [],
    };
    const recruited = prepared(
      prepareCompanyEconomy(
        candidate.result.next,
        recruit,
        context(
          candidate.result.next,
          recruit,
          [serviceTerms(candidate.result.next, 'provider')],
          [offer],
        ),
      ),
    ).next;
    const candidateView = view(recruited);
    const observedProvider = candidateView?.characters.find(
      (character) => character.characterId === 'provider',
    );
    expect(observedProvider).toMatchObject({
      skills: { archery: 1 },
      aptitudeBySkill: { leadership: 10000, archery: 10000 },
    });
    expect(JSON.stringify(observedProvider)).not.toContain('milliXp');
    expect(candidateView?.finance.services).toContainEqual(
      expect.objectContaining({ currentAgreedRateMilli: '10000', materialSupportOnly: false }),
    );
    expect(
      projectCompanyEconomy(
        JSON.parse(JSON.stringify(recruited)) as CompanyEconomyState,
        'company',
      ),
    ).toEqual(candidateView);
    const providerRetry = prepared(
      prepareCompanyEconomy(recruited, candidate.cmd, context(recruited, candidate.cmd)),
    );
    expect(providerRetry.replayed).toBe(true);
    expect(providerRetry.next).toBe(recruited);

    const report = observation(recruited, 'worker-0');
    const disclosed = report.result.next;
    expect(view(disclosed)).not.toEqual(view(alive));
    expect(BigInt(view(disclosed)!.finance.wallets[0]!.spendableQ)).toBeGreaterThan(0n);
    expect(disclosed.finance.wallets).toEqual(hidden.finance.wallets);
    expect(
      disclosed.finance.claims.find((c) => c.membershipId === 'service-worker-0')?.reportedQ,
    ).toBe('5000');
    expect(
      disclosed.finance.accounts.find((a) => a.membershipId === 'service-worker-0')?.death
        ?.recipient,
    ).toEqual({ kind: 'ESTATE', id: 'worker-0' });
    const retry = prepared(
      prepareCompanyEconomy(disclosed, report.cmd, context(disclosed, report.cmd)),
    );
    expect(retry.next).toBe(disclosed);
    expect(view(disclosed)?.characters.find((c) => c.characterId === 'worker-0')?.knownStatus).toBe(
      'DEAD',
    );
  });

  it('P7: visible colleague payouts stay identical while the unconfirmed colleague gets only a backed hold', () => {
    const shared = advance(economy([10n, 10n], 15000n, 0), 500).next;
    const worlds = [shared, death(shared, 'worker-0').result.next].map(
      (s) => observation(advance(s, 1000).next, 'worker-1').result.next,
    );
    expect(view(worlds[0]!)).toEqual(view(worlds[1]!));
    const receipts = worlds.map((s) => {
      const cmd = command(s, 'PayClaims', {
        poolId: 'local',
        claimIds: [],
        mode: 'DEFAULT',
        amountQ: '10000',
      });
      return prepared(prepareCompanyEconomy(s, cmd, context(s, cmd, [access(s)])));
    });
    expect(receipts[0]!.receipt.allocations).toEqual(receipts[1]!.receipt.allocations);
    for (const result of receipts) {
      expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-1')?.cashQ).toBe(
        '5000',
      );
      expect(result.next.finance.wallets.find((w) => w.walletId === 'wallet-worker-0')?.cashQ).toBe(
        '0',
      );
      expect(result.receipt.allocations.map((a) => a.channel).sort()).toEqual([
        'CASH',
        'PENDING_CONFIRMATION',
      ]);
    }
    expect(view(receipts[0]!.next)).toEqual(view(receipts[1]!.next));
  });

  it('P8: exact command conflicts precede source fallback; source fan-out remains subject-scoped and replay needs no stale fact', () => {
    const start = advance(economy([10n, 10n], 12000n, 0), 500).next;
    const first = death(start, 'worker-0', 'source-shared-battle');
    const identical = prepared(
      prepareCompanyEconomy(first.result.next, first.cmd, context(first.result.next, first.cmd)),
    );
    expect(identical.replayed).toBe(true);
    const retry = { ...first.cmd, commandId: 'new-delivery-id' };
    const sourceReplay = prepared(
      prepareCompanyEconomy(first.result.next, retry, context(first.result.next, retry)),
    );
    expect(sourceReplay.replayed).toBe(true);
    const second = death(first.result.next, 'worker-1', 'source-shared-battle');
    const conflicting = {
      ...first.cmd,
      payload: second.cmd.payload,
      sourceEventId: second.cmd.sourceEventId,
    };
    const result = prepareCompanyEconomy(
      second.result.next,
      conflicting,
      context(second.result.next, conflicting),
    );
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'IDEMPOTENCY_CONFLICT' });
    const wrongActor = { ...first.cmd, actorRef: { kind: 'PLAYER' as const, id: 'principal' } };
    expect(prepareCompanyEconomy(start, wrongActor, context(start, wrongActor))).toMatchObject({
      kind: 'REJECTED',
    });
    const injected = { ...first.cmd, settled: true };
    const withGrant = {
      ...first.ctx,
      internalGrant: {
        commandId: first.cmd.commandId,
        sourceEventId: first.cmd.sourceEventId,
        canonicalRequest: canonicalJson(injected),
      },
    };
    expect(prepareCompanyEconomy(first.input, injected, withGrant)).toMatchObject({
      kind: 'REJECTED',
      error: 'INVALID_COMMAND',
    });
  });

  it('P6/P7: loss of the last field worker stops actual support without disclosing hidden death', () => {
    const initial = withCareProvider(economy([1n, 1n], 10000n, 0));
    const wound = command(
      initial,
      'ApplyCondition',
      {
        receiptId: 'leader-critical',
        characterId: 'leader',
        conditionDefinitionId: 'critical-bleed',
        causeId: 'fixture-wound',
        deadlineTick: '250',
      },
      'leader-critical',
      'DOMAIN_RECEIPT',
    );
    const woundFact: PhysicalEvidence = {
      ...physicalScope(initial, 'leader-critical'),
      sourceEventId: wound.sourceEventId,
      kind: 'CONDITION_SOURCE',
      characterId: 'leader',
      definitionId: 'critical-bleed',
      causeId: 'fixture-wound',
      onsetTick: tick(0),
      deadlineTick: tick(250),
    };
    const resting = prepared(
      prepareCompanyEconomy(initial, wound, context(initial, wound, [], [], [woundFact])),
    ).next;
    const camp = command(resting, 'BeginFieldCamp', {
      partyId: 'party',
      siteEligibilityId: 'site',
    });
    const begun = prepared(
      prepareCompanyEconomy(
        resting,
        camp,
        context(resting, camp, [
          {
            ...scope(resting, 'site'),
            kind: 'CAMP_SITE',
            partyId: 'party',
            location: place,
            stationary: true,
            conflict: false,
          },
        ]),
      ),
    ).next;
    const atDeparture = advance(begun, 250).next;
    const detach = command(atDeparture, 'SetAssignment', {
      characterId: 'worker-1',
      assignment: 'GARRISON',
      locationId: 'village',
      dutyEvidenceId: 'detached-worker',
      fundingPoolId: 'local',
    });
    const detached = prepared(
      prepareCompanyEconomy(
        atDeparture,
        detach,
        context(
          atDeparture,
          detach,
          [access(atDeparture)],
          [
            {
              ...scope(atDeparture, 'detached-worker'),
              kind: 'DUTY',
              characterId: 'worker-1',
              assignment: 'GARRISON',
              location: place,
              fundingPoolId: 'local',
              handoverToId: 'provider',
              partyId: null,
            },
          ],
          [careHandover(atDeparture, 'worker-1')],
        ),
      ),
    ).next;
    const shared = advance(detached, 500).next;
    const alive = advance(shared, 1000).next;
    const hidden = advance(death(shared, 'worker-0').result.next, 1000).next;
    expect(view(hidden)).toEqual(view(alive));
    expect(
      hidden.finance.food.find((f) => f.membershipId === 'service-leader')?.intervals.at(-1),
    ).toMatchObject({ fromTick: '500', toTick: '1000', agreementId: null });
    expect(hidden.finance.maintenance[0]?.endedAt).toBe('500');
    expect(view(hidden)?.finance.maintenance[0]?.endedAt).toBeNull();
    const learned = observation(hidden, 'worker-0').result.next;
    expect(view(learned)?.finance.maintenance[0]?.endedAt).toBe('500');
  });
});
