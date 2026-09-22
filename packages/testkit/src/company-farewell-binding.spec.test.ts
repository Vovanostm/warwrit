import { describe, expect, it } from 'vitest';
import {
  bindFinancialSocialConsequences,
  createSocialState,
  deriveEffectiveRelation,
  prepareCompanyEconomy,
  recordDirectedRelation,
  recordLearnedFact,
  selectActiveMemories,
  type SocialState,
} from '@warwrit/game-core';
import { advance, context, economy, observation, prepared } from './company-economy-fixture.js';
import { exitCommand, gift, reload, requestExit, serviceId } from './company-farewell-fixture.js';

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
function departed(partial = '0') {
  let state = requestExit(economy([1n, 1n], 100000n, 30000));
  if (partial !== '0') state = gift(state, partial).next;
  const cmd = exitCommand(state);
  return prepared(prepareCompanyEconomy(state, cmd, context(state, cmd)));
}
type Notice = NonNullable<Parameters<typeof bindFinancialSocialConsequences>[3]>[number];
function notice(result: ReturnType<typeof departed>, personId = 'worker-0'): Notice {
  return {
    worldId: result.next.lifecycle.worldId,
    companyId: result.next.lifecycle.companyId,
    membershipId: serviceId,
    personId,
    sourceCommandId: result.receipt.commandId,
    sourceEventId: JSON.parse(result.receipt.requestKey).sourceEventId as string,
    learnedAt: result.next.finance.processedTick,
    channel: 'REPORT' as const,
    salience: 1,
  };
}
const bind = (
  social: SocialState,
  result: ReturnType<typeof departed>,
  notices = [notice(result)],
) => bindFinancialSocialConsequences(social, result, [], notices).social;
const respect = (social: SocialState, at = '30000', who = 'worker-0') =>
  deriveEffectiveRelation(social, who, 'leader', at)!.respect;

// Notices are explicit adapter-verified knowledge fixtures; a cohort alone never creates one.
describe('E04-BIND: authentic farewell source to one observer and one cause', () => {
  it('does nothing without knowledge, on an intent or a legacy save without an outcome', () => {
    const result = departed();
    const social = relations();
    expect(bind(social, result, [])).toBe(social);
    const legacy = reload(result);
    for (const receipt of [...legacy.next.finance.applied, legacy.receipt])
      Reflect.deleteProperty(receipt, 'farewellOutcome');
    expect(bind(social, legacy, [])).toBe(social);
    expect(() => bind(social, legacy)).toThrow('INVALID_SOURCE');
    const pending = requestExit(economy([1n], 100000n, 30000));
    const atIntent = advance(pending, 30000);
    expect(() => bind(social, atIntent)).toThrow('INVALID_SOURCE');
  });

  it('binds the actual final boundary, not an empty gift list, and retains first knowledge', () => {
    const result = departed('500');
    const social = bind(relations(), result);
    expect(result.receipt.farewellOutcome).toMatchObject({ givenQ: '500', recognitionQ: '1000' });
    expect(respect(social)).toEqual({ numerator: '15', denominator: '1' });
    expect(respect(social, '30000', 'worker-1')).toEqual({ numerator: '20', denominator: '1' });
    const later = advance(result.next, 30100);
    const repeated = bind(reload(social), later, [
      { ...notice(result), learnedAt: '30100', channel: 'WITNESS' },
    ]);
    expect(repeated.chronicle).toEqual(social.chronicle);
    expect(repeated.chronicle[0]).toMatchObject({ happenedAt: '30000', learnedAt: '30000' });
    const retry = prepared(
      prepareCompanyEconomy(
        result.next,
        JSON.parse(result.receipt.requestKey),
        context(result.next, JSON.parse(result.receipt.requestKey)),
      ),
    );
    expect(bind(social, retry, [{ ...notice(result), personId: 'forged' }])).toBe(social);
  });

  it('starts decay at first individual knowledge and never penalizes adequate original gifts', () => {
    const result = departed();
    const later = advance(result.next, 30100);
    const learned = bind(relations(), later, [{ ...notice(result), learnedAt: '30100' }]);
    expect(learned.chronicle[0]).toMatchObject({ happenedAt: '30000', learnedAt: '30100' });
    expect(respect(learned, '30099')).toEqual({ numerator: '20', denominator: '1' });
    expect(respect(learned, '30100')).toEqual({ numerator: '15', denominator: '1' });
    for (const given of ['1000', '1001']) {
      const social = relations();
      expect(bind(social, departed(given))).toBe(social);
    }
  });

  it('same-tick separately accepted top-ups remedy only the original observer cause', () => {
    const result = departed('500');
    const social = bind(relations(), result);
    const partial = gift(result.next, '499');
    expect(bind(social, partial)).toBe(social);
    const sufficient = gift(partial.next, '1');
    const compensated = bind(social, sufficient);
    expect(respect(compensated)).toEqual({ numerator: '20', denominator: '1' });
    expect(compensated.chronicle[0]).toEqual(social.chronicle[0]);
    expect(compensated.chronicle[1]).toMatchObject({
      factType: 'VeteranFarewellCompensated',
      happenedAt: '30000',
      resolvedFarewell: { factId: result.receipt.farewellOutcome!.factId, happenedAt: '30000' },
    });
    expect(compensated.relations).toEqual(social.relations);
    expect(sufficient.next.finance.farewells.map((g) => g.amountQ)).toEqual(['500', '499', '1']);
    const later = gift(sufficient.next, '1');
    expect(bind(reload(compensated), later).chronicle).toEqual(compensated.chronicle);
  });

  it('does not charge a late historical grievance after lawful remedy knowledge', () => {
    const result = departed();
    const sufficient = gift(result.next, '1000');
    const remedied = bind(relations(), sufficient);
    const later = advance(sufficient.next, 30100);
    const learned = bind(remedied, later, [{ ...notice(result), learnedAt: '30100' }]);
    expect(learned.chronicle.map((f) => f.factType)).toEqual([
      'VeteranFarewellCompensated',
      'VeteranDismissedNoFarewell',
    ]);
    expect(selectActiveMemories(reload(learned), 'worker-0', '30100')).toEqual([]);
    expect(respect(learned, '30100')).toEqual({ numerator: '20', denominator: '1' });
  });

  it('resolves displaced or decayed causes through JSON without cancelling another grievance', () => {
    const result = departed();
    let social = bind(relations(), result);
    const original = social.chronicle[0]!;
    for (let i = 0; i < 8; i++)
      social = recordLearnedFact(social, {
        ...original,
        memoryId: `other-${i}`,
        factId: `other-${i}`,
        factType: 'WageDelayed',
        salience: 2,
        decayTicks: '100',
      }).state;
    const sufficient = gift(result.next, '1000');
    const remedied = bind(reload(social), sufficient);
    expect(selectActiveMemories(remedied, 'worker-0', '30000')).toHaveLength(8);
    expect(selectActiveMemories(reload(remedied), 'worker-0', '30101')).toEqual([]);
    expect(remedied.chronicle.slice(0, social.chronicle.length)).toEqual(social.chronicle);
    for (const at of [45000, 60000]) {
      const advanced = advance(result.next, at);
      const informed = observation(advanced.next, 'worker-0').result.next;
      const lateGift = gift(informed, '1000');
      const resolved = bind(bind(relations(), result), lateGift);
      expect(respect(resolved, String(at))).toEqual({ numerator: '20', denominator: '1' });
    }
  });

  it('rejects foreign, outsider, forged and incomplete sources without partial candidates', () => {
    const result = departed();
    const social = relations();
    const original = reload({ result, social });
    for (const patch of [
      { worldId: 'foreign' },
      { companyId: 'foreign' },
      { personId: 'leader' },
      { personId: 'provider' },
      { membershipId: 'service-worker-1' },
      { sourceEventId: 'forged' },
      { sourceCommandId: 'absent' },
      { learnedAt: '29999' },
      { learnedAt: '30001' },
    ])
      expect(() =>
        bind(social, result, [notice(result), { ...notice(result), ...patch }]),
      ).toThrow();
    const sufficient = gift(result.next, '1000');
    const corrupt = reload(sufficient);
    Object.assign(corrupt.next.finance, { farewells: [] });
    expect(() => bind(social, corrupt)).toThrow('INVALID_SOURCE');
    const malformed = reload(sufficient);
    for (const r of [malformed.receipt, malformed.next.finance.applied.at(-1)!])
      Object.assign(r, { requestKey: 'not JSON' });
    expect(() => bind(social, malformed, [notice(sufficient)])).toThrow('INVALID_SOURCE');
    const contradiction = reload(bind(social, result));
    Object.assign(contradiction.chronicle[0]!.emotionalDelta, { respect: 5 });
    expect(() => bind(contradiction, result)).toThrow('IDEMPOTENCY_CONFLICT');
    const altered = reload(result);
    Object.assign(altered.next.finance.applied.at(-1)!.farewellOutcome!, { givenQ: '1' });
    expect(() => bind(social, altered)).toThrow('INVALID_SOURCE');
    expect({ result, social }).toEqual(original);
  });
});
