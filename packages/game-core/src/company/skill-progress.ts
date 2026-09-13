import { COMPANY_RULES } from './definitions.js';
import { choice, either, id, natural, object, snapshotJson } from './input.js';
import type { ValueOf } from './input.js';
import {
  PROGRESSION_RULES,
  progressionAmountInput,
  progressionLevel,
  progressionThresholdMilliXp,
} from './progression.js';
import type { ProgressionAmount } from './progression.js';

const levelInput = natural(0, COMPANY_RULES.maxSkillLevel);
const exactInput = object({
  schemaVersion: choice(1),
  rulesVersion: choice(PROGRESSION_RULES.version),
  amount: progressionAmountInput,
  binding: object({ kind: choice('INITIAL_CREDIT', 'LEGACY_EXACT'), sourceId: id }),
});
const progressInput = either(levelInput, exactInput);
export type ExactSkillProgress = ValueOf<typeof exactInput>;
/** A legacy number proves only a level. An exact entry owns XP/carry and stores no level. */
export type SkillProgress = ValueOf<typeof progressInput>;

export function isSkillProgress(value: unknown): value is SkillProgress {
  return progressInput.read(snapshotJson(value));
}
export function readSkillProgress(value: unknown): SkillProgress {
  const progress = snapshotJson(value);
  if (!progressInput.read(progress)) throw new RangeError('Invalid skill progress');
  return progress;
}
export function skillLevel(value: SkillProgress): number {
  const progress = readSkillProgress(value);
  return typeof progress === 'number' ? progress : progressionLevel(progress.amount.milliXp);
}
/** Observation compatibility: disclose levels, not private XP, carry or import provenance. */
export function skillLevels(skills: Readonly<Record<string, SkillProgress>>) {
  return Object.fromEntries(Object.entries(skills).map(([key, value]) => [key, skillLevel(value)]));
}
function bind(
  level: number,
  amount: ProgressionAmount,
  binding: ExactSkillProgress['binding'],
): ExactSkillProgress {
  const progress = snapshotJson({
    schemaVersion: 1,
    rulesVersion: PROGRESSION_RULES.version,
    amount,
    binding,
  });
  if (
    !levelInput.read(level) ||
    !exactInput.read(progress) ||
    progressionLevel(progress.amount.milliXp) !== level
  )
    throw new RangeError('Skill binding does not preserve the supplied level');
  return progress;
}
/** Trusted import must supply the original exact total, including its fractional carry. */
export function bindLegacySkillProgress(
  level: number,
  amount: ProgressionAmount,
  sourceId: string,
): ExactSkillProgress {
  return bind(level, amount, { kind: 'LEGACY_EXACT', sourceId });
}
/** New-person grant only: the opening explicitly credits its configured level's threshold. */
export function initialSkillProgress(level: number, sourceId: string): ExactSkillProgress {
  return bind(
    level,
    { milliXp: progressionThresholdMilliXp(level), carry: '0' },
    { kind: 'INITIAL_CREDIT', sourceId },
  );
}
