import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  PROGRESSION_RULES,
  admitLearningTask,
  calculateCourseProgress,
  createLearningTaskState,
  createStudyAccessState,
  initialSkillProgress,
  prepareCompanyEconomy,
  progressionThresholdMilliXp,
  readLearningTaskInputs,
  readLearningTaskState,
  readSkillProgress,
  startLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type {
  CommandOf,
  LearningQuoteContext,
  MaterializedCompanyState,
  PracticeEvidence,
} from '@warwrit/game-core';
import {
  access,
  cash,
  command,
  context,
  economy,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';
import { addItem, item } from './company-physical-fixture.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fixture(targetLevel?: number, perks: readonly string[] = []) {
  const state = economy([1n], 100_000_000n);
  const owner = { kind: 'COMPANY' as const, id: state.lifecycle.companyId };
  const root = reload(
    addItem(state, item('practice-bow', 'bow', owner, 'fixture-supply')),
  ) as MaterializedCompanyState;
  Object.assign(root.lifecycle.characters[0]!, {
    skills: { leadership: 60, archery: initialSkillProgress(0, 'course-opening') },
    aptitudeBySkill: { archery: 10103 },
    perks,
  });
  const start = command(root, 'StartLearning', {
    characterId: 'leader',
    methodId: 'funded-practice',
    goal: { skillId: 'archery', maxTicks: '5000', ...(targetLevel ? { targetLevel } : {}) },
    resourceIds: ['practice-bow'],
    budgetPoolId: 'local',
    maxBudgetQ: '100000000',
  }) as ReturnType<typeof command> & CommandOf<'StartLearning'>;
  const ctx: LearningQuoteContext = {
    ...context(root, start, [access(root)]),
    learningFacts: [
      {
        ...scope(root, 'course-source'),
        sourceVersion: 'v1',
        expiresAt: tick(10000),
        learnerId: 'leader',
        location: place,
        resourceIds: start.payload.resourceIds,
        kind: 'COURSE',
        methodId: 'funded-practice',
        skillId: 'archery',
        challengeLevel: 1,
        providerId: 'provider',
        mentorId: 'provider',
        poolId: 'local',
        providerWalletId: 'wallet-provider',
        moneyAccessEvidenceId: 'money-access',
        costQPerDay: cash(5_000_000),
        maxTicks: '5000',
      },
    ],
  };
  const admitted = admitLearningTask(
    createLearningTaskState(),
    createStudyAccessState(),
    root,
    ctx,
    { taskId: 'course', command: start },
  );
  return { root, ctx, task: admitted.task };
}

describe.each([
  { perks: [] },
  { perks: ['leadership-25-b'] },
  { perks: ['leadership-60-b'] },
  { perks: ['leadership-25-b', 'leadership-60-b'] },
])('C05 course arithmetic, not settlement: $perks', ({ perks }) => {
  it('preserves exact shared mastery through partitions, reload and ambient changes', () => {
    const f = fixture(undefined, perks);
    expect(f.task.start.quote.maxTicks).toBe(f.ctx.learningFacts[0]!.maxTicks);
    expect(f.task.start.quote.funding).toEqual(fixture().task.start.quote.funding);
    const before = reload(f);
    const whole = calculateCourseProgress(f.task, f.root.lifecycle, '1000');
    expect(f).toEqual(before);
    const inputs = readLearningTaskInputs(f.task);
    if (inputs.kind !== 'COURSE') throw new Error('Expected admitted course');
    expect(inputs.coursePolicyVersion).toBe('s02-course-effort-1');
    const duration = f.task.start.quote.coefficients.task.trainingDurationBps;
    const first = calculateCourseProgress(f.task, f.root.lifecycle, '1');
    expect(first.nextSkill.amount.carry).not.toBe('0');
    const frozenInputs = reload(inputs);
    for (const parts of [
      ['1', '999'],
      ['19', '31', '950'],
      ['0', '997', '3'],
    ]) {
      const split = reload(f);
      Object.assign(split.root.lifecycle.characters[0]!, {
        aptitudeBySkill: {},
        perks: ['leadership-25-b'],
      });
      Object.assign(split.ctx.learningFacts[0]!, { challengeLevel: 99 });
      for (const part of parts) {
        const next = calculateCourseProgress(split.task, split.root.lifecycle, part);
        // Explicit boundary fixtures only; no simulated task/finance settlement handler.
        Object.assign(split.root.lifecycle.characters[0]!.skills, {
          archery: readSkillProgress(reload(next.nextSkill)),
        });
        const completed = BigInt(split.task.completedTicks) + BigInt(next.appliedElapsedTicks);
        split.task = readLearningTaskState({
          schemaVersion: 1,
          tasks: [{ ...split.task, completedTicks: String(completed) }],
        }).tasks[0]!;
      }
      expect(split.root.lifecycle.characters[0]!.skills['archery']).toEqual(whole.nextSkill);
      expect(split.task.completedTicks).toBe('1000');
      expect(readLearningTaskInputs(split.task)).toEqual(frozenInputs);
    }
    const amount = whole.nextSkill.amount;
    const denominator = BigInt(amount.carryDenominator ?? '1000000000000');
    const earned = BigInt(amount.milliXp) * denominator + BigInt(amount.carry);
    expect(earned * BigInt(inputs.ticksPerDay) * 10000n ** 3n * BigInt(duration.numerator)).toBe(
      BigInt(inputs.baseMilliXpPerDay) *
        1000n *
        10000n *
        BigInt(duration.denominator) *
        10103n *
        BigInt(inputs.challengeBps) *
        BigInt(inputs.outcomeBps) *
        denominator,
    );
  });

  it('finds the first whole goal tick or saved limit without discarding earned XP', () => {
    const f = fixture(1, perks);
    const inputs = readLearningTaskInputs(f.task);
    if (inputs.kind !== 'COURSE') throw new Error('Expected admitted course');
    const target = BigInt(progressionThresholdMilliXp(1));
    const duration = f.task.start.quote.coefficients.task.trainingDurationBps;
    const rateN =
      BigInt(inputs.baseMilliXpPerDay) *
      BigInt(inputs.aptitudeAtStartBps) *
      BigInt(inputs.challengeBps) *
      BigInt(inputs.outcomeBps) *
      10000n *
      BigInt(duration.denominator);
    const rateD = BigInt(inputs.ticksPerDay) * 10000n ** 3n * BigInt(duration.numerator);
    const boundary = (target * rateD + rateN - 1n) / rateN;
    const before = calculateCourseProgress(f.task, f.root.lifecycle, String(boundary - 1n));
    const at = calculateCourseProgress(f.task, f.root.lifecycle, String(boundary));
    expect(before.goalReached).toBe(false);
    expect(at.goalReached).toBe(true);
    expect(at.appliedElapsedTicks).toBe(String(boundary));
    expect(calculateCourseProgress(f.task, f.root.lifecycle, '999999')).toEqual(at);
    expect(BigInt(at.nextSkill.amount.milliXp)).toBeGreaterThanOrEqual(target);
    const later = reload(f.root.lifecycle);
    Object.assign(later.characters[0]!.skills, { archery: before.nextSkill });
    const partial = { ...f.task, completedTicks: before.appliedElapsedTicks };
    const lastGoal = calculateCourseProgress(reload(partial), later, '999999');
    expect(lastGoal.appliedElapsedTicks).toBe('1');
    expect(lastGoal.nextSkill).toEqual(at.nextSkill);
    const timed = fixture(100, perks);
    const prefix = calculateCourseProgress(
      timed.task,
      timed.root.lifecycle,
      String(BigInt(timed.task.start.quote.maxTicks) - 1n),
    );
    Object.assign(timed.root.lifecycle.characters[0]!.skills, { archery: prefix.nextSkill });
    const limited = { ...timed.task, completedTicks: prefix.appliedElapsedTicks };
    const lastTime = calculateCourseProgress(limited, timed.root.lifecycle, '999999');
    expect(lastTime).toMatchObject({
      appliedElapsedTicks: '1',
      goalReached: false,
      quotedLimitReached: true,
    });
    Object.assign(timed.root.lifecycle.characters[0]!.skills, { archery: lastTime.nextSkill });
    const exhausted = { ...timed.task, completedTicks: timed.task.start.quote.maxTicks };
    const afterTime = calculateCourseProgress(exhausted, timed.root.lifecycle, '1');
    expect(afterTime.appliedElapsedTicks).toBe('0');
    expect(afterTime.nextSkill).toEqual(lastTime.nextSkill);
    const stop = command(
      f.root,
      'StopLearning',
      { taskId: 'course', reason: 'PLAYER' },
      'stop',
    ) as CommandOf<'StopLearning'>;
    const closed = stopLearningTask({ schemaVersion: 1, tasks: [f.task] }, stop).task;
    expect(calculateCourseProgress(closed, f.root.lifecycle, '1').appliedElapsedTicks).toBe('0');
  });

  it('uses the actual shared skill after a separately admitted delayed practice receipt', () => {
    const f = fixture(1, perks);
    const payload = {
      receiptId: 'practice',
      characterId: 'leader',
      skillId: 'archery',
      methodId: 'weapon-attack',
      challengeLevel: 0,
      outcome: 'SUCCESS' as const,
      effortTicks: '1',
    };
    const practice = command(f.root, 'CreditPractice', payload, 'practice', 'DOMAIN_RECEIPT');
    const fact: PracticeEvidence = {
      worldId: f.root.lifecycle.worldId,
      companyId: f.root.lifecycle.companyId,
      sourceEventId: practice.sourceEventId,
      rulesVersion: PROGRESSION_RULES.version,
      catalogueVersion: COMPANY_CATALOGUE.version,
      payload,
      startedAt: '990',
      completedAt: '995',
      levelAtStart: 0,
      aptitudeAtStartBps: 10000,
      proof: {
        kind: 'weapon-attack',
        weaponProfile: 'bow',
        interaction: {
          sourceEventId: practice.sourceEventId,
          attackerId: 'leader',
          defenderId: 'threat',
          atTick: '995',
          origin: 'EXTERNAL',
        },
      },
    };
    const credited = prepared(
      prepareCompanyEconomy(f.root, practice, {
        ...context(f.root, practice),
        practiceFacts: [fact],
      }),
    ).next;
    const before = reload(credited);
    const result = calculateCourseProgress(f.task, reload(credited.lifecycle), '1000');
    expect(result).toMatchObject({ appliedElapsedTicks: '0', goalReached: true });
    expect(result.nextSkill).toEqual(credited.lifecycle.characters[0]!.skills['archery']);
    expect(credited).toEqual(before);
  });

  it('preserves legacy history and rejects invalid or unknown policy', () => {
    const f = fixture(undefined, perks);
    const unchanged = reload(f);
    const legacy = reload(f.task);
    Reflect.deleteProperty(legacy.start, 'inputs');
    expect(() => calculateCourseProgress(legacy, f.root.lifecycle, '1')).toThrow(
      'LEARNING_START_INPUTS_REQUIRED',
    );
    for (const ticks of ['-1', '0.5', '01', '1e3'])
      expect(() => calculateCourseProgress(f.task, f.root.lifecycle, ticks)).toThrow(
        'INVALID_TIME',
      );
    for (const patch of [{ worldId: 'foreign' }, { companyId: 'foreign' }])
      expect(() =>
        calculateCourseProgress(
          f.task,
          { ...f.root.lifecycle, ...patch } as typeof f.root.lifecycle,
          '1',
        ),
      ).toThrow('AUTHORIZATION');
    const inexact = reload(f.root.lifecycle);
    Object.assign(inexact.characters[0]!.skills, { archery: 0 });
    expect(() => calculateCourseProgress(f.task, inexact, '1')).toThrow('INVALID_STATE');
    const corrupt = reload(f.task);
    Object.assign(corrupt.start.inputs!, { ticksPerDay: '0' });
    expect(() => calculateCourseProgress(corrupt, f.root.lifecycle, '1')).toThrow('INVALID_STATE');
    expect(f).toEqual(unchanged);
    const untagged = reload(f.task);
    Reflect.deleteProperty(untagged.start.inputs!, 'coursePolicyVersion');
    const oldState = { schemaVersion: 1 as const, tasks: [untagged] };
    expect(startLearningTask(oldState, untagged.start).replayed).toBe(true);
    const oldInput = reload(untagged);
    if (perks.length === 0)
      expect(calculateCourseProgress(untagged, f.root.lifecycle, '1')).toEqual(
        calculateCourseProgress(f.task, f.root.lifecycle, '1'),
      );
    else
      expect(() => calculateCourseProgress(untagged, f.root.lifecycle, '1')).toThrow(
        'LEARNING_TRAINING_DURATION_POLICY_REQUIRED',
      );
    expect(untagged).toEqual(oldInput);
    Object.assign(untagged.start.inputs!, { coursePolicyVersion: 'future' });
    expect(() => calculateCourseProgress(untagged, f.root.lifecycle, '1')).toThrow('INVALID_STATE');
    expect(f).toEqual(unchanged);
  });
});
