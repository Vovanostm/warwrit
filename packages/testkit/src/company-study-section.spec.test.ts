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
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const credit = (value: string) => BigInt(value);

describe('C01 — finite personal mastery of a work section', () => {
  it('continues the same content across copies/reload and grants completion only once', () => {
    const bookBefore = reload(
      COMPANY_CATALOGUE.items.find((item) => item.id === 'study-book-medicine'),
    );
    const first = advanceStudySection(null, medicine, '400');
    expect(first).toMatchObject({
      appliedTicks: '400',
      creditedMilliXp: '40000',
      completion: null,
      next: { ...medicine, workVersion: 1, learnedTicks: '400' },
    });

    // A different physical copy is deliberately absent from the content key.
    const completed = advanceStudySection(reload(first.next), medicine, '600');
    expect(completed).toMatchObject({
      appliedTicks: '600',
      creditedMilliXp: '60000',
      next: { ...medicine, workVersion: 1, learnedTicks: '1000' },
      completion: {
        skillId: 'medicine',
        factId: 'care-method-known',
        totalMilliXp: xpToMilliXp(100),
      },
    });

    const replay = advanceStudySection(reload(completed.next), medicine, '1000');
    expect(replay).toMatchObject({
      appliedTicks: '0',
      creditedMilliXp: '0',
      completion: null,
      next: completed.next,
    });
    expect(
      COMPANY_CATALOGUE.items.find((item) => item.id === 'study-book-medicine'),
    ).toEqual(bookBefore);
  });

  it('keeps progress personal to the learner while sharing the work definition', () => {
    const first = advanceStudySection(null, medicine, '500');
    const otherKey = { ...medicine, characterId: 'other-learner' };
    const other = advanceStudySection(null, otherKey, '1000');

    expect(first.next.learnedTicks).toBe('500');
    expect(first.completion).toBeNull();
    expect(other.next.learnedTicks).toBe('1000');
    expect(other.completion?.factId).toBe('care-method-known');
    expect(() => advanceStudySection(first.next, otherKey, '1')).toThrow(
      'another learner or section',
    );
  });

  it('is partition-invariant and JSON-safe for every split of the finite section', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (split) => {
        const whole = advanceStudySection(null, medicine, '1000');
        const left = advanceStudySection(null, medicine, split.toString());
        const right = advanceStudySection(
          reload(left.next),
          medicine,
          (1000 - split).toString(),
        );

        expect(right.next).toEqual(whole.next);
        expect(credit(left.creditedMilliXp) + credit(right.creditedMilliXp)).toBe(
          credit(whole.creditedMilliXp),
        );
        expect(right.next.learnedTicks).toBe('1000');
        expect(right.completion ?? left.completion).toEqual(whole.completion);
        expect(readStudySectionProgress(reload(right.next))).toEqual(right.next);
      }),
    );
  });

  it('caps study at the exact finite boundary without increasing the finite reward', () => {
    const almost = advanceStudySection(null, medicine, '999');
    const end = advanceStudySection(almost.next, medicine, '10000');

    expect(end.appliedTicks).toBe('1');
    expect(end.next.learnedTicks).toBe('1000');
    expect(credit(almost.creditedMilliXp) + credit(end.creditedMilliXp)).toBe(
      credit(xpToMilliXp(100)),
    );
    expect(end.completion?.totalMilliXp).toBe(xpToMilliXp(100));
  });

  it('rejects malformed, foreign and unmigrated progress instead of resetting it', () => {
    const valid = advanceStudySection(null, medicine, '250').next;
    const invalid: unknown[] = [
      { ...valid, learnedTicks: '1001' },
      { ...valid, learnedTicks: '-1' },
      { ...valid, learnedTicks: '1.5' },
      { ...valid, workVersion: 2 },
      { ...valid, schemaVersion: 2 },
      { ...valid, characterId: '' },
    ];
    for (const value of invalid)
      expect(() => readStudySectionProgress(value)).toThrow(RangeError);

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
