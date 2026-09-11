import { COMPANY_CATALOGUE } from './definitions.js';
import { choice, id, natural, object, snapshotJson, unsigned } from './input.js';
import type { ValueOf } from './input.js';
import { xpToMilliXp } from './progression.js';

const keyInput = object({ characterId: id, workId: id, sectionId: id });
const progressInput = object({
  schemaVersion: choice(1),
  characterId: id,
  workId: id,
  workVersion: natural(1),
  sectionId: id,
  learnedTicks: unsigned,
});

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
