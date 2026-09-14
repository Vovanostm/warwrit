import { COMPANY_CATALOGUE } from './definitions.js';
import { choice, either, id, natural, object, snapshotJson, unsigned } from './input.js';
import { exactFraction, exactFractionInput, readExactFraction } from './exact-fraction.js';
import type { ExactFraction } from './exact-fraction.js';
import type { ValueOf } from './input.js';
import { xpToMilliXp } from './progression.js';

const keyInput = object({ characterId: id, workId: id, sectionId: id });
const progressFields = {
  characterId: id,
  workId: id,
  workVersion: natural(1),
  sectionId: id,
  learnedTicks: unsigned,
};
const progressInput = either(
  object({ schemaVersion: choice(1), ...progressFields }),
  object({ schemaVersion: choice(2), ...progressFields, learnedCarry: exactFractionInput }),
);

export type StudySectionKey = ValueOf<typeof keyInput>;
export type StudySectionProgress = ValueOf<typeof progressInput>;

export interface StudySectionCompletion {
  readonly skillId: string;
  readonly factId: string;
  readonly totalMilliXp: string;
}

export interface StudySectionAdvance {
  readonly next: StudySectionProgress;
  readonly appliedTicks: string;
  readonly creditedMilliXp: string;
  readonly completion: StudySectionCompletion | null;
}

function exact(value: unknown): bigint {
  if (!unsigned.read(value)) throw new RangeError('Invalid study tick quantity');
  return BigInt(value);
}

function workFor(key: StudySectionKey) {
  const work = COMPANY_CATALOGUE.works.find(
    (candidate) => candidate.id === key.workId && candidate.sectionId === key.sectionId,
  );
  if (!work) throw new RangeError('Unknown work section');
  if (exact(work.durationTicks) === 0n)
    throw new RangeError('Study section duration must be positive');
  return work;
}

export function readStudySectionProgress(value: unknown): StudySectionProgress {
  const progress = snapshotJson(value);
  if (!progressInput.read(progress)) throw new RangeError('Invalid study section progress');
  const work = workFor(progress);
  if (progress.workVersion !== work.version)
    throw new RangeError('Study section progress requires version migration');
  if (exact(progress.learnedTicks) > exact(work.durationTicks))
    throw new RangeError('Study section progress exceeds its finite duration');
  if (
    progress.schemaVersion === 2 &&
    (BigInt(progress.learnedCarry.numerator) >= BigInt(progress.learnedCarry.denominator) ||
      (progress.learnedTicks === work.durationTicks && progress.learnedCarry.numerator !== '0'))
  )
    throw new RangeError('Invalid fractional study progress');
  return progress;
}

/**
 * Advances personal content mastery only. Physical book access, occupied intervals,
 * prerequisites, money and public StartLearning remain later C02-C08 responsibilities.
 */
export function advanceStudySection(
  previous: StudySectionProgress | null,
  keyValue: StudySectionKey,
  studiedTicksValue: string,
): StudySectionAdvance {
  const key = snapshotJson(keyValue);
  if (!keyInput.read(key)) throw new RangeError('Invalid study section key');
  const work = workFor(key);
  const studiedTicks = exact(studiedTicksValue);
  const current = previous === null ? null : readStudySectionProgress(previous);
  if (current?.schemaVersion === 2)
    throw new RangeError('Fractional study requires advanceStudySectionFraction');
  if (
    current &&
    (current.characterId !== key.characterId ||
      current.workId !== key.workId ||
      current.sectionId !== key.sectionId)
  )
    throw new RangeError('Study progress belongs to another learner or section');

  const duration = exact(work.durationTicks);
  const learned = current ? exact(current.learnedTicks) : 0n;
  const remaining = duration - learned;
  const applied = studiedTicks < remaining ? studiedTicks : remaining;
  const nextLearned = learned + applied;
  const totalMilliXp = BigInt(xpToMilliXp(work.finiteXp));
  const creditedBefore = (totalMilliXp * learned) / duration;
  const creditedAfter = (totalMilliXp * nextLearned) / duration;
  const completedNow = learned < duration && nextLearned === duration;

  return Object.freeze({
    next: Object.freeze({
      schemaVersion: 1,
      characterId: key.characterId,
      workId: key.workId,
      workVersion: work.version,
      sectionId: key.sectionId,
      learnedTicks: nextLearned.toString(),
    }),
    appliedTicks: applied.toString(),
    creditedMilliXp: (creditedAfter - creditedBefore).toString(),
    completion: completedNow
      ? Object.freeze({
          skillId: work.skillId,
          factId: work.factId,
          totalMilliXp: totalMilliXp.toString(),
        })
      : null,
  });
}

/** C05 numerical slice: semantic units, not campaign time or proof of book access.
 * Schema 2 owns its proper fractional content remainder; legacy integer API fails closed.
 * The caller must credit the returned exact XP and this progress in the same candidate.
 */
export function advanceStudySectionFraction(
  previous: StudySectionProgress | null,
  key: StudySectionKey,
  studiedTicks: ExactFraction,
): Omit<StudySectionAdvance, 'appliedTicks' | 'creditedMilliXp'> & {
  readonly appliedTicks: ExactFraction;
  readonly creditedMilliXp: ExactFraction;
} {
  const current = previous === null ? null : readStudySectionProgress(previous);
  const carry = current?.schemaVersion === 2 ? current.learnedCarry : exactFraction(0n, 1n);
  const whole = current && {
    schemaVersion: 1 as const,
    characterId: current.characterId,
    workId: current.workId,
    workVersion: current.workVersion,
    sectionId: current.sectionId,
    learnedTicks: current.learnedTicks,
  };
  const checked = advanceStudySection(whole, key, '0').next;
  const work = workFor(checked);
  const duration = BigInt(work.durationTicks);
  const total = BigInt(xpToMilliXp(work.finiteXp));
  const learned = BigInt(checked.learnedTicks);
  if (current?.schemaVersion === 1 && (total * learned) % duration !== 0n)
    throw new RangeError('Legacy study credit requires an exact binding');
  const requested = readExactFraction(studiedTicks);
  const d = BigInt(carry.denominator) * BigInt(requested.denominator);
  const before = learned * d + BigInt(carry.numerator) * BigInt(requested.denominator);
  const available = duration * d - before;
  const wanted = BigInt(requested.numerator) * BigInt(carry.denominator);
  const applied = wanted < available ? wanted : available;
  const after = before + applied;
  // Reuse C01's definition/version/key validation and sole completion entitlement.
  const advanced = advanceStudySection(checked, key, (after / d - learned).toString());
  return Object.freeze({
    next: Object.freeze({
      ...advanced.next,
      schemaVersion: 2,
      learnedCarry: exactFraction(after % d, d),
    }),
    appliedTicks: exactFraction(applied, d),
    creditedMilliXp: exactFraction(total * applied, duration * d),
    completion: advanced.completion,
  });
}

/** Eligible campaign ticks at a caller-supplied frozen B02 duration, never today's perks. */
export function advanceStudySectionTime(
  previous: StudySectionProgress | null,
  key: StudySectionKey,
  eligibleTicks: string,
  frozenDurationBps: ExactFraction,
) {
  const ticks = exact(eligibleTicks);
  const duration = readExactFraction(frozenDurationBps);
  const n = BigInt(duration.numerator);
  const d = BigInt(duration.denominator) * 10000n;
  if (n === 0n) throw new RangeError('Study duration must be positive');
  const advanced = advanceStudySectionFraction(previous, key, exactFraction(ticks * d, n));
  const usedN = BigInt(advanced.appliedTicks.numerator) * n;
  const usedD = BigInt(advanced.appliedTicks.denominator) * d;
  return Object.freeze({
    ...advanced,
    // Campaign ticks are integral: stop on the first tick containing completion.
    appliedElapsedTicks: ((usedN + usedD - 1n) / usedD).toString(),
  });
}
