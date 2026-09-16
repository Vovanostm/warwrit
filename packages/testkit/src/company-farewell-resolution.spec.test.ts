import { describe, expect, it } from 'vitest';
import {
  createSocialState,
  deriveEffectiveRelation,
  recordDirectedRelation,
  recordLearnedFact,
  selectActiveMemories,
} from '@warwrit/game-core';

const zero = { friendship: 0, rivalry: 0, fear: 0, respect: 0 };
const grievance = {
  memoryId: 'dismissal-memory',
  factId: 'completed-separation',
  sourceEventId: 'actual-exit',
  personId: 'veteran',
  otherId: 'original-leader',
  happenedAt: '100',
  learnedAt: '100',
  factType: 'VeteranDismissedNoFarewell',
  channel: 'EXPERIENCE' as const,
  emotionalDelta: { ...zero, respect: -5 },
  decayTicks: '30000',
  salience: 1,
};
const remedy = {
  ...grievance,
  memoryId: 'remedy-memory',
  factId: 'funded-recognition',
  sourceEventId: 'actual-payment-report',
  happenedAt: '15100',
  learnedAt: '16100',
  factType: 'VeteranFarewellCompensated',
  channel: 'REPORT' as const,
  emotionalDelta: zero,
  decayTicks: '0',
  resolvedFarewell: { factId: grievance.factId, happenedAt: grievance.happenedAt },
};
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function initial(respect = 20) {
  return recordDirectedRelation(createSocialState(), {
    sourceEventId: 'actual-personal-contact',
    fromId: grievance.personId,
    toId: grievance.otherId,
    base: { ...zero, respect },
  }).state;
}
const respectAt = (state: ReturnType<typeof initial>, at: string, person = grievance.personId) =>
  deriveEffectiveRelation(state, person, grievance.otherId, at)!.respect;

describe('E04: cause-specific farewell resolution preserves knowledge and history', () => {
  it('stops only the remaining original cause, not a fixed positive refund', () => {
    const before = recordLearnedFact(initial(), grievance).state;
    expect(respectAt(before, '15100')).toEqual({ numerator: '35', denominator: '2' });
    const after = recordLearnedFact(before, remedy).state;
    // Factual payment precedes its report. No inferred knowledge and no historical rewrite.
    expect(respectAt(after, '15100')).toEqual(respectAt(before, '15100'));
    expect(respectAt(after, '16099')).toEqual(respectAt(before, '16099'));
    expect(respectAt(after, '16100')).toEqual({ numerator: '20', denominator: '1' });
    expect(after.chronicle[0]).toEqual(grievance);
    expect(after.relations).toEqual(before.relations);
    expect(selectActiveMemories(after, grievance.personId, '16100')).toEqual([]);
    const snapshot = reload(after);
    const repeated = recordLearnedFact(snapshot, {
      ...remedy,
      learnedAt: '17000',
      sourceEventId: 'another-report',
      channel: 'WITNESS',
    });
    expect(repeated.replayed).toBe(true);
    expect(repeated.value).toEqual(remedy);
    expect(repeated.state).toBe(snapshot);
    expect(respectAt(snapshot, '40000')).toEqual({ numerator: '20', denominator: '1' });
  });

  it('does not transfer knowledge, erase other causes, or inherit another leader', () => {
    let state = recordLearnedFact(initial(), grievance).state;
    state = recordLearnedFact(state, {
      ...grievance,
      memoryId: 'other-memory',
      factId: 'different-cause',
      factType: 'WageDelayed',
      emotionalDelta: { ...zero, respect: -4 },
    }).state;
    state = recordLearnedFact(state, {
      ...grievance,
      memoryId: 'colleague-memory',
      personId: 'colleague',
    }).state;
    state = recordDirectedRelation(state, {
      sourceEventId: 'new-leader-contact',
      fromId: 'veteran',
      toId: 'new-leader',
      base: { ...zero, respect: 70 },
    }).state;
    const before = reload(state);
    const after = recordLearnedFact(state, remedy).state;
    expect(selectActiveMemories(after, 'veteran', '16100').map((m) => m.factId)).toEqual([
      'different-cause',
    ]);
    expect(selectActiveMemories(after, 'colleague', '16100').map((m) => m.factId)).toEqual([
      grievance.factId,
    ]);
    expect(respectAt(after, '16100', 'colleague')).toEqual(respectAt(before, '16100', 'colleague'));
    expect(deriveEffectiveRelation(after, 'veteran', 'new-leader', '16100')!.respect).toEqual({
      numerator: '70',
      denominator: '1',
    });
    expect(state).toEqual(before);
  });

  it('permits remedy knowledge first without charging a transient late grievance', () => {
    const knownRemedy = recordLearnedFact(initial(), remedy).state;
    const learnedLater = recordLearnedFact(knownRemedy, {
      ...grievance,
      learnedAt: '17000',
      channel: 'REPORT',
    }).state;
    expect(learnedLater.chronicle.map((m) => m.factId)).toEqual([remedy.factId, grievance.factId]);
    expect(respectAt(reload(learnedLater), '17000')).toEqual({ numerator: '20', denominator: '1' });
    expect(selectActiveMemories(learnedLater, 'veteran', '17000')).toEqual([]);
    for (const changed of [
      { ...grievance, otherId: 'another-leader' },
      { ...grievance, happenedAt: '99' },
      { ...grievance, factType: 'Unrelated' },
    ])
      expect(() => recordLearnedFact(knownRemedy, changed)).toThrow('FACT_CONFLICT');
  });

  it('does not resurrect an evicted cause or reward clamped and expired contributions', () => {
    for (const base of [0, 2, 100]) {
      let state = recordLearnedFact(initial(base), grievance).state;
      for (let index = 0; index < 8; index++)
        state = recordLearnedFact(state, {
          ...grievance,
          memoryId: `brief-${index}`,
          factId: `brief-${index}`,
          factType: 'BriefCause',
          emotionalDelta: zero,
          decayTicks: '20000',
          salience: 2,
        }).state;
      const resolved = recordLearnedFact(state, remedy).state;
      expect(selectActiveMemories(resolved, 'veteran', '20101')).toEqual([]);
      expect(respectAt(resolved, '20101')).toEqual({ numerator: String(base), denominator: '1' });
      const late = recordLearnedFact(state, {
        ...remedy,
        happenedAt: '40100',
        learnedAt: '40100',
      }).state;
      expect(respectAt(late, '40100')).toEqual(respectAt(state, '40100'));
      expect(resolved.chronicle).toHaveLength(state.chronicle.length + 1);
    }
  });

  it('rejects contradictory remedies atomically and owns accepted JSON evidence', () => {
    const state = recordLearnedFact(initial(), grievance).state;
    const snapshot = reload(state);
    for (const bad of [
      { ...remedy, emotionalDelta: { ...zero, respect: 5 } },
      { ...remedy, decayTicks: '30000' },
      { ...remedy, otherId: 'wrong-leader' },
      { ...remedy, factType: 'WageRemedy' },
      { ...remedy, happenedAt: '99' },
      { ...remedy, resolvedFarewell: { factId: grievance.factId, happenedAt: '99' } },
      { ...remedy, resolvedFarewell: undefined },
    ]) {
      expect(() => recordLearnedFact(state, bad)).toThrow();
      expect(state).toEqual(snapshot);
    }
    const evidence = reload(remedy);
    const accepted = recordLearnedFact(state, evidence);
    evidence.resolvedFarewell.factId = 'changed-after-admission';
    expect(accepted.value).toEqual(remedy);
    const corrupt = reload(accepted.state);
    Object.assign(corrupt.chronicle[1]!, { emotionalDelta: { ...zero, respect: 5 } });
    expect(() => respectAt(corrupt, '16100')).toThrow('INVALID_SOURCE');
    expect(() =>
      recordLearnedFact(accepted.state, {
        ...remedy,
        resolvedFarewell: { factId: 'another-case', happenedAt: '100' },
      }),
    ).toThrow('FACT_CONFLICT');
    const legacyRemedy = { ...remedy };
    Reflect.deleteProperty(legacyRemedy, 'resolvedFarewell');
    const legacy = recordLearnedFact(state, legacyRemedy).state;
    expect(respectAt(legacy, '16100')).toEqual(respectAt(state, '16100'));
    // Legacy records have no new field and retain byte-equivalent JSON on replay.
    expect(recordLearnedFact(state, grievance).value).toEqual(snapshot.chronicle[0]);
  });
});
