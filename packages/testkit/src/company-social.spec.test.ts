import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  createSocialState,
  deriveEffectiveRelation,
  recordDirectedRelation,
  recordLearnedFact,
  selectActiveMemories,
} from '@warwrit/game-core';

const zero = { friendship: 0, rivalry: 0, fear: 0, respect: 0 };
const rescue = {
  memoryId: 'memory-rescue',
  personId: 'alice',
  otherId: 'bob',
  factId: 'fact-rescue',
  sourceEventId: 'report-rescue',
  happenedAt: '100',
  learnedAt: '130',
  factType: 'rescue',
  channel: 'REPORT' as const,
  emotionalDelta: { friendship: 10, rivalry: 0, fear: 0, respect: 8 },
  decayTicks: '30000',
  salience: 50,
};

function code(work: () => unknown) {
  try {
    work();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'NO_ERROR';
}

describe('E01 — directed relations and genuinely learned facts', () => {
  it('stores only explicitly significant directed pairs', () => {
    const initial = createSocialState();
    const base = { ...zero, respect: 20 };
    const seeded = recordDirectedRelation(initial, {
      sourceEventId: 'origin-contact',
      fromId: 'alice',
      toId: 'bob',
      base,
    });
    base.respect = 99;

    expect(seeded.replayed).toBe(false);
    expect(seeded.state.relations).toEqual([
      {
        fromId: 'alice',
        toId: 'bob',
        base: { ...zero, respect: 20 },
        baseSourceEventId: 'origin-contact',
      },
    ]);
    expect(seeded.value.base.respect).toBe(20);
    expect(seeded.state.relations.some((r) => r.fromId === 'bob' && r.toId === 'alice')).toBe(
      false,
    );
    expect(seeded.state.relations.some((r) => r.fromId === 'alice' && r.toId === 'carol')).toBe(
      false,
    );

    const replay = recordDirectedRelation(seeded.state, {
      sourceEventId: 'origin-contact',
      fromId: 'alice',
      toId: 'bob',
      base: { ...zero, respect: 20 },
    });
    expect(replay).toMatchObject({ state: seeded.state, value: seeded.value, replayed: true });
  });

  it('keeps occurrence and learning time and never grants omniscient knowledge', () => {
    const learned = recordLearnedFact(createSocialState(), rescue);

    expect(learned.value).toMatchObject({ happenedAt: '100', learnedAt: '130' });
    expect(learned.state.chronicle).toHaveLength(1);
    expect(learned.state.chronicle[0]!.personId).toBe('alice');
    expect(learned.state.chronicle.some((memory) => memory.personId === 'carol')).toBe(false);
    expect(learned.state.relations).toEqual([
      { fromId: 'alice', toId: 'bob', base: zero, baseSourceEventId: null },
    ]);
  });

  it('treats another channel for the same learned fact as replay, not another effect', () => {
    const first = recordLearnedFact(createSocialState(), rescue);
    const before = canonicalJson(first.state);
    const replay = recordLearnedFact(first.state, {
      ...rescue,
      memoryId: 'memory-rescue-witness',
      sourceEventId: 'witness-rescue',
      learnedAt: '150',
      channel: 'WITNESS',
      emotionalDelta: { friendship: 99, rivalry: 99, fear: 99, respect: 99 },
    });

    expect(replay.replayed).toBe(true);
    expect(canonicalJson(replay.state)).toBe(before);
    expect(replay.value).toEqual(first.value);
    expect(replay.state.chronicle).toHaveLength(1);
  });

  it('lets another person learn the same fact independently without automatic reciprocity', () => {
    const first = recordLearnedFact(createSocialState(), rescue);
    expect(first.state.relations.some((r) => r.fromId === 'bob' && r.toId === 'alice')).toBe(false);

    const second = recordLearnedFact(first.state, {
      ...rescue,
      memoryId: 'memory-rescue-bob',
      personId: 'bob',
      otherId: 'alice',
      sourceEventId: 'experience-rescue',
      learnedAt: '131',
      channel: 'EXPERIENCE',
    });
    expect(second.state.chronicle.map((memory) => memory.personId)).toEqual(['alice', 'bob']);
    expect(second.state.relations).toEqual([
      { fromId: 'alice', toId: 'bob', base: zero, baseSourceEventId: null },
      { fromId: 'bob', toId: 'alice', base: zero, baseSourceEventId: null },
    ]);
  });

  it('owns retained evidence instead of aliasing mutable adapter input', () => {
    const emotionalDelta = { friendship: 10, rivalry: 0, fear: 0, respect: 8 };
    const mutable = { ...rescue, emotionalDelta, factType: 'rescue' };
    const learned = recordLearnedFact(createSocialState(), mutable);

    emotionalDelta.friendship = 90;
    mutable.factType = 'rewritten';
    expect(learned.value.emotionalDelta.friendship).toBe(10);
    expect(learned.value.factType).toBe('rescue');
  });

  it('fails closed for conflicting identities, invalid time, and invalid relation bases', () => {
    const first = recordLearnedFact(createSocialState(), rescue);

    expect(code(() => recordLearnedFact(first.state, { ...rescue, factType: 'betrayal' }))).toBe(
      'FACT_CONFLICT',
    );
    expect(
      code(() =>
        recordLearnedFact(first.state, {
          ...rescue,
          memoryId: rescue.memoryId,
          factId: 'fact-other',
          sourceEventId: 'report-other',
        }),
      ),
    ).toBe('MEMORY_ID_CONFLICT');
    expect(code(() => recordLearnedFact(createSocialState(), { ...rescue, learnedAt: '99' }))).toBe(
      'INVALID_TIME',
    );
    expect(
      code(() =>
        recordDirectedRelation(createSocialState(), {
          sourceEventId: 'bad-origin',
          fromId: 'alice',
          toId: 'bob',
          base: { ...zero, respect: 101 },
        }),
      ),
    ).toBe('INVALID_SOURCE');
    expect(
      code(() =>
        recordDirectedRelation(createSocialState(), {
          sourceEventId: 'self-origin',
          fromId: 'alice',
          toId: 'alice',
          base: zero,
        }),
      ),
    ).toBe('INVALID_SOURCE');
  });
});

function addMemory(
  state: ReturnType<typeof createSocialState>,
  index: number,
  overrides: Partial<typeof rescue> = {},
) {
  return recordLearnedFact(state, {
    ...rescue,
    memoryId: `memory-${index.toString().padStart(2, '0')}`,
    factId: `fact-${index}`,
    sourceEventId: `source-${index}`,
    happenedAt: '0',
    learnedAt: index.toString(),
    salience: index,
    emotionalDelta: { friendship: 1, rivalry: 0, fear: 0, respect: 0 },
    ...overrides,
  }).state;
}

describe('E02 — bounded active memories and exact relation decay', () => {
  it('keeps the chronicle while enforcing person and pair budgets deterministically', () => {
    let state = createSocialState();
    for (let index = 0; index < 40; index += 1) {
      state = addMemory(state, index, { otherId: index >= 28 ? 'bob' : `contact-${index}` });
    }

    const active = selectActiveMemories(state, 'alice', '100');
    expect(state.chronicle).toHaveLength(40);
    expect(active).toHaveLength(32);
    expect(active.filter((memory) => memory.otherId === 'bob')).toHaveLength(8);
    expect(active.slice(0, 8).map((memory) => memory.memoryId)).toEqual([
      'memory-39',
      'memory-38',
      'memory-37',
      'memory-36',
      'memory-35',
      'memory-34',
      'memory-33',
      'memory-32',
    ]);
    expect(state.chronicle.map((memory) => memory.memoryId)).toContain('memory-31');
  });

  it('orders ties by later knowledge and then stable memory ID', () => {
    let state = createSocialState();
    state = addMemory(state, 1, { memoryId: 'memory-z', factId: 'fact-z', salience: 10 });
    state = addMemory(state, 2, { memoryId: 'memory-c', factId: 'fact-c', salience: 10 });
    state = addMemory(state, 3, {
      memoryId: 'memory-b',
      factId: 'fact-b',
      salience: 10,
      learnedAt: '5',
    });
    state = addMemory(state, 4, {
      memoryId: 'memory-a',
      factId: 'fact-a',
      salience: 10,
      learnedAt: '5',
    });

    expect(selectActiveMemories(state, 'alice', '10').map((memory) => memory.memoryId)).toEqual([
      'memory-a',
      'memory-b',
      'memory-c',
      'memory-z',
    ]);
  });

  it('sums fractional contributions exactly before any UI rounding', () => {
    let state = recordDirectedRelation(createSocialState(), {
      sourceEventId: 'base',
      fromId: 'alice',
      toId: 'bob',
      base: { ...zero, friendship: 50 },
    }).state;
    state = addMemory(state, 1, {
      otherId: 'bob',
      learnedAt: '0',
      decayTicks: '2',
      emotionalDelta: { friendship: 1, rivalry: 0, fear: 0, respect: 0 },
    });
    state = addMemory(state, 2, {
      otherId: 'bob',
      learnedAt: '0',
      decayTicks: '2',
      emotionalDelta: { friendship: 1, rivalry: 0, fear: 0, respect: 0 },
    });

    const relation = deriveEffectiveRelation(state, 'alice', 'bob', '1')!;
    expect(relation.friendship).toEqual({ numerator: '51', denominator: '1' });
    expect(relation.activeMemoryIds).toHaveLength(2);
  });

  it('derives time decay without mutating base or accumulating tick-by-tick drift', () => {
    let state = recordDirectedRelation(createSocialState(), {
      sourceEventId: 'base',
      fromId: 'alice',
      toId: 'bob',
      base: { friendship: 10, rivalry: 20, fear: 30, respect: 40 },
    }).state;
    state = addMemory(state, 1, {
      otherId: 'bob',
      learnedAt: '0',
      decayTicks: '3',
      emotionalDelta: { friendship: 1, rivalry: -3, fear: 0, respect: 0 },
    });
    const before = canonicalJson(state);

    expect(deriveEffectiveRelation(state, 'alice', 'bob', '1')?.friendship).toEqual({
      numerator: '32',
      denominator: '3',
    });
    expect(deriveEffectiveRelation(state, 'alice', 'bob', '2')?.friendship).toEqual({
      numerator: '31',
      denominator: '3',
    });
    expect(deriveEffectiveRelation(state, 'alice', 'bob', '3')?.friendship).toEqual({
      numerator: '10',
      denominator: '1',
    });
    expect(canonicalJson(state)).toBe(before);
    expect(state.relations[0]?.base.friendship).toBe(10);
    expect(state.chronicle).toHaveLength(1);
  });

  it('does not let future or fully decayed memories crowd current active contributions', () => {
    let state = createSocialState();
    state = addMemory(state, 1, {
      memoryId: 'expired',
      factId: 'expired-fact',
      salience: 100,
      learnedAt: '0',
      decayTicks: '5',
    });
    state = addMemory(state, 2, {
      memoryId: 'current',
      factId: 'current-fact',
      salience: 1,
      learnedAt: '9',
      decayTicks: '100',
    });
    state = addMemory(state, 3, {
      memoryId: 'future',
      factId: 'future-fact',
      salience: 200,
      learnedAt: '20',
      decayTicks: '100',
    });

    expect(selectActiveMemories(state, 'alice', '10').map((memory) => memory.memoryId)).toEqual([
      'current',
    ]);
    expect(state.chronicle.map((memory) => memory.memoryId)).toEqual([
      'expired',
      'current',
      'future',
    ]);
  });

  it('clamps only the derived exact result and rejects invalid query time', () => {
    let state = recordDirectedRelation(createSocialState(), {
      sourceEventId: 'base',
      fromId: 'alice',
      toId: 'bob',
      base: { friendship: 99, rivalry: 1, fear: 0, respect: 0 },
    }).state;
    state = addMemory(state, 1, {
      otherId: 'bob',
      learnedAt: '0',
      decayTicks: '2',
      emotionalDelta: { friendship: 3, rivalry: -3, fear: 0, respect: 0 },
    });

    const relation = deriveEffectiveRelation(state, 'alice', 'bob', '1')!;
    expect(relation.friendship).toEqual({ numerator: '100', denominator: '1' });
    expect(relation.rivalry).toEqual({ numerator: '0', denominator: '1' });
    expect(deriveEffectiveRelation(state, 'alice', 'nobody', '1')).toBeUndefined();
    expect(code(() => selectActiveMemories(state, 'alice', '-1'))).toBe('INVALID_TIME');
  });
});
