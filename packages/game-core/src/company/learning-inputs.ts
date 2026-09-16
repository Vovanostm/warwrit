import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { requireEconomy } from './economy-state.js';
import { choice, either, id, natural, object, optional, snapshotJson, unsigned } from './input.js';
import type { ValueOf } from './input.js';
import type { LearningTaskQuote } from './learning-quote.js';
import type { LearningSourceEvidence } from './learning-source.js';
import { person } from './lifecycle-state.js';
import type { CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { PROGRESSION_RULES, progressionChallengeBps, xpToMilliXp } from './progression.js';
import { readSkillProgress, skillLevel } from './skill-progress.js';

const positive = {
  ...unsigned,
  read: (value: unknown): value is string => unsigned.read(value) && BigInt(value) > 0n,
};
const level = natural(0, COMPANY_RULES.maxSkillLevel);
const common = {
  schemaVersion: choice(1),
  rulesVersion: choice(PROGRESSION_RULES.version),
  skillId: id,
  levelAtStart: level,
  aptitudeAtStartBps: natural(1),
};
export const learningInputsInput = either(
  object({
    ...common,
    kind: choice('BOOK'),
    workId: id,
    workVersion: natural(1),
    sectionId: id,
    durationTicks: positive,
    finiteMilliXp: unsigned,
    factId: id,
  }),
  object({
    ...common,
    kind: choice('COURSE'),
    coursePolicyVersion: optional(choice('s02-course-effort-1')),
    ticksPerDay: positive,
    baseMilliXpPerDay: unsigned,
    challengeLevel: level,
    challengeBps: natural(
      PROGRESSION_RULES.challenge.minimumBps,
      PROGRESSION_RULES.challenge.maximumBps,
    ),
    outcomeBps: choice(PROGRESSION_RULES.outcomeBps.success),
  }),
);
export type LearningInputs = ValueOf<typeof learningInputsInput>;

/** Fresh, already-admitted source only. Never use this to repair a historical start. */
export function captureLearningInputs(
  root: MaterializedCompanyState,
  command: CommandOf<'StartLearning'>,
  source: LearningSourceEvidence,
): LearningInputs {
  const work = COMPANY_CATALOGUE.works.find(
    (entry) => entry.id === source.workId && entry.sectionId === source.sectionId,
  );
  const skillId = source.kind === 'COURSE' ? source.skillId : work?.skillId;
  requireEconomy(skillId !== undefined, 'INVALID_SOURCE');
  const learner = person(root.lifecycle, command.payload.characterId);
  const progress = learner.skills[skillId];
  requireEconomy(progress !== undefined, 'INVALID_STATE');
  const stored = readSkillProgress(progress);
  requireEconomy(typeof stored !== 'number', 'INVALID_STATE');
  const aptitude = learner.aptitudeBySkill[skillId];
  requireEconomy(natural(1).read(aptitude), 'INVALID_STATE');
  const initial = {
    schemaVersion: 1,
    rulesVersion: PROGRESSION_RULES.version,
    skillId,
    levelAtStart: skillLevel(stored),
    aptitudeAtStartBps: aptitude,
  };
  let inputs: unknown;
  if (source.kind === 'COURSE') {
    const method = COMPANY_CATALOGUE.methods.find(
      (entry) => entry.id === source.methodId && entry.enabled,
    );
    requireEconomy(
      method?.interval === 'CAMPAIGN_DAY' &&
        method.xp !== undefined &&
        level.read(source.challengeLevel),
      'INVALID_SOURCE',
    );
    inputs = {
      ...initial,
      kind: 'COURSE',
      coursePolicyVersion: 's02-course-effort-1',
      ticksPerDay: String(COMPANY_RULES.ticksPerDay),
      baseMilliXpPerDay: xpToMilliXp(method.xp),
      challengeLevel: source.challengeLevel,
      challengeBps: progressionChallengeBps(source.challengeLevel, initial.levelAtStart),
      outcomeBps: PROGRESSION_RULES.outcomeBps.success,
    };
  } else {
    requireEconomy(work, 'INVALID_SOURCE');
    inputs = {
      ...initial,
      kind: 'BOOK',
      workId: work.id,
      workVersion: work.version,
      sectionId: work.sectionId,
      durationTicks: work.durationTicks,
      finiteMilliXp: xpToMilliXp(work.finiteXp),
      factId: work.factId,
    };
  }
  const retained = snapshotJson(inputs);
  requireEconomy(learningInputsInput.read(retained), 'INVALID_STATE');
  return retained;
}

/** Stored bindings, not a new quote or a lookup of today's learner/catalogue values. */
export function validateLearningInputs(
  inputs: LearningInputs,
  command: CommandOf<'StartLearning'>,
  quote: LearningTaskQuote,
): void {
  const { goal, methodId } = command.payload;
  const matches =
    inputs.kind === 'BOOK'
      ? methodId === 'book-study' &&
        'workId' in goal &&
        goal.workId === inputs.workId &&
        (goal.sectionId === undefined || goal.sectionId === inputs.sectionId) &&
        quote.coefficients.taskScope === 'STUDY' &&
        quote.funding === null
      : methodId === 'funded-practice' &&
        'skillId' in goal &&
        goal.skillId === inputs.skillId &&
        quote.coefficients.taskScope === 'TRAINING' &&
        quote.funding !== null &&
        inputs.challengeBps === progressionChallengeBps(inputs.challengeLevel, inputs.levelAtStart);
  requireEconomy(matches, 'INVALID_STATE');
}
