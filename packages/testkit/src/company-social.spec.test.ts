import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  createSocialState,
  recordDirectedRelation,
  recordLearnedFact,
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
    expect(
      seeded.state.relations.some((r) => r.fromId === 'bob' && r.toId === 'alice'),
    ).toBe(false);
    expect(
      seeded.state.relations.some((r) => r.fromId === 'alice' && r.toId === 'carol'),
    ).toBe(false);

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
    expect(
      first.state.relations.some((r) => r.fromId === 'bob' && r.toId === 'alice'),
    ).toBe(false);

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
    expect(
      code(() => recordLearnedFact(createSocialState(), { ...rescue, learnedAt: '99' })),
    ).toBe('INVALID_TIME');
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
