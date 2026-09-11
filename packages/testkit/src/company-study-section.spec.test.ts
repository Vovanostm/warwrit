import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  advanceStudySection,
  COMPANY_CATALOGUE,
  readStudySectionProgress,
  xpToMilliXp,
} from '@warwrit/game-core';
import type { StudySectionKey, StudySectionProgress } from '@warwrit/game-core';

const medicine: StudySectionKey = {
  characterId: 'learner',
  workId: 'wound-care-basics',
  sectionId: 'wound-care-basics-1',
};
const work = COMPANY_CATALOGUE.works.find(
  (candidate) => candidate.id === medicine.workId && candidate.sectionId === medicine.sectionId,
);
if (!work) throw new Error('Missing medicine study fixture');
const duration = BigInt(work.durationTicks);
const durationNumber = Number(work.durationTicks);
const firstInterval = duration / 2n;
const secondInterval = duration - firstInterval;
const finiteMilliXp = BigInt(xpToMilliXp(work.finiteXp));
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const credit = (value: string) => BigInt(value);

describe('C01 — finite personal mastery of a work section', () => {
  it('continues the same content across copies/reload and grants completion only once', () => {
    const first = advanceStudySection(null, medicine, firstInterval.toString());
    expect(first.completion).toBeNull();
    expect(first.next).toMatchObject({
      ...medicine,
      workVersion: work.version,
      learnedTicks: firstInterval.toString(),
    });

    // A different physical copy is deliberately absent from the content key.
    const completed = advanceStudySection(reload(first.next), medicine, secondInterval.toString());
    expect(completed.next.learnedTicks).toBe(duration.toString());
    expect(credit(first.creditedMilliXp) + credit(completed.creditedMilliXp)).toBe(finiteMilliXp);
    expect(completed.completion).toEqual({
      skillId: work.skillId,
      factId: work.factId,
      totalMilliXp: finiteMilliXp.toString(),
    });

    const replay = advanceStudySection(reload(completed.next), medicine, duration.toString());
    expect(replay).toMatchObject({
      appliedTicks: '0',
      creditedMilliXp: '0',
      completion: null,
      next: completed.next,
    });
  });

  it('keeps progress personal to the learner while sharing the work definition', () => {
    const first = advanceStudySection(null, medicine, firstInterval.toString());
    const otherKey = { ...medicine, characterId: 'other-learner' };
    const other = advanceStudySection(null, otherKey, duration.toString());

    expect(first.next.learnedTicks).toBe(firstInterval.toString());
    expect(first.completion).toBeNull();
    expect(other.next.learnedTicks).toBe(duration.toString());
    expect(other.completion?.factId).toBe(work.factId);
    expect(() => advanceStudySection(first.next, otherKey, '1')).toThrow(
      'another learner or section',
    );
  });

  it('is partition-invariant and JSON-safe for every split of the finite section', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: durationNumber }), (split) => {
        const whole = advanceStudySection(null, medicine, duration.toString());
        const left = advanceStudySection(null, medicine, split.toString());
        const right = advanceStudySection(
          reload(left.next),
          medicine,
          (durationNumber - split).toString(),
        );

        expect(right.next).toEqual(whole.next);
        expect(credit(left.creditedMilliXp) + credit(right.creditedMilliXp)).toBe(
          credit(whole.creditedMilliXp),
        );
        expect(right.next.learnedTicks).toBe(duration.toString());
        expect(right.completion ?? left.completion).toEqual(whole.completion);
        expect(readStudySectionProgress(reload(right.next))).toEqual(right.next);
      }),
    );
  });

  it('caps study at the exact finite boundary without increasing the finite reward', () => {
    const beforeEnd = duration - 1n;
    const almost = advanceStudySection(null, medicine, beforeEnd.toString());
    const end = advanceStudySection(almost.next, medicine, (duration + 10000n).toString());

    expect(end.appliedTicks).toBe('1');
    expect(end.next.learnedTicks).toBe(duration.toString());
    expect(credit(almost.creditedMilliXp) + credit(end.creditedMilliXp)).toBe(finiteMilliXp);
    expect(end.completion?.totalMilliXp).toBe(finiteMilliXp.toString());
  });

  it('rejects malformed, foreign and unmigrated progress instead of resetting it', () => {
    const valid = advanceStudySection(null, medicine, firstInterval.toString()).next;
    const invalid: unknown[] = [
      { ...valid, learnedTicks: (duration + 1n).toString() },
      { ...valid, learnedTicks: '-1' },
      { ...valid, learnedTicks: '1.5' },
      { ...valid, workVersion: work.version + 1 },
      { ...valid, schemaVersion: 2 },
      { ...valid, characterId: '' },
    ];
    for (const value of invalid) expect(() => readStudySectionProgress(value)).toThrow(RangeError);

    const otherSection: StudySectionProgress = {
      ...valid,
      workId: 'local-knowledge',
      sectionId: 'local-knowledge-1',
    };
    expect(() => advanceStudySection(otherSection, medicine, '1')).toThrow(RangeError);
    expect(() => advanceStudySection(valid, medicine, '-1')).toThrow(RangeError);
    expect(() =>
      advanceStudySection(null, { ...medicine, sectionId: 'renamed-copy-section' }, '1'),
    ).toThrow('Unknown work section');
  });
});
