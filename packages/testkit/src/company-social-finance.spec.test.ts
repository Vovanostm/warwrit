import { describe, expect, it } from 'vitest';
import {
  bindFinancialSocialConsequences,
  createSocialState,
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

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const knowledge = [
  {
    sourceEventId: 'source-talk',
    personId: 'worker-0',
    channel: 'EXPERIENCE' as const,
    salience: 1,
  },
];
function relations(friendship = 0, respect = 41) {
  return recordDirectedRelation(createSocialState(), {
    sourceEventId: 'actual-first-contact',
    fromId: 'worker-0',
    toId: 'leader',
    base: { friendship, respect, fear: 0, rivalry: 0 },
  }).state;
}
// This prerequisite consumes real admitted integer contexts. Exact fractional production is E04b.
function relation(social: SocialState, at: string) {
  const r = deriveEffectiveRelation(social, 'worker-0', 'leader', at)!;
  for (const axis of [r.friendship, r.respect, r.rivalry]) expect(axis.denominator).toBe('1');
  return {
    friend: Number(r.friendship.numerator),
    respect: Number(r.respect.numerator),
    rivalry: Number(r.rivalry.numerator),
  };
}
function talk(state: CompanyEconomyState, social: SocialState, at = 3000, id = 'talk') {
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
    leaderId: 'leader',
    relation: relation(social, String(at)),
  };
  return {
    state,
    cmd,
    fact,
    result: prepared(prepareCompanyEconomy(state, cmd, context(state, cmd, [fact]))),
  };
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
      prepareCompanyEconomy(
        restored.economy,
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
    for (const fault of ['missing-source', 'foreign-source', 'wrong-late-warning', 'legacy']) {
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
    const foreign = { ...notified.fact, worldId: 'foreign-world' };
    const rejected = prepareCompanyEconomy(
      notified.state,
      notified.cmd,
      context(notified.state, notified.cmd, [foreign]),
    );
    expect(rejected).toMatchObject({ kind: 'REJECTED', state: notified.state });
  });

  it.each([0, 40])(
    'farewell with friendship %i follows earned pay, without gift farming or an absence penalty',
    (friendship) => {
      const social = relations(friendship);
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
          friendship: relation(bound.social, state.finance.processedTick).friend,
        };

        return {
          cmd,
          result: prepareCompanyEconomy(state, cmd, {
            ...ctx,
            financeFacts: [...ctx.financeFacts, fact],
          }),
        };
      }
      expect(gift('1').result).toMatchObject({ kind: 'REJECTED', error: 'UNPAID_OBLIGATIONS' });
      const owed = state.finance.claims.reduce(
        (n, c) => n + BigInt(c.reportedQ) - BigInt(c.paidQ),
        0n,
      );
      state = pay(state, owed).next;
      if (friendship === 0) {
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
      expect(bound.social.chronicle).toHaveLength(1);
    },
  );
});
