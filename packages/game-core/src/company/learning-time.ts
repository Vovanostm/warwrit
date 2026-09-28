import { EconomyViolation, requireEconomy } from './economy-state.js';
import { guardCompanyCommand } from './guards.js';
import { array, choice, id, object, snapshotJson, unsigned } from './input.js';
import type { LearningQuoteContext } from './learning-quote.js';
import type { LearningTask } from './learning-task.js';
import { readLearningTaskState } from './learning-task.js';
import type { CommandOf } from './lifecycle-types.js';

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
}

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
