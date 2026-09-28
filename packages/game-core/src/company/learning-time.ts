import { EconomyViolation, requireEconomy } from './economy-state.js';
import { guardCompanyCommand } from './guards.js';
import {
  array,
  canonicalJson,
  choice,
  either,
  id,
  object,
  optional,
  snapshotJson,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';
import type { LearningQuoteContext } from './learning-quote.js';
import type { LearningTask } from './learning-task.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import { canPerform } from './lifecycle-state.js';
import type { LifecycleCharacter } from './lifecycle-types.js';
import { readLearningTaskState } from './learning-task.js';
import type { CommandOf } from './lifecycle-types.js';

const atLocation = object({ kind: choice('AT'), siteId: id, areaId: id });
const nil = { schema: { type: 'null' }, read: (value: unknown): value is null => value === null };
const nullableId = either(nil, id);
const coursePersonObservationInput = object({
  observationId: id,
  characterId: id,
  fromTick: unsigned,
  toTick: unsigned,
  location: atLocation,
  assignment: choice('FIELD', 'HOME_RESERVE', 'RECOVERY', 'GARRISON', 'REMOTE_TASK', 'NONE'),
  availability: choice('AVAILABLE', 'IN_ENCOUNTER', 'OUT_OF_CONTACT', 'CAPTIVE', 'DEAD'),
  encounterBindingId: nullableId,
  conditionIds: array(id, 0, 1000, true),
});
const courseAttendanceInput = object({
  attendanceId: id,
  sourceId: id,
  sourceVersion: id,
  taskId: id,
  companyId: id,
  worldId: id,
  learnerId: id,
  providerId: id,
  mentorId: id,
  skillId: id,
  resourceIds: array(id, 1, 1000, true),
  location: atLocation,
  fromTick: unsigned,
  toTick: unsigned,
  membership: object({
    membershipId: id,
    companyId: id,
    characterId: id,
    startedAt: unsigned,
    endedAt: nullableId,
  }),
  observations: array(coursePersonObservationInput, 2, 3, true),
});
const intervalInput = object({
  intervalId: id,
  taskId: id,
  commandId: id,
  ownerIntervalId: id,
  companyId: id,
  worldId: id,
  characterId: id,
  fromTick: unsigned,
  toTick: unsigned,
  kind: choice('ELIGIBLE', 'INELIGIBLE'),
  courseAttendance: optional(courseAttendanceInput),
});
const intervalsInput = array(intervalInput, 0, 1000, true);

/**
 * Internal adapter evidence for one fully classified campaign segment. Producers must
 * derive these from canonical owner records; this is not a client command DTO.
 * Ineligible segments are explicit so missing history cannot be mistaken for elapsed work.
 */
export interface LearningTimeInterval {
  readonly intervalId: string;
  readonly taskId: string;
  readonly commandId: string;
  /** StudyAccess interval for books; the admitted task/source identity for courses. */
  readonly ownerIntervalId: string;
  readonly companyId: string;
  readonly worldId: string;
  readonly characterId: string;
  readonly fromTick: string;
  readonly toTick: string;
  readonly kind: 'ELIGIBLE' | 'INELIGIBLE';
  readonly courseAttendance?: CourseAttendanceEvidence;
}

export type CourseAttendanceEvidence = ValueOf<typeof courseAttendanceInput>;

export interface LearningTimePreparation {
  readonly taskId: string;
  readonly commandId: string;
  readonly fromTick: string;
  readonly throughTick: string;
  readonly intervals: readonly LearningTimeInterval[];
  readonly eligibleTicks: string;
}

export function readLearningTimeIntervals(value: unknown): readonly LearningTimeInterval[] {
  const snapshot = snapshotJson(value);
  requireEconomy(intervalsInput.read(snapshot), 'INVALID_SOURCE');
  return snapshot as unknown as readonly LearningTimeInterval[];
}

function sameIds(left: readonly string[], right: readonly string[]) {
  const sortedRight = [...right].sort();
  return (
    left.length === right.length && [...left].sort().every((id, index) => id === sortedRight[index])
  );
}

function validateCourseAttendance(
  task: LearningTask,
  interval: LearningTimeInterval,
  context: LearningQuoteContext,
  command: CommandOf<'AdvanceCampaign'>,
): void {
  const inputs = task.start.inputs;
  const attendance = interval.courseAttendance;
  if (inputs?.kind !== 'COURSE') {
    requireEconomy(attendance === undefined, 'INVALID_SOURCE');
    return;
  }
  if (interval.kind === 'INELIGIBLE') {
    requireEconomy(attendance === undefined, 'INVALID_SOURCE');
    return;
  }
  requireEconomy(attendance, 'INVALID_SOURCE');
  const sources = context.learningFacts.filter(
    (source) =>
      source.id === task.start.quote.sourceId &&
      source.sourceVersion === task.start.quote.sourceVersion,
  );
  const source = sources[0];
  requireEconomy(sources.length === 1 && source?.kind === 'COURSE', 'INVALID_SOURCE');
  const start = task.start.command;
  const providerId = source.providerId;
  const mentorId = source.mentorId;
  const location = source.location;
  requireEconomy(
    providerId !== undefined &&
      mentorId !== undefined &&
      source.companyId === context.companyId &&
      source.worldId === context.worldId &&
      source.learnerId === start.payload.characterId &&
      source.atTick === start.campaignTick &&
      BigInt(interval.fromTick) >= BigInt(source.atTick) &&
      BigInt(interval.toTick) <= BigInt(source.expiresAt) &&
      source.skillId === inputs.skillId &&
      sameIds(source.resourceIds, start.payload.resourceIds) &&
      sameIds(attendance.resourceIds, start.payload.resourceIds) &&
      attendance.sourceId === source.id &&
      attendance.sourceVersion === source.sourceVersion &&
      attendance.taskId === task.start.taskId &&
      attendance.companyId === context.companyId &&
      attendance.worldId === context.worldId &&
      attendance.learnerId === start.payload.characterId &&
      attendance.providerId === providerId &&
      attendance.mentorId === mentorId &&
      attendance.skillId === inputs.skillId &&
      canonicalJson(attendance.location) === canonicalJson(location) &&
      attendance.fromTick === interval.fromTick &&
      attendance.toTick === interval.toTick &&
      canonicalJson(attendance.membership.companyId) === canonicalJson(context.companyId) &&
      attendance.membership.characterId === attendance.learnerId &&
      BigInt(attendance.membership.startedAt) <= BigInt(interval.fromTick) &&
      (attendance.membership.endedAt === null ||
        BigInt(attendance.membership.endedAt) >= BigInt(interval.toTick)),
    'INVALID_SOURCE',
  );
  const authoritativeInputs = new Set(command.payload.authoritativeInputs);
  const evidenceIds = [
    attendance.attendanceId,
    attendance.membership.membershipId,
    ...attendance.observations.map((entry) => entry.observationId),
  ];
  requireEconomy(
    evidenceIds.every((evidenceId) => authoritativeInputs.has(evidenceId)),
    'INVALID_SOURCE',
  );
  const observations = new Map(attendance.observations.map((entry) => [entry.characterId, entry]));
  const expectedCharacters = new Set([attendance.learnerId, providerId, mentorId]);
  requireEconomy(
    observations.size === expectedCharacters.size &&
      [...expectedCharacters].every((characterId) => observations.has(characterId)),
    'INVALID_SOURCE',
  );
  for (const characterId of expectedCharacters) {
    const observation = observations.get(characterId)!;
    const capability = characterId === attendance.learnerId ? 'study' : 'basicWork';
    requireEconomy(
      observation.fromTick === interval.fromTick &&
        observation.toTick === interval.toTick &&
        canonicalJson(observation.location) === canonicalJson(location) &&
        observation.conditionIds.every((conditionId) =>
          COMPANY_CATALOGUE.conditions.some((condition) => condition.id === conditionId),
        ) &&
        canPerform(
          {
            presence: {
              characterId: observation.characterId,
              assignment: observation.assignment,
              availability: observation.availability,
              location: observation.location,
              fieldPartyId: null,
              encounterBindingId: observation.encounterBindingId,
            },
            conditionIds: observation.conditionIds,
          } as unknown as LifecycleCharacter,
          capability,
        ),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
  }
}

/** C05-TIME validates a trusted, complete timeline; it does not settle or mutate owners. */
export function prepareLearningTime(
  taskValue: LearningTask,
  command: CommandOf<'AdvanceCampaign'>,
  context: LearningQuoteContext,
  intervalValues: readonly LearningTimeInterval[],
): LearningTimePreparation {
  const task = readLearningTaskState({ schemaVersion: 1, tasks: [taskValue] }).tasks[0]!;
  const { start } = task;
  const guarded = guardCompanyCommand(command, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  const characterId = start.command.payload.characterId;
  const fromTick = task.processedThroughTick ?? start.command.campaignTick;
  if (task.processedThroughTick === undefined && task.completedTicks !== '0')
    throw new RangeError('LEARNING_HISTORY_REQUIRED');
  requireEconomy(
    command.type === 'AdvanceCampaign' &&
      command.companyId === context.companyId &&
      command.worldId === context.worldId &&
      command.campaignTick === context.atTick &&
      command.payload.toTick === context.atTick &&
      context.companyId === start.command.companyId &&
      context.worldId === start.command.worldId &&
      BigInt(context.atTick) >= BigInt(fromTick),
    'INVALID_TIME',
  );

  const intervals = readLearningTimeIntervals(intervalValues);
  const seen = new Set<string>();
  let cursor = BigInt(fromTick);
  let eligible = 0n;
  for (const interval of intervals) {
    const from = BigInt(interval.fromTick);
    const to = BigInt(interval.toTick);
    requireEconomy(
      interval.taskId === start.taskId &&
        interval.commandId === command.commandId &&
        interval.ownerIntervalId === (start.studyIntervalId ?? start.quote.sourceId) &&
        interval.companyId === context.companyId &&
        interval.worldId === context.worldId &&
        interval.characterId === characterId &&
        command.payload.authoritativeInputs.includes(interval.intervalId) &&
        command.payload.authoritativeInputs.includes(interval.ownerIntervalId) &&
        !seen.has(interval.intervalId) &&
        from === cursor &&
        from < to &&
        to <= BigInt(context.atTick),
      'INVALID_SOURCE',
    );
    validateCourseAttendance(task, interval, context, command);
    seen.add(interval.intervalId);
    if (interval.kind === 'ELIGIBLE') eligible += to - from;
    cursor = to;
  }
  if (cursor !== BigInt(context.atTick)) throw new RangeError('LEARNING_HISTORY_REQUIRED');
  const remaining = BigInt(start.quote.maxTicks) - BigInt(task.completedTicks);
  requireEconomy(remaining >= 0n, 'INVALID_TIME');
  return Object.freeze({
    taskId: start.taskId,
    commandId: command.commandId,
    fromTick,
    throughTick: cursor.toString(),
    intervals: Object.freeze(intervals),
    eligibleTicks: (eligible < remaining ? eligible : remaining).toString(),
  });
}
