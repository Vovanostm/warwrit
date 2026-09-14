import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  advanceStudySection,
  advanceStudySectionFraction,
  advanceStudySectionTime,
  admitLearningTask,
  creditProgression,
  createLearningTaskState,
  createStudyAccessState,
  initialSkillProgress,
  readSkillProgress,
  readStudySectionProgress,
  skillLevel,
  xpToMilliXp,
} from '@warwrit/game-core';
import type {
  CommandOf,
  MaterializedCompanyState,
  ProgressionAmount,
  StudySectionProgress,
} from '@warwrit/game-core';
import { command, context, economy, place, scope } from './company-economy-fixture.js';
import { addItem, item, itemAccess } from './company-physical-fixture.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fraction = (n: bigint | number, d: bigint | number) => ({
  numerator: String(n),
  denominator: String(d),
});
const neutral = { aptitudeBps: 10000, challengeBps: 10000, outcomeBps: 10000 };
const key = {
  characterId: 'leader',
  workId: 'wound-care-basics',
  sectionId: 'wound-care-basics-1',
};
const work = COMPANY_CATALOGUE.works.find((entry) => entry.id === key.workId)!;
const fullXp = xpToMilliXp(work.finiteXp);
function admitted() {
  const root = reload(
    addItem(
      economy([], 100000n, 0),
      item('copy', 'study-book-medicine', { kind: 'COMPANY', id: 'company' }, 'fixture-supply'),
    ),
  ) as MaterializedCompanyState;
  Object.assign(root.lifecycle.characters[0]!, {
    skills: { scholarship: 25, medicine: initialSkillProgress(0, 'opening') },
    aptitudeBySkill: { medicine: 10000 },
    perks: ['scholarship-25-a'],
  });
  const start = command(root, 'StartLearning', {
    characterId: key.characterId,
    methodId: 'book-study',
    goal: { workId: key.workId, sectionId: key.sectionId, maxTicks: work.durationTicks },
    resourceIds: ['copy'],
    budgetPoolId: 'local',
    maxBudgetQ: '0',
  }) as ReturnType<typeof command> & CommandOf<'StartLearning'>;
  const access = itemAccess(root, 'access', 'STUDY', ['fixture-supply'], ['copy']);
  const ctx = {
    ...context(root, start, [], [], [access]),
    learningFacts: [
      {
        ...scope(root, 'book-source'),
        expiresAt: '10000',
        learnerId: key.characterId,
        location: place,
        resourceIds: ['copy'],
        sourceVersion: 'v1',
        kind: 'SELF_STUDY' as const,
        methodId: 'book-study' as const,
        workId: key.workId,
        sectionId: key.sectionId,
      },
    ],
  };
  const task = admitLearningTask(createLearningTaskState(), createStudyAccessState(), root, ctx, {
    taskId: 'study',
    command: start,
    study: { intervalId: 'copy-interval', itemId: 'copy', accessEvidenceId: 'access' },
  }).task;
  return { root, duration: task.start.quote.coefficients.task.studyDurationBps, task };
}

function sequence(parts: readonly string[], duration: ReturnType<typeof fraction>) {
  let section: StudySectionProgress | null = null;
  let skill = initialSkillProgress(0, 'opening');
  let elapsed = 0n;
  let completions = 0;
  for (const part of parts) {
    const next = advanceStudySectionTime(section, key, part, duration);
    section = readStudySectionProgress(reload(next.next));
    skill = { ...skill, amount: creditProgression(skill.amount, next.creditedMilliXp, neutral) };
    expect(readSkillProgress(reload(skill))).toEqual(skill);
    elapsed += BigInt(next.appliedElapsedTicks);
    completions += Number(next.completion !== null);
  }
  return { section, skill, elapsed, completions };
}

describe('C05 numerical owners — exact fractional study and XP', () => {
  it('advances an admitted accelerated book identically whole/split after JSON reload', () => {
    const f = admitted();
    const original = reload(f.root);
    const ticks = BigInt(f.task.start.quote.maxTicks);
    const whole = sequence([ticks.toString()], f.duration);
    for (const split of [1n, 2n, ticks / 2n, ticks - 1n]) {
      const parts = [split.toString(), (ticks - split).toString(), '99999'];
      expect(sequence(parts, f.duration)).toEqual(whole);
    }
    expect(whole).toMatchObject({
      elapsed: ticks,
      completions: 1,
      skill: { amount: { milliXp: fullXp, carry: '0' } },
    });
    expect(f.root).toEqual(original); // Numerical preparation does not debit or publish a root.
    const first = advanceStudySectionTime(null, key, '1', fraction(9000, 1));
    expect(first.next).toMatchObject({
      schemaVersion: 2,
      learnedTicks: '1',
      learnedCarry: fraction(1, 9),
    });
    expect(BigInt(first.creditedMilliXp.numerator) * BigInt(work.durationTicks) * 9n).toBe(
      BigInt(fullXp) * 10n * BigInt(first.creditedMilliXp.denominator),
    );
    Object.assign(f.root.lifecycle.characters[0]!, { perks: [] });
    expect(sequence([ticks.toString()], f.duration)).toEqual(whole);
  });

  it('keeps partial content across a new duration and clips the first completion boundary', () => {
    const half = BigInt(work.durationTicks) / 2n;
    const prior = advanceStudySection(null, key, half.toString());
    const first = advanceStudySectionTime(prior.next, key, '1', fraction(9000, 1));
    const end = advanceStudySectionTime(reload(first.next), key, '999999', fraction(10000, 1));
    let earned = initialSkillProgress(0, 'opening').amount;
    for (const credit of [prior.creditedMilliXp, first.creditedMilliXp, end.creditedMilliXp])
      earned = creditProgression(earned, credit, neutral);
    expect(earned).toEqual({ milliXp: fullXp, carry: '0' });
    expect(end.completion?.factId).toBe(work.factId);
    expect(BigInt(end.appliedElapsedTicks)).toBe(BigInt(work.durationTicks) - half - 1n);
    const after = advanceStudySectionTime(reload(end.next), key, '999999', fraction(9000, 1));
    expect(after).toMatchObject({
      appliedElapsedTicks: '0',
      creditedMilliXp: fraction(0, 1),
      completion: null,
      next: end.next,
    });
    expect(sequence([work.durationTicks], fraction(10000, 1)).skill.amount.milliXp).toBe(fullXp);
  });

  it('retains sub-milliXP through event credits, partitions and a real level boundary', () => {
    const coefficients = { aptitudeBps: 10103, challengeBps: 10200, outcomeBps: 2500 };
    for (const denominator of [3n, 7n, 9n, 17n]) {
      const initial: ProgressionAmount = { milliXp: '9999', carry: '900000000000' };
      const whole = creditProgression(initial, fraction(13n, denominator), coefficients);
      let split = initial;
      for (let i = 0; i < 13; i++)
        split = creditProgression(reload(split), fraction(1n, denominator), coefficients);
      expect(split).toEqual(whole);
    }
    const first = creditProgression({ milliXp: '9999', carry: '0' }, fraction(1, 3), neutral);
    expect(first).toEqual({ milliXp: '9999', carry: '1', carryDenominator: '3' });
    const second = creditProgression(reload(first), '1', { ...neutral, outcomeBps: 2500 });
    const completed = creditProgression(reload(second), fraction(5, 12), neutral);
    expect(completed).toEqual({ milliXp: '10000', carry: '0' });
    const skill = { ...initialSkillProgress(0, 'opening'), amount: completed };
    expect(skillLevel(readSkillProgress(reload(skill)))).toBe(1);
  });

  it('rejects corrupt or downgraded fractions without losing old exact values', () => {
    const section = advanceStudySectionTime(null, key, '1', fraction(9000, 1)).next;
    expect(() => advanceStudySection(section, key, '1')).toThrow('Fractional study requires');
    const invalid = [fraction(1, 0), fraction(-1, 2), { ...fraction(1, 2), extra: true }];
    for (const value of invalid) {
      const before = reload(section);
      expect(() => advanceStudySectionFraction(section, key, value)).toThrow();
      expect(section).toEqual(before);
      expect(() => creditProgression({ milliXp: '0', carry: '0' }, value, neutral)).toThrow();
    }
    expect(() => readStudySectionProgress({ ...section, learnedCarry: fraction(9, 9) })).toThrow();
    expect(() =>
      readStudySectionProgress({ ...section, learnedTicks: work.durationTicks }),
    ).toThrow();
    const other = { ...key, characterId: 'stranger' };
    expect(() => advanceStudySectionFraction(section, other, fraction(1, 9))).toThrow(
      'another learner',
    );
    for (const carry of ['0', '3']) {
      const amount = { milliXp: '0', carry, carryDenominator: carry };
      expect(() => readSkillProgress({ ...initialSkillProgress(0, 'opening'), amount })).toThrow();
    }
    const legacy = { milliXp: '42', carry: '123' };
    expect(creditProgression(legacy, '0', neutral)).toEqual(legacy);
    expect(() => advanceStudySectionTime(section, key, '1', fraction(0, 1))).toThrow();
  });
});
