import { describe, expect, it } from 'vitest';
import {
  bindFinancialSocialConsequences,
  createSocialState,
  entityId,
  COMPANY_RULES,
  prepareCompanyFinancialSocial,
  recordLearnedFact,
  deriveEffectiveRelation,
  prepareCompanyEconomy,
  recordDirectedRelation,
} from '@warwrit/game-core';
import type { CompanyEconomyState, SocialState } from '@warwrit/game-core';
import {
  access,
  advance,
  claims,
  command,
  context,
  economy,
  observation,
  pay,
  prepared,
  scope,
} from './company-economy-fixture.js';

import { withLoadedConditions } from './company-physical-fixture.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const knowledge = [
  {
    sourceEventId: 'source-talk',
    personId: 'worker-0',
    channel: 'EXPERIENCE' as const,
    salience: 1,
  },
];
function relations(friendship = 0, respect = 41, rivalry = 0) {
  return recordDirectedRelation(createSocialState(), {
    sourceEventId: 'actual-first-contact',
    fromId: 'worker-0',
    toId: 'leader',
    base: { friendship, respect, fear: 0, rivalry },
  }).state;
}
function faded(axis: 'friendship' | 'rivalry', delta: number) {
  const threshold = COMPANY_RULES.economy.warningRelationThreshold + delta;
  return recordLearnedFact(
    relations(axis === 'friendship' ? threshold : 0, 0, axis === 'rivalry' ? threshold : 0),
    {
      memoryId: 'known-deed',
      factId: 'known-deed',
      sourceEventId: 'known-report',
      personId: 'worker-0',
      otherId: 'leader',
      happenedAt: '0',
      learnedAt: '0',
      factType: 'KnownDeed',
      channel: 'REPORT',
      salience: 1,
      decayTicks: '1000000000000000000000000000003',
      emotionalDelta: {
        friendship: 0,
        respect: 0,
        fear: 0,
        rivalry: 0,
        [axis]: delta === 0 ? 0 : -delta,
      },
    },
  ).state;
}
function talk(
  state: CompanyEconomyState,
  social: SocialState,
  at = 3000,
  id = 'talk',
  leaderId = 'leader',
) {
  state = advance(state, at).next;
  const cmd = command(
    state,
    'AdvanceCampaign',
    { toTick: String(at), authoritativeInputs: [id] },
    id,
    'SYSTEM',
  );
  const fact = {
    ...scope(state, id),
    kind: 'WAGE_COMMUNICATION' as const,
    membershipId: 'service-worker-0',
    leaderId,
  };
  const result = prepareCompanyFinancialSocial(
    state,
    social,
    cmd,
    context(state, cmd),
    [fact],
    [{ ...knowledge[0]!, sourceEventId: fact.sourceEventId }],
  );
  if (result.kind === 'REJECTED') throw new Error(result.error);
  return { state, cmd, fact, result };
}

describe('E04: actual financial knowledge, not an emotional delta per enum', () => {
  it('delayed communication gives one episode penalty; retry, another channel and later warnings retain the first knowledge', () => {
    const original = claims(economy([1n], 100000n), [100n]);
    const social = relations();
    const absent = advance(original, 3000);
    expect(bindFinancialSocialConsequences(social, absent, []).social).toBe(social);
    const notified = talk(original, social);
    const before = reload({ social, notified });
    const bound = bindFinancialSocialConsequences(social, notified.result, knowledge);
    expect(
      notified.result.receipt.requirements.map((r) =>
        r.kind === 'INFORMED_SOCIAL_CONTRIBUTION' ? r.cause : r.kind,
      ),
    ).toEqual(['WAGE_COMPLAINT', 'FINAL_WARNING']);
    expect(bound.social.chronicle).toHaveLength(1);
    expect(bound.social.chronicle[0]).toMatchObject({
      personId: 'worker-0',
      otherId: 'leader',
      happenedAt: '1000',
      learnedAt: '3000',
      factType: 'WageDelayed',
      emotionalDelta: { friendship: 0, fear: 0, rivalry: 0, respect: -4 },
    });
    expect(deriveEffectiveRelation(bound.social, 'worker-0', 'leader', '2999')).toEqual(
      deriveEffectiveRelation(social, 'worker-0', 'leader', '2999'),
    );
    expect(bound.economy).toBe(notified.result.next);
    expect(bound.requirements).toEqual([]);
    const restored = reload(bound);
    const retry = prepared(
      prepareCompanyFinancialSocial(
        restored.economy,
        restored.social,
        notified.cmd,
        context(restored.economy, notified.cmd),
      ),
    );
    expect(retry.replayed).toBe(true);
    expect(bindFinancialSocialConsequences(restored.social, retry, []).social).toBe(
      restored.social,
    );
    expect(
      bindFinancialSocialConsequences(restored.social, retry, [
        { ...knowledge[0]!, channel: 'REPORT' },
      ]).social,
    ).toBe(restored.social);
    const later = talk(restored.economy, restored.social, 3000, 'another-channel');
    expect(bindFinancialSocialConsequences(restored.social, later.result, []).social).toBe(
      restored.social,
    );
    const warning = restored.economy.finance.arrears[0]!.warning;
    const partial = pay(later.result.next, 50n).next;
    const expired = advance(reload(partial), Number(warning!.deadline)).next;
    expect(expired.finance.arrears[0]!.warning).toEqual(warning);
    expect(expired.finance.departures[0]).toMatchObject({
      reason: 'WAGE_BREACH',
      requestedAt: warning!.deadline,
    });
    const informed = observation(expired, 'worker-0', [access(expired)]).result.next;
    const owed = informed.finance.claims.reduce(
      (n, c) => n + BigInt(c.reportedQ) - BigInt(c.reportedCoveredQ) - BigInt(c.paidQ),
      0n,
    );
    const paid = pay(informed, owed).next;
    expect(paid.finance.departures[0]!.cancelledAt).toBe(warning!.deadline);
    expect(paid.finance.arrears[0]!.warning).toEqual(warning);
    expect({ social, notified }).toEqual(before);
  });

  it('missing, foreign or contradictory knowledge rejects the whole candidate without a partially appended chronicle', () => {
    const social = relations();
    const notified = talk(claims(economy([1n]), [100n]), social);
    const frozen = reload({ social, result: notified.result });
    for (const input of [[], [{ ...knowledge[0]!, personId: 'leader' }]])
      expect(() => bindFinancialSocialConsequences(social, notified.result, input)).toThrow(
        'INVALID_SOURCE',
      );
    for (const fault of [
      'missing-source',
      'foreign-source',
      'wrong-late-warning',
      'legacy',
      'invalid-axis',
    ]) {
      const input = reload(notified.result);
      // Corrupt isolated loaded snapshots, never the actual prepared candidate.
      if (fault === 'missing-source') Object.assign(input.next.finance, { sourceEffects: [] });
      if (fault === 'foreign-source') {
        const entry = input.next.finance.sourceEffects[0]!;
        Object.assign(entry, {
          requestKey: entry.requestKey.replace('"world"', '"foreign-world"'),
        });
      }
      if (fault === 'wrong-late-warning')
        Object.assign(input.next.finance.arrears[0]!.warning!, { sourceId: 'wrong' });
      if (fault === 'legacy')
        for (const receipt of [input.receipt, ...input.next.finance.applied])
          for (const r of receipt.requirements) Reflect.deleteProperty(r, 'communicationSourceId');
      if (fault === 'invalid-axis') {
        Object.assign(input.next.finance.arrears[0]!.warning!.relation, {
          friend: { numerator: '40', denominator: '0' },
        });
        expect(() => advance(input.next, 3000)).toThrow('INVALID_STATE');
      }
      const snapshot = reload(input);
      expect(() => bindFinancialSocialConsequences(social, input, knowledge)).toThrow();
      expect(input).toEqual(snapshot);
    }
    const known = reload(
      bindFinancialSocialConsequences(social, notified.result, knowledge).social,
    );
    Object.assign(known.chronicle[0]!, { sourceEventId: 'other-episode' });
    expect(() => bindFinancialSocialConsequences(known, notified.result, knowledge)).toThrow(
      'IDEMPOTENCY_CONFLICT',
    );
    expect({ social, result: notified.result }).toEqual(frozen);
    const { state, cmd, fact } = notified;
    const attempt = (request = cmd, evidence = fact, known = knowledge, contacts = ['worker-0']) =>
      prepareCompanyFinancialSocial(
        state,
        social,
        request,
        { ...context(state, request), contactIds: contacts },
        [evidence],
        known,
      );
    const future = { ...cmd, payload: { toTick: '3001', authoritativeInputs: ['talk'] } };
    for (const rejected of [
      attempt(cmd, fact, []),
      attempt(cmd, fact, [{ ...knowledge[0]!, personId: 'leader' }]),
      attempt(cmd, fact, knowledge, []),
      attempt(cmd, { ...fact, worldId: entityId('foreign-world') }),
      attempt(future),
    ]) {
      expect(rejected.kind).toBe('REJECTED');
      expect(rejected.state).toBe(state);
      expect(rejected.social).toBe(social);
    }
    expect({ social, result: notified.result }).toEqual(frozen);
  });

  it.each(['friendship', 'rivalry'] as const)(
    'exact %s boundaries survive decay and reload',
    (axis) => {
      for (const delta of [-1, 0, 1]) {
        const { result } = talk(claims(economy([1n], 100000n), [100n]), faded(axis, delta));
        const rules = COMPANY_RULES.economy;
        const adjustment =
          delta < 0
            ? 0n
            : BigInt(rules.warningRelationAdjustmentTicks) * (axis === 'friendship' ? 1n : -1n);
        expect(result.next.finance.arrears[0]!.warning!.deadline).toBe(
          String(3000n + BigInt(rules.warningBaseWindowTicks) + adjustment),
        );
      }
    },
  );

  it('later notices use prior reactions and a real new leader; original warning and retries keep history', () => {
    const first = talk(claims(economy([1n, 1n], 100000n), [100n, 100n]), relations(), 1000);
    const second = talk(first.result.next, first.result.social, 3000, 'warning');
    const warning = second.result.next.finance.arrears[0]!.warning!;
    expect(warning.relation.respect).toEqual({ numerator: '559', denominator: '15' });
    expect(warning.deadline).toBe('5000');
    const state = withLoadedConditions(
      second.result.next,
      { leader: ['critical-bleed'] },
      'crisis',
    );
    const cmd = command(state, 'ResolveLeadership', {
      companyId: 'company',
      crisisId: 'crisis',
      candidateId: 'worker-1',
      mode: 'ACTING',
    });
    const crisis = {
      ...scope(state, 'crisis'),
      kind: 'CRISIS' as const,
      leaderId: 'leader',
      reason: 'LEADER_UNAVAILABLE' as const,
    };
    const ctx = context(state, cmd, [], [crisis]);
    const changed = prepared(prepareCompanyEconomy(state, cmd, ctx)).next;
    const social = recordDirectedRelation(second.result.social, {
      sourceEventId: 'new-contact',
      fromId: 'worker-0',
      toId: 'worker-1',
      base: { friendship: 0, respect: 10, fear: 0, rivalry: 0 },
    }).state;
    const later = talk(changed, social, 3000, 'new-leader', 'worker-1');
    expect(later.result.next.finance.arrears[0]!.warning).toEqual(warning);
    expect(later.result.social.chronicle).toEqual(second.result.social.chronicle);
    expect(() => talk(changed, social)).toThrow();
    const next = reload(later.result.next);
    const retry = prepareCompanyFinancialSocial(next, social, first.cmd, context(next, first.cmd));
    expect(retry).toMatchObject({ kind: 'PREPARED', replayed: true, social });
    const sourceCmd = command(
      next,
      'AdvanceCampaign',
      { toTick: '3000', authoritativeInputs: ['talk'] },
      'old-source',
      'SYSTEM',
    );
    const replay = prepareCompanyFinancialSocial(
      next,
      social,
      sourceCmd,
      context(next, sourceCmd),
      [first.fact],
    );
    expect(replay.kind).toBe('PREPARED');
    expect(replay.social).toBe(social);
  });

  it.each([0, 40, 'below', 'above'] as const)(
    'farewell with friendship %s follows earned pay, without gift farming or an absence penalty',
    (friendship) => {
      const social =
        typeof friendship === 'number'
          ? relations(friendship)
          : faded('friendship', friendship === 'below' ? -1 : 1);
      const warned = talk(claims(economy([1n], 100000n), [100n]), social);
      const bound = bindFinancialSocialConsequences(social, warned.result, knowledge);
      let state = observation(bound.economy, 'worker-0', [access(bound.economy)]).result.next;
      const ask = command(state, 'RequestDeparture', {
        membershipId: 'service-worker-0',
        reason: 'DISMISSED',
        causeId: 'choice',
        acknowledgedQuoteRevision: state.lifecycle.knowledge.revision,
      });
      const dismissal = prepared(prepareCompanyEconomy(state, ask, context(state, ask)));
      expect(bindFinancialSocialConsequences(bound.social, dismissal, []).social).toBe(
        bound.social,
      );
      state = dismissal.next;
      const intent = state.finance.departures.find((d) => d.reason === 'DISMISSED')!;
      function gift(amount: string) {
        const cmd = command(state, 'GrantFarewell', {
          membershipId: 'service-worker-0',
          quoteRevision: state.lifecycle.knowledge.revision,
          amountQ: amount,
          poolId: 'local',
        });
        const ctx = context(state, cmd, [access(state)]);
        const fact = {
          ...scope(state, `farewell-${state.lifecycle.revision}`),
          kind: 'FAREWELL_CONTEXT' as const,
          membershipId: 'service-worker-0',
          leaderId: 'leader',
          departureIntentId: intent.intentId,
        };

        return {
          cmd,
          result: prepareCompanyFinancialSocial(state, bound.social, cmd, ctx, [fact]),
        };
      }
      expect(gift('1').result).toMatchObject({ kind: 'REJECTED', error: 'UNPAID_OBLIGATIONS' });
      const owed = state.finance.claims.reduce(
        (n, c) => n + BigInt(c.reportedQ) - BigInt(c.paidQ),
        0n,
      );
      state = pay(state, owed).next;
      if (friendship === 0 || friendship === 'below') {
        expect(gift('1').result).toMatchObject({ kind: 'REJECTED', error: 'INVALID_ARGUMENT' });
        return;
      }
      for (const amount of ['1', '2']) {
        const sent = gift(amount);
        const candidate = prepared(sent.result);
        expect(bindFinancialSocialConsequences(bound.social, candidate, []).social).toBe(
          bound.social,
        );
        state = reload(candidate.next);
        expect(
          bindFinancialSocialConsequences(
            bound.social,
            prepared(prepareCompanyEconomy(state, sent.cmd, context(state, sent.cmd))),
            [],
          ).social,
        ).toBe(bound.social);
      }
      expect(state.finance.farewells).toHaveLength(2);
      expect(state.finance.arrears[0]!.warning).toEqual(
        warned.result.next.finance.arrears[0]!.warning,
      );
      expect(state.finance.departures.find((d) => d.reason === 'DISMISSED')).toEqual(intent);
      expect(bound.social.chronicle).toHaveLength(social.chronicle.length + 1);
    },
  );
});
