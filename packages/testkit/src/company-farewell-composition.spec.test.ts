import { describe, expect, it } from 'vitest';
import {
  COMPANY_RULES,
  createSocialState,
  deriveEffectiveRelation,
  prepareCompanyEconomy,
  prepareCompanyFinancialSocial,
  projectCompanyEconomy,
  recordDirectedRelation,
  type CompanyEconomyState,
  type SocialState,
} from '@warwrit/game-core';
import {
  access,
  advance,
  command,
  context,
  economy,
  observation,
  prepared,
  scope,
  tick,
  cash,
} from './company-economy-fixture.js';
import { exitCommand, reload, requestExit, serviceId } from './company-farewell-fixture.js';
import { withLoadedConditions } from './company-physical-fixture.js';

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
function giftCommand(state: CompanyEconomyState) {
  return command(state, 'GrantFarewell', {
    membershipId: serviceId,
    quoteRevision: state.lifecycle.knowledge.revision,
    amountQ: '500',
    poolId: 'local',
  });
}

describe('E04-BIND: one authenticated financial, physical and social preparation', () => {
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
