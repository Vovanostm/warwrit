import { requireEconomy } from './economy-state.js';
import {
  array,
  canonicalJson,
  choice,
  id,
  jsonObject,
  object,
  optional,
  snapshotJson,
  unsigned,
} from './input.js';
import type { JsonValue, ValueOf } from './input.js';
import type { LearningTaskQuote } from './learning-quote.js';
import type { CommandOf } from './lifecycle-types.js';

const reasonInput = choice('PLAYER', 'GOAL', 'FUNDS', 'PREREQUISITES');
const taskInput = object({
  schemaVersion: choice(1),
  taskId: id,
  startCommandId: id,
  characterId: id,
  methodId: id,
  goal: jsonObject,
  resourceIds: array(id, 1, 1000, true),
  quote: jsonObject,
  studyIntervalId: optional(id),
  startedAt: unsigned,
  completedTicks: unsigned,
  endedAt: optional(unsigned),
  stopReason: optional(reasonInput),
  stopCommandId: optional(id),
});
const stateInput = object({ schemaVersion: choice(1), tasks: array(taskInput) });
type StoredTask = ValueOf<typeof taskInput>;

export type LearningTask = Omit<StoredTask, 'goal' | 'quote'> & {
  readonly goal: CommandOf<'StartLearning'>['payload']['goal'];
  readonly quote: LearningTaskQuote;
};
export type LearningTaskStart = Omit<
  LearningTask,
  'schemaVersion' | 'completedTicks' | 'endedAt' | 'stopReason' | 'stopCommandId'
>;
export interface LearningTaskState {
  readonly schemaVersion: 1;
  readonly tasks: readonly LearningTask[];
}
export interface LearningTaskTransition {
  readonly state: LearningTaskState;
  readonly task: LearningTask;
  readonly replayed: boolean;
}

function quoteTicks(value: JsonValue): bigint {
  requireEconomy(typeof value === 'object' && value !== null && !Array.isArray(value), 'INVALID_STATE');
  const maxTicks = (value as { readonly maxTicks?: JsonValue }).maxTicks;
  requireEconomy(
    typeof maxTicks === 'string' && unsigned.read(maxTicks) && BigInt(maxTicks) > 0n,
    'INVALID_STATE',
  );
  return BigInt(maxTicks);
}

export function readLearningTaskState(value: unknown): LearningTaskState {
  const state = snapshotJson(value);
  requireEconomy(stateInput.read(state), 'INVALID_STATE');
  const tasks = state.tasks as unknown as readonly LearningTask[];
  const taskIds = new Set<string>();
  const commandIds = new Set<string>();
  const active = new Set<string>();
  for (const task of tasks) {
    requireEconomy(
      !taskIds.has(task.taskId) && !commandIds.has(task.startCommandId),
      'INVALID_STATE',
    );
    taskIds.add(task.taskId);
    commandIds.add(task.startCommandId);
    requireEconomy(
      BigInt(task.completedTicks) <= quoteTicks(task.quote as unknown as JsonValue),
      'INVALID_STATE',
    );
    const ended = task.endedAt !== undefined;
    requireEconomy(
      ended === (task.stopReason !== undefined) && ended === (task.stopCommandId !== undefined),
      'INVALID_STATE',
    );
    if (ended) {
      requireEconomy(BigInt(task.endedAt!) >= BigInt(task.startedAt), 'INVALID_STATE');
      requireEconomy(!commandIds.has(task.stopCommandId!), 'INVALID_STATE');
      commandIds.add(task.stopCommandId!);
    } else {
      requireEconomy(!active.has(task.characterId), 'INVALID_STATE');
      active.add(task.characterId);
    }
  }
  return state as unknown as LearningTaskState;
}

export const createLearningTaskState = (): LearningTaskState =>
  readLearningTaskState({ schemaVersion: 1, tasks: [] });

function owned<T>(value: T): T {
  const snapshot = snapshotJson(value);
  requireEconomy(snapshot !== undefined, 'INVALID_ARGUMENT');
  return snapshot as T;
}

function startSnapshot(task: LearningTask): LearningTaskStart {
  return {
    taskId: task.taskId,
    startCommandId: task.startCommandId,
    characterId: task.characterId,
    methodId: task.methodId,
    goal: task.goal,
    resourceIds: task.resourceIds,
    quote: task.quote,
    ...(task.studyIntervalId ? { studyIntervalId: task.studyIntervalId } : {}),
    startedAt: task.startedAt,
  };
}

/** C04a only: owns one already-admitted frozen start snapshot. C04b supplies that admission. */
export function startLearningTask(
  stateValue: LearningTaskState,
  startValue: LearningTaskStart,
): LearningTaskTransition {
  const state = readLearningTaskState(stateValue);
  const start = owned(startValue);
  const task = owned<LearningTask>({ schemaVersion: 1, ...start, completedTicks: '0' });
  requireEconomy(taskInput.read(snapshotJson(task)), 'INVALID_ARGUMENT');
  quoteTicks(task.quote as unknown as JsonValue);

  const previous = state.tasks.find(
    (entry) => entry.taskId === task.taskId || entry.startCommandId === task.startCommandId,
  );
  if (previous) {
    requireEconomy(
      canonicalJson(startSnapshot(previous)) === canonicalJson(start),
      'IDEMPOTENCY_CONFLICT',
    );
    return { state, task: previous, replayed: true };
  }
  requireEconomy(
    !state.tasks.some((entry) => entry.characterId === task.characterId && !entry.endedAt),
    'INCOMPATIBLE_ACTIVITY',
  );
  const next = readLearningTaskState({ schemaVersion: 1, tasks: [...state.tasks, task] });
  return { state: next, task, replayed: false };
}

/** C04a only: closes lifecycle, preserving completedTicks for C05 settlement ownership. */
export function stopLearningTask(
  stateValue: LearningTaskState,
  commandValue: CommandOf<'StopLearning'>,
): LearningTaskTransition {
  const state = readLearningTaskState(stateValue);
  const command = owned(commandValue);
  const task = state.tasks.find((entry) => entry.taskId === command.payload.taskId);
  requireEconomy(task, 'INVALID_ARGUMENT');
  requireEconomy(BigInt(command.campaignTick) >= BigInt(task.startedAt), 'INVALID_TIME');
  const player = command.actorRef.kind === 'PLAYER';
  requireEconomy(
    (player && command.payload.reason === 'PLAYER') ||
      (command.actorRef.kind === 'SYSTEM' && command.payload.reason !== 'PLAYER'),
    'AUTHORIZATION',
  );
  if (task.endedAt) {
    if (task.stopCommandId === command.commandId) {
      requireEconomy(
        task.endedAt === command.campaignTick && task.stopReason === command.payload.reason,
        'IDEMPOTENCY_CONFLICT',
      );
      return { state, task, replayed: true };
    }
    requireEconomy(false, 'INCOMPATIBLE_ACTIVITY');
  }
  requireEconomy(
    !state.tasks.some(
      (entry) =>
        entry.startCommandId === command.commandId || entry.stopCommandId === command.commandId,
    ),
    'IDEMPOTENCY_CONFLICT',
  );
  const stopped = owned<LearningTask>({
    ...task,
    endedAt: command.campaignTick,
    stopReason: command.payload.reason,
    stopCommandId: command.commandId,
  });
  const next = readLearningTaskState({
    schemaVersion: 1,
    tasks: state.tasks.map((entry) => (entry.taskId === task.taskId ? stopped : entry)),
  });
  return { state: next, task: stopped, replayed: false };
}
