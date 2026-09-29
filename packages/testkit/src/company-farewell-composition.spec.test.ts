import { describe, expect, it } from 'vitest';
import {
  COMPANY_RULES,
  createCompanyLearningState,
  createSocialState,
  deriveEffectiveRelation,
  initialSkillProgress,
  prepareCompanyEconomy,
  prepareCompanyEconomyWithLearning,
  prepareCompanyEconomyWithLearningAndSocial,
  prepareCompanyFinancialSocial,
  projectCompanyEconomy,
  recordDirectedRelation,
  type CompanyEconomyState,
  type LearningQuoteContext,
  type SocialState,
} from '@warwrit/game-core';
import {
  access,
  advance,
  command,
  context,
  economy,
  observation,
  place,
  prepared,
  scope,
  tick,
  cash,
} from './company-economy-fixture.js';
import { exitCommand, reload, requestExit, serviceId } from './company-farewell-fixture.js';
import { addItem, item, itemAccess, withLoadedConditions } from './company-physical-fixture.js';

type Command = ReturnType<typeof command>;
type Notice = NonNullable<Parameters<typeof prepareCompanyFinancialSocial>[6]>[number];
function relations() {
  let social = createSocialState();
  for (const fromId of ['worker-0', 'worker-1'])
    social = recordDirectedRelation(social, {
      sourceEventId: `contact-${fromId}`,
      fromId,
      toId: 'leader',
      base: { friendship: 40, respect: 20, fear: 0, rivalry: 0 },
    }).state;
  return social;
}
function initial() {
  const state = observation(advance(economy([1n, 1n], 100000n, 30000), 30500).next, 'worker-0')
    .result.next;
  return requestExit(state, { farewell: { amountQ: '500', poolId: 'local' } });
}
function notice(state: CompanyEconomyState, cmd: Command, personId = 'worker-0'): Notice {
  return {
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    membershipId: serviceId,
    personId,
    sourceCommandId: cmd.commandId,
    sourceEventId: cmd.sourceEventId,
    learnedAt: state.finance.processedTick,
    channel: 'REPORT',
    salience: 1,
  };
}
function run(
  state: CompanyEconomyState,
  social: SocialState,
  cmd: Command,
  notices: readonly Notice[] = [],
  funded = false,
) {
  const leaderId =
    state.lifecycle.company!.actingLeaderId ?? state.lifecycle.company!.currentLeaderId!;
  const localAccess = access(state);
  if (localAccess.kind !== 'LOCAL_MONEY_ACCESS') throw new Error('local access fixture');
  return prepareCompanyFinancialSocial(
    state,
    social,
    cmd,
    context(state, cmd, [{ ...localAccess, operatorId: leaderId }]),
    funded
      ? [
          {
            ...scope(state, `context-${cmd.commandId}`),
            kind: 'FAREWELL_CONTEXT',
            membershipId: serviceId,
            leaderId,
            departureIntentId: state.finance.departures[0]!.intentId,
          },
        ]
      : [],
    [],
    notices,
  );
}
function accepted(result: ReturnType<typeof run>) {
  if (result.kind === 'REJECTED') throw new Error(result.error);
  return result;
}
function giftCommand(state: CompanyEconomyState, amountQ = '500') {
  return command(state, 'GrantFarewell', {
    membershipId: serviceId,
    quoteRevision: state.lifecycle.knowledge.revision,
    amountQ,
    poolId: 'local',
  });
}

describe('E04-BIND: one authenticated financial, physical and social preparation', () => {
  it('atomically closes an active study interval with the selected-farewell exit and notice', () => {
    const stateWithBook = addItem(
      initial(),
      item(
        'departure-book',
        'study-book-medicine',
        {
          kind: 'COMPANY',
          id: 'company',
        },
        'fixture-supply',
      ),
    );
    const startState = {
      ...stateWithBook,
      lifecycle: {
        ...stateWithBook.lifecycle,
        characters: stateWithBook.lifecycle.characters.map((character) =>
          character.identity.characterId === 'worker-0'
            ? {
                ...character,
                skills: {
                  ...character.skills,
                  scholarship: 25,
                  medicine: initialSkillProgress(0, 'departure-study'),
                },
                aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
                perks: ['scholarship-25-a'],
              }
            : character,
        ),
      },
    };
    const learning = createCompanyLearningState();
    const study = {
      intervalId: 'departure-study-access',
      itemId: 'departure-book',
      accessEvidenceId: 'departure-study-access-evidence',
    };
    const start = command(
      startState,
      'StartLearning',
      {
        characterId: 'worker-0',
        methodId: 'book-study',
        goal: { workId: 'wound-care-basics', maxTicks: '5000' },
        resourceIds: ['departure-book'],
        budgetPoolId: 'local',
        maxBudgetQ: '0',
      },
      'departure-study-start',
      'PLAYER',
      startState.finance.processedTick,
    );
    const learningSource: LearningQuoteContext['learningFacts'][number] = {
      ...scope(startState, 'departure-study-source'),
      sourceVersion: 'departure-study-v1',
      expiresAt: tick(40000),
      learnerId: 'worker-0',
      location: place,
      resourceIds: ['departure-book'],
      kind: 'SELF_STUDY',
      methodId: 'book-study',
      workId: 'wound-care-basics',
      sectionId: 'wound-care-basics-1',
    };
    const startContext = {
      ...context(
        startState,
        start,
        [access(startState)],
        [],
        [
          {
            ...itemAccess(
              startState,
              study.accessEvidenceId,
              'STUDY',
              ['fixture-supply'],
              [study.itemId],
            ),
            operatorId: 'worker-0',
          },
        ],
      ),
      learningFacts: [learningSource],
    } as LearningQuoteContext;
    const started = prepareCompanyEconomyWithLearning(
      { economy: startState, learning },
      start,
      startContext,
      {
        taskId: 'departure-study-task',
        effectId: 'departure-study-start-effect',
        intervals: [],
        study,
      },
    );
    if (started.kind !== 'PREPARED') throw new Error(`Start departure study: ${started.error}`);

    const initialState = started.next.economy;
    const sourceLearningTask = started.next.learning.tasks.tasks.find(
      (task) => task.start.taskId === 'departure-study-task',
    )!;
    const advanceTick = tick(Number(initialState.finance.processedTick) + 10);
    const advanceCommand = command(
      initialState,
      'AdvanceCampaign',
      { toTick: advanceTick, authoritativeInputs: [] },
      'departure-study-advance',
      'SYSTEM',
      advanceTick,
    );
    const advanceInterval = {
      intervalId: 'departure-study-earned-interval',
      taskId: sourceLearningTask.start.taskId,
      commandId: advanceCommand.commandId,
      ownerIntervalId: sourceLearningTask.start.studyIntervalId!,
      companyId: initialState.lifecycle.companyId,
      worldId: initialState.lifecycle.worldId,
      characterId: 'worker-0',
      fromTick: initialState.finance.processedTick,
      toTick: advanceTick,
      kind: 'ELIGIBLE' as const,
    };
    const advanced = prepareCompanyEconomyWithLearning(
      { economy: initialState, learning: started.next.learning },
      advanceCommand,
      {
        ...context(initialState, advanceCommand),
        learningFacts: [learningSource],
      } as LearningQuoteContext,
      {
        intervals: [advanceInterval],
        manifest: {
          companyId: initialState.lifecycle.companyId,
          worldId: initialState.lifecycle.worldId,
          commandId: advanceCommand.commandId,
          taskId: sourceLearningTask.start.taskId,
          ownerIntervalId: sourceLearningTask.start.studyIntervalId!,
          targetTick: advanceTick,
          evidenceIds: [advanceInterval.intervalId, advanceInterval.ownerIntervalId],
        },
        effectId: 'departure-study-advance-effect',
      },
    );
    if (advanced.kind !== 'PREPARED') throw new Error(`Advance departure study: ${advanced.error}`);
    const state = observation(advanced.next.economy, 'worker-0').result.next;
    const learningAtDeparture = advanced.next.learning;
    const social = relations();
    const cmd = exitCommand(state);
    const intentId = state.finance.departures.find(
      (entry) => entry.membershipId === serviceId,
    )!.intentId;
    const farewellContext = {
      ...scope(state, 'departure-farewell-context', cmd.campaignTick),
      kind: 'FAREWELL_CONTEXT' as const,
      membershipId: serviceId,
      departureIntentId: intentId,
      leaderId: 'leader',
    };
    const contextWithLearning = {
      ...context(
        state,
        cmd,
        [access(state, cmd.campaignTick)],
        [],
        [
          {
            ...itemAccess(
              state,
              study.accessEvidenceId,
              'STUDY',
              ['fixture-supply'],
              [study.itemId],
            ),
            atTick: cmd.campaignTick,
            operatorId: 'worker-0',
          },
        ],
      ),
      learningFacts: [learningSource],
    } as LearningQuoteContext;
    const result = prepareCompanyEconomyWithLearningAndSocial(
      { economy: state, learning: learningAtDeparture },
      social,
      cmd,
      contextWithLearning,
      [farewellContext],
      [],
      [{ ...notice(state, cmd), learnedAt: cmd.campaignTick }],
      {
        intervals: [],
        manifest: {
          companyId: state.lifecycle.companyId,
          worldId: state.lifecycle.worldId,
          commandId: cmd.commandId,
          taskId: sourceLearningTask.start.taskId,
          ownerIntervalId:
            sourceLearningTask.start.studyIntervalId ?? sourceLearningTask.start.quote.sourceId,
          targetTick: cmd.campaignTick,
          evidenceIds: [intentId],
        },
        effectId: 'departure-study-stop-effect',
      },
    );
    expect(result.kind, result.kind === 'REJECTED' ? result.error : undefined).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.requirements).toEqual([]);
    expect(result.receipt.farewellOutcome).toBeDefined();
    expect(
      result.next.economy.lifecycle.memberships.find((entry) => entry.membershipId === serviceId)
        ?.endedAt,
    ).toBe(state.finance.processedTick);
    expect(result.next.social.chronicle).toHaveLength(1);
    expect(
      result.next.learning.tasks.tasks.find((task) => task.start.taskId === 'departure-study-task')
        ?.terminal,
    ).toMatchObject({ kind: 'INTERRUPTED', commandId: cmd.commandId });
    expect(
      result.next.learning.tasks.tasks.find((task) => task.start.taskId === 'departure-study-task')
        ?.completedTicks,
    ).toBe('10');

    const bad = prepareCompanyEconomyWithLearningAndSocial(
      { economy: state, learning: learningAtDeparture },
      social,
      cmd,
      contextWithLearning,
      [farewellContext],
      [],
      [{ ...notice(state, cmd), personId: 'not-an-observer' }],
      {
        intervals: [],
        manifest: {
          companyId: state.lifecycle.companyId,
          worldId: state.lifecycle.worldId,
          commandId: cmd.commandId,
          taskId: sourceLearningTask.start.taskId,
          ownerIntervalId:
            sourceLearningTask.start.studyIntervalId ?? sourceLearningTask.start.quote.sourceId,
          targetTick: cmd.campaignTick,
          evidenceIds: [intentId],
        },
        effectId: 'departure-study-stop-effect',
      },
    );
    expect(bad).toMatchObject({
      kind: 'REJECTED',
      state: { economy: state, learning: learningAtDeparture, social },
    });
  });

  it('uses real exact social contexts, selected exit and later gift, with original command/source replay', () => {
    const state = initial(),
      social = relations(),
      cmd = exitCommand(state);
    const evidence = { ...notice(state, cmd), channel: 'EXPERIENCE' as const };
    const result = accepted(run(state, social, cmd, [evidence], true));
    expect(result.next.finance.movements.map((m) => [m.purpose, m.amountQ])).toEqual([
      ['WAGE', '500'],
      ['FAREWELL', '500'],
    ]);
    expect(result.next.lifecycle.memberships[1]!.endedAt).toBe('30500');
    expect(result.next.lifecycle.characters[1]!.presence.fieldPartyId).toBeNull();
    expect(result.social.chronicle[0]).toMatchObject({ otherId: 'leader', happenedAt: '30500' });
    Object.assign(evidence, { personId: 'external-mutation' });
    expect(result.social.chronicle[0]!.personId).toBe('worker-0');
    const gift = giftCommand(result.next);
    const resolved = accepted(
      run(reload(result.next), reload(result.social), gift, [notice(result.next, gift)], true),
    );
    expect(
      deriveEffectiveRelation(resolved.social, 'worker-0', 'leader', '30500')!.respect,
    ).toEqual({ numerator: '20', denominator: '1' });
    const replay = prepareCompanyFinancialSocial(
      resolved.next,
      resolved.social,
      cmd,
      context(resolved.next, cmd),
      [],
      [],
      [{ ...notice(state, cmd), personId: 'forged' }],
    );
    expect(replay).toMatchObject({ kind: 'PREPARED', replayed: true, receipt: result.receipt });
    expect(replay.social).toBe(resolved.social);
    const bySource = { ...cmd, commandId: 'retry-source' };
    expect(run(resolved.next, resolved.social, bySource)).toMatchObject({
      kind: 'PREPARED',
      replayed: true,
      receipt: result.receipt,
    });
    const changed = {
      ...cmd,
      payload: { ...(cmd.payload as object), returnContainerId: 'changed' },
    };
    expect(run(resolved.next, resolved.social, changed)).toMatchObject({
      kind: 'REJECTED',
      error: 'IDEMPOTENCY_CONFLICT',
    });
  });

  it('a late mandatory observer failure rolls back actual earned pay, gift, exit, source and social roots', () => {
    const state = initial(),
      social = relations(),
      cmd = exitCommand(state);
    const original = reload({ state, social });
    const bad = { ...notice(state, cmd), personId: 'provider' };
    const result = run(state, social, cmd, [notice(state, cmd), bad], true);
    expect(result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(result.state).toBe(state);
    expect(result.social).toBe(social);
    expect({ state, social }).toEqual(original);
    const exited = accepted(run(state, social, cmd, [notice(state, cmd)], true));
    const gift = giftCommand(exited.next);
    const failedGift = run(
      exited.next,
      exited.social,
      gift,
      [{ ...notice(exited.next, gift), sourceEventId: 'forged' }],
      true,
    );
    expect(failedGift).toMatchObject({
      kind: 'REJECTED',
      state: exited.next,
      social: exited.social,
    });
  });

  it('keeps the actual exit leader when another real acting leader pays', () => {
    const state = initial(),
      cmd = exitCommand(state);
    const result = accepted(run(state, relations(), cmd, [notice(state, cmd)], true));
    const crisisState = withLoadedConditions(result.next, { leader: ['critical-bleed'] }, 'crisis');
    const succession = command(crisisState, 'ResolveLeadership', {
      companyId: 'company',
      crisisId: 'crisis',
      candidateId: 'worker-1',
      mode: 'ACTING',
    });
    const changed = prepared(
      prepareCompanyEconomy(
        crisisState,
        succession,
        context(
          crisisState,
          succession,
          [],
          [
            {
              ...scope(crisisState, 'crisis'),
              kind: 'CRISIS',
              leaderId: 'leader',
              reason: 'LEADER_UNAVAILABLE',
            },
          ],
        ),
      ),
    ).next;
    const social = recordDirectedRelation(result.social, {
      sourceEventId: 'new-leader-contact',
      fromId: 'worker-0',
      toId: 'worker-1',
      base: { friendship: 40, respect: 70, fear: 0, rivalry: 0 },
    }).state;
    const gift = giftCommand(changed);
    const resolved = accepted(run(changed, social, gift, [notice(changed, gift)], true));
    expect(resolved.social.chronicle.at(-1)!.otherId).toBe('leader');
    expect(
      deriveEffectiveRelation(resolved.social, 'worker-0', 'worker-1', '30500')!.respect,
    ).toEqual({ numerator: '70', denominator: '1' });
    expect(resolved.next.lifecycle.company!.actingLeaderId).toBe('worker-1');
    expect(run(resolved.next, resolved.social, cmd, [], true)).toMatchObject({
      kind: 'PREPARED',
      replayed: true,
      receipt: result.receipt,
      social: resolved.social,
    });
  });

  it('allows an original former member report, but rejects a genuinely later recruit', () => {
    const original = initial(),
      exit = exitCommand(original);
    const first = accepted(run(original, relations(), exit, [], true));
    const leave = command(first.next, 'RequestDeparture', {
      membershipId: 'service-worker-1',
      reason: 'DISMISSED',
      causeId: 'other-exit',
      acknowledgedQuoteRevision: first.next.lifecycle.knowledge.revision,
    });
    const requested = prepared(
      prepareCompanyEconomy(first.next, leave, context(first.next, leave)),
    ).next;
    const nextExit = command(
      requested,
      'ExecuteDeparture',
      {
        membershipId: 'service-worker-1',
        returnContainerId: 'fixture-supply',
        intentId: requested.finance.departures.find((d) => d.membershipId === 'service-worker-1')!
          .intentId,
      },
      'second-exit',
      'SYSTEM',
    );
    const former = prepared(
      prepareCompanyEconomy(requested, nextExit, context(requested, nextExit, [access(requested)])),
    ).next;
    const report = command(
      former,
      'AdvanceCampaign',
      { toTick: former.finance.processedTick, authoritativeInputs: [] },
      'former-report',
      'SYSTEM',
    );
    const informed = accepted(
      run(former, first.social, report, [notice(former, exit, 'worker-1')]),
    );
    expect(informed.social.chronicle[0]!.personId).toBe('worker-1');
    const state = informed.next;
    const recruit = command(state, 'Recruit', {
      companyId: 'company',
      characterId: 'provider',
      offerId: 'later-offer',
      offerRevision: '1',
      basis: 'PAID',
      poolId: 'local',
    });
    const hired = prepared(
      prepareCompanyEconomy(
        state,
        recruit,
        context(
          state,
          recruit,
          [
            {
              ...scope(state, 'terms'),
              kind: 'SERVICE_TERMS',
              characterId: 'provider',
              poolId: 'local',
              recipient: { kind: 'CHARACTER', id: 'provider' },
              signingWalletId: 'wallet-provider',
              rates: COMPANY_RULES.economy.qualificationBands.map((b) => ({
                minimumLevel: b.level,
                dailyWageMilli: String(b.multiplierBps),
              })),
            },
          ],
          [
            {
              ...scope(state, 'later-offer'),
              kind: 'RECRUIT',
              characterId: 'provider',
              basis: 'PAID',
              offerRevision: '1',
              expiresAt: tick(31000),
              signingQ: cash(0),
              dailyWageMilli: '10000',
              itemIds: [],
            },
          ],
        ),
      ),
    ).next;
    expect(
      hired.lifecycle.memberships.some((m) => m.characterId === 'provider' && m.endedAt === null),
    ).toBe(true);
    const later = command(
      hired,
      'AdvanceCampaign',
      { toTick: hired.finance.processedTick, authoritativeInputs: [] },
      'later-report',
      'SYSTEM',
    );
    expect(run(hired, informed.social, later, [notice(hired, exit, 'provider')])).toMatchObject({
      kind: 'REJECTED',
      state: hired,
      social: informed.social,
    });
  });

  it('keeps a late farewell remedy and rehire on the original and new memberships', () => {
    const start = economy([1n, 1n], 0n, 30000);
    const fundedStart = {
      ...start,
      finance: {
        ...start.finance,
        wallets: [
          ...start.finance.wallets,
          {
            walletId: 'reserve-purse',
            owner: { kind: 'COMPANY' as const, id: 'company' },
            location: start.finance.wallets[0]!.location,
            cashQ: cash(10000),
          },
        ],
        pools: [...start.finance.pools, { poolId: 'reserve', walletId: 'reserve-purse' }],
      },
    };
    const advanced = advance(fundedStart, 30500).next;
    const original = observation(advanced, 'worker-0', [access(advanced)]).result.next;
    const pending = requestExit(original);
    const exit = exitCommand(pending);
    const left = accepted(run(pending, relations(), exit, [notice(pending, exit, 'worker-1')]));
    const restored = reload({ state: left.next, social: left.social });
    const originalOutcome = left.receipt.farewellOutcome!;
    const oldClaim = restored.state.finance.claims.find(
      (claim) => claim.membershipId === serviceId,
    )!;
    expect(originalOutcome.givenQ).toBe('0');
    expect(oldClaim).toMatchObject({ membershipId: serviceId, paidQ: '0' });
    expect(BigInt(oldClaim.reportedQ)).toBeGreaterThan(0n);

    expect(restored.social.chronicle[0]).toMatchObject({
      factType: 'VeteranDismissedNoFarewell',
      personId: 'worker-1',
      otherId: 'leader',
      happenedAt: '30500',
    });
    expect(
      deriveEffectiveRelation(restored.social, 'worker-1', 'leader', '30500')!.respect,
    ).toEqual({
      numerator: '15',
      denominator: '1',
    });

    const outstanding =
      BigInt(oldClaim.reportedQ) - BigInt(oldClaim.reportedCoveredQ) - BigInt(oldClaim.paidQ);
    const requiredGift = BigInt(originalOutcome.recognitionQ) - BigInt(originalOutcome.givenQ);
    const transferAmount = outstanding + requiredGift;
    const accessToBothPools = { ...access(restored.state), poolIds: ['local', 'reserve'] };
    const transfer = command(restored.state, 'TransferFunds', {
      fromPoolId: 'reserve',
      toPoolId: 'local',
      amountQ: transferAmount.toString(),
      accessEvidenceId: accessToBothPools.id,
    });
    const funded = prepared(
      prepareCompanyEconomy(
        restored.state,
        transfer,
        context(restored.state, transfer, [accessToBothPools]),
      ),
    );
    const payOldClaim = command(funded.next, 'PayClaims', {
      poolId: 'local',
      amountQ: outstanding.toString(),
      claimIds: [],
      mode: 'TARGETED',
      payeeId: 'worker-0',
    });
    const paid = prepared(
      prepareCompanyEconomy(
        funded.next,
        payOldClaim,
        context(funded.next, payOldClaim, [access(funded.next)]),
      ),
    );
    const paidOldClaim = paid.next.finance.claims.find(
      (claim) => claim.claimId === oldClaim.claimId,
    )!;
    expect(paidOldClaim).toMatchObject({ membershipId: serviceId, paidQ: oldClaim.reportedQ });
    expect(paid.receipt.allocations).toContainEqual(
      expect.objectContaining({ claimId: oldClaim.claimId, amountQ: outstanding.toString() }),
    );
    expect(
      paid.next.finance.movements
        .slice(funded.next.finance.movements.length)
        .map((movement) => [movement.purpose, movement.amountQ]),
    ).toEqual([['WAGE', outstanding.toString()]]);
    expect(paid.next.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe(
      requiredGift.toString(),
    );
    expect(
      paid.next.finance.wallets.find((wallet) => wallet.walletId === 'wallet-worker-0')?.cashQ,
    ).toBe(outstanding.toString());
    const priorClaims = paid.next.finance.claims.filter(
      (claim) => claim.membershipId === serviceId,
    );

    const firstGiftAmount = requiredGift / 2n;
    const secondGiftAmount = requiredGift - firstGiftAmount;
    const partialGift = giftCommand(paid.next, firstGiftAmount.toString());
    const partial = accepted(
      run(
        paid.next,
        restored.social,
        partialGift,
        [notice(paid.next, partialGift, 'worker-1')],
        true,
      ),
    );
    const latePayment = giftCommand(partial.next, secondGiftAmount.toString());
    const compensated = accepted(
      run(
        partial.next,
        partial.social,
        latePayment,
        [notice(partial.next, latePayment, 'worker-1')],
        true,
      ),
    );
    expect(compensated.next.finance.farewells.map((gift) => gift.membershipId)).toEqual([
      serviceId,
      serviceId,
    ]);
    expect(compensated.social.chronicle[0]).toEqual(restored.social.chronicle[0]);
    expect(compensated.social.chronicle[1]).toMatchObject({
      factType: 'VeteranFarewellCompensated',
      personId: 'worker-1',
      happenedAt: '30500',
    });
    expect(
      deriveEffectiveRelation(compensated.social, 'worker-1', 'leader', '30500')!.respect,
    ).toEqual({
      numerator: '20',
      denominator: '1',
    });

    const state = compensated.next;
    const recruit = command(state, 'Recruit', {
      companyId: 'company',
      characterId: 'worker-0',
      offerId: 'rehire-offer',
      offerRevision: '1',
      basis: 'PAID',
      poolId: 'local',
    });
    const terms = {
      ...scope(state, 'rehire-terms'),
      kind: 'SERVICE_TERMS' as const,
      characterId: 'worker-0',
      poolId: 'local',
      recipient: { kind: 'CHARACTER' as const, id: 'worker-0' },
      signingWalletId: 'wallet-worker-0',
      rates: COMPANY_RULES.economy.qualificationBands.map((band) => ({
        minimumLevel: band.level,
        dailyWageMilli: String(band.multiplierBps),
      })),
    };
    const offer = {
      ...scope(state, 'rehire-offer'),
      kind: 'RECRUIT' as const,
      characterId: 'worker-0',
      basis: 'PAID' as const,
      offerRevision: '1',
      expiresAt: tick(31000),
      signingQ: cash(0),
      dailyWageMilli: '10000',
      itemIds: [],
    };
    const beforeRecruit = reload({ state, social: compensated.social });
    const rehired = prepareCompanyEconomy(
      state,
      recruit,
      context(state, recruit, [terms], [offer]),
    );
    expect(rehired).toMatchObject({ kind: 'PREPARED' });
    if (rehired.kind !== 'PREPARED') throw new Error(rehired.error);
    const newMembership = rehired.next.lifecycle.memberships.find(
      (membership) => membership.characterId === 'worker-0' && membership.endedAt === null,
    )!;
    expect(newMembership.membershipId).not.toBe(serviceId);
    expect(newMembership.startedAt).toBe('30500');
    expect(newMembership.wageScheduleId).not.toBeNull();
    expect(rehired.next.finance.claims.filter((claim) => claim.membershipId === serviceId)).toEqual(
      priorClaims,
    );
    expect(rehired.next.finance.farewells).toEqual(compensated.next.finance.farewells);
    expect(rehired.next.finance.farewells.every((gift) => gift.membershipId === serviceId)).toBe(
      true,
    );
    expect(
      rehired.next.finance.farewells.filter(
        (gift) => gift.membershipId === newMembership.membershipId,
      ),
    ).toEqual([]);
    expect(reload(rehired.next).finance.farewells).toEqual(rehired.next.finance.farewells);
    expect(reload(compensated.social).chronicle).toEqual(compensated.social.chronicle);
    const invalid = {
      ...recruit,
      payload: { ...(recruit.payload as object), offerId: 'missing-offer' },
    };
    const rejected = prepareCompanyEconomy(
      state,
      invalid,
      context(state, invalid, [terms], [offer]),
    );
    expect(rejected).toMatchObject({ kind: 'REJECTED', state, error: 'INVALID_SOURCE' });
    if (rejected.kind !== 'REJECTED') throw new Error('expected invalid rehire offer');
    expect(rejected.state).toBe(state);
    expect({ state, social: compensated.social }).toEqual(beforeRecruit);
  });

  it('paired private histories stay undisclosed, and authentication precedes private receipt access', () => {
    const state = initial(),
      social = relations(),
      cmd = exitCommand(state);
    const actual = accepted(run(state, social, cmd, [], true));
    const legacy = reload(actual.next);
    for (const r of legacy.finance.applied) Reflect.deleteProperty(r, 'farewellOutcome');
    expect(projectCompanyEconomy(actual.next, 'company')).toEqual(
      projectCompanyEconomy(legacy, 'company'),
    );
    expect(actual.social).toBe(social);
    const secret = {
      ...actual.next,
      get finance(): CompanyEconomyState['finance'] {
        throw new Error('private receipt read');
      },
    };
    const denied = prepareCompanyFinancialSocial(
      secret,
      social,
      cmd,
      { ...context(actual.next, cmd), companyId: 'foreign' as typeof state.lifecycle.companyId },
      [],
      [],
      [notice(state, cmd)],
    );
    expect(denied).toMatchObject({ kind: 'REJECTED' });
    expect(denied.state).toBe(secret);
    expect(denied.social).toBe(social);
  });
});
