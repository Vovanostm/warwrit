import { COMPANY_CATALOGUE } from './definitions.js';
import { requireEconomy } from './economy-state.js';
import { array, canonicalJson, choice, id, jsonObject, object, optional, snapshotJson, unsigned } from './input.js';
import type { JsonValue } from './input.js';
import type { LearningTaskQuote } from './learning-quote.js';
import type { CommandOf } from './lifecycle-types.js';
import type { StudyAccessInterval } from './study-access.js';

const stopReason = choice('PLAYER', 'GOAL', 'FUNDS', 'PREREQUISITES');
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
  stopReason: optional(stopReason),
  stopCommandId: optional(id),
});
const stateInput = object({ schemaVersion: choice(1), tasks: array(taskInput) });

export type LearningStopReason = CommandOf<'StopLearning'>['payload']['reason'];
export interface LearningTask {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly startCommandId: string;
  readonly characterId: string;
  readonly methodId: string;
  readonly goal: CommandOf<'StartLearning'>['payload']['goal'];
  readonly resourceIds: readonly string[];
  readonly quote: LearningTaskQuote;
  readonly studyIntervalId?: string;
  readonly startedAt: string;
  readonly completedTicks: string;
  readonly endedAt?: string;
  readonly stopReason?: LearningStopReason;
  readonly stopCommandId?: string;
}
export interface LearningTaskState {
  readonly schemaVersion: 1;
  readonly tasks: readonly LearningTask[];
}
export interface LearningTaskStart {
  readonly taskId: string;
  readonly command: CommandOf<'StartLearning'>;
  readonly quote: LearningTaskQuote;
  readonly studyInterval?: StudyAccessInterval;
}
export interface LearningTaskTransition {
  readonly state: LearningTaskState;
  readonly task: LearningTask;
  readonly replayed: boolean;
}

function quoteMaxTicks(value: JsonValue): bigint {
  requireEconomy(
    typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value.maxTicks === 'string' &&
      unsigned.read(value.maxTicks) &&
      BigInt(value.maxTicks) > 0n,
    'INVALID_STATE',
  );
  return BigInt(value.maxTicks);
}

export function readLearningTaskState(value: unknown): LearningTaskState {
  const state = snapshotJson(value);
  requireEconomy(stateInput.read(state), 'INVALID_STATE');
  const tasks = state.tasks as unknown as readonly LearningTask[];
  const taskIds = new Set<string>();
  const startIds = new Set<string>();
  const active = new Set<string>();
  for (const task of tasks) {
    requireEconomy(!taskIds.has(task.taskId) && !startIds.has(task.startCommandId), 'INVALID_STATE');
    taskIds.add(task.taskId);
    startIds.add(task.startCommandId);
    const maximum = quoteMaxTicks(task.quote as unknown as JsonValue);
    requireEconomy(BigInt(task.completedTicks) <= maximum, 'INVALID_STATE');
    const ended = task.endedAt !== undefined;
    requireEconomy(
      ended === (task.stopReason !== undefined) && ended === (task.stopCommandId !== undefined),
      'INVALID_STATE',
    );
    if (ended) requireEconomy(BigInt(task.endedAt!) >= BigInt(task.startedAt), 'INVALID_STATE');
    else {
      requireEconomy(!active.has(task.characterId), 'INVALID_STATE');
      active.add(task.characterId);
    }
  }
  return state as unknown as LearningTaskState;
}

export function createLearningTaskState(): LearningTaskState {
  return readLearningTaskState({ schemaVersion: 1, tasks: [] });
}

function owned<T>(value: T): T {
  const snapshot = snapshotJson(value);
  requireEconomy(snapshot !== undefined, 'INVALID_ARGUMENT');
  return snapshot as T;
}

function methodFor(methodId: string) {
  const method = COMPANY_CATALOGUE.methods.find((entry) => entry.id === methodId && entry.enabled);
  requireEconomy(method, 'INVALID_ARGUMENT');
  return method;
}

/** C04 only: records a finite task snapshot. It does not settle elapsed time, XP or money. */
export function startLearningTask(
  stateValue: LearningTaskState,
  start: LearningTaskStart,
): LearningTaskTransition {
  const state = readLearningTaskState(stateValue);
  const command = owned(start.command);
  const quote = owned(start.quote);
  requireEconomy(command.type === 'StartLearning' && command.actorRef.kind === 'PLAYER', 'AUTHORIZATION');
  requireEconomy(id.read(start.taskId), 'INVALID_ARGUMENT');
  const method = methodFor(command.payload.methodId);
  const maxTicks = BigInt(quote.maxTicks);
  requireEconomy(maxTicks > 0n && maxTicks <= BigInt(command.payload.goal.maxTicks), 'INVALID_SOURCE');
  requireEconomy(quote.coefficients.holderId === command.payload.characterId, 'INVALID_SOURCE');

  let studyIntervalId: string | undefined;
  if (method.interval === 'FINITE_SECTION') {
    requireEconomy('workId' in command.payload.goal, 'INVALID_ARGUMENT');
    requireEconomy(
      quote.funding === null && quote.mentorId === null && quote.coefficients.taskScope === 'STUDY',
      'INVALID_SOURCE',
    );
    const interval = start.studyInterval;
    requireEconomy(interval !== undefined, 'CONTACT_OR_ACCESS_REQUIRED');
    const sectionId = command.payload.goal.sectionId ?? interval.sectionId;
    requireEconomy(
      interval.characterId === command.payload.characterId &&
        interval.workId === command.payload.goal.workId &&
        interval.sectionId === sectionId &&
        command.payload.resourceIds.includes(interval.itemId) &&
        interval.fromTick === command.campaignTick &&
        BigInt(interval.toTick) === BigInt(command.campaignTick) + maxTicks,
      'INVALID_SOURCE',
    );
    studyIntervalId = interval.intervalId;
  } else {
    requireEconomy('skillId' in command.payload.goal && start.studyInterval === undefined, 'INVALID_ARGUMENT');
    requireEconomy(
      quote.funding !== null && quote.mentorId !== null && quote.coefficients.taskScope === 'TRAINING',
      'INVALID_SOURCE',
    );
  }

  const task = owned<LearningTask>({
    schemaVersion: 1,
    taskId: start.taskId,
    startCommandId: command.commandId,
    characterId: command.payload.characterId,
    methodId: command.payload.methodId,
    goal: command.payload.goal,
    resourceIds: command.payload.resourceIds,
    quote,
    ...(studyIntervalId === undefined ? {} : { studyIntervalId }),
    startedAt: command.campaignTick,
    completedTicks: '0',
  });
  const previous = state.tasks.find(
    (entry) => entry.taskId === task.taskId || entry.startCommandId === task.startCommandId,
  );
  if (previous) {
    requireEconomy(canonicalJson(previous) === canonicalJson(task), 'IDEMPOTENCY_CONFLICT');
    return { state, task: previous, replayed: true };
  }
  requireEconomy(
    !state.tasks.some((entry) => entry.characterId === task.characterId && entry.endedAt === undefined),
    'INCOMPATIBLE_ACTIVITY',
  );
  const next = readLearningTaskState({ schemaVersion: 1, tasks: [...state.tasks, task] });
  return { state: next, task, replayed: false };
}

/** C04 only: closes task lifecycle and preserves completedTicks for C05 settlement ownership. */
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
  if (task.endedAt !== undefined) {
    if (task.stopCommandId === command.commandId) {
      requireEconomy(
        task.endedAt === command.campaignTick && task.stopReason === command.payload.reason,
        'IDEMPOTENCY_CONFLICT',
      );
      return { state, task, replayed: true };
    }
    throw new Error('INCOMPATIBLE_ACTIVITY');
  }
  requireEconomy(
    !state.tasks.some(
      (entry) => entry.startCommandId === command.commandId || entry.stopCommandId === command.commandId,
    ),
    'IDEMPOTENCY_CONFLICT',
  );
  const stopped: LearningTask = {
    ...task,
    endedAt: command.campaignTick,
    stopReason: command.payload.reason,
    stopCommandId: command.commandId,
  };
  const next = readLearningTaskState({
    schemaVersion: 1,
    tasks: state.tasks.map((entry) => (entry.taskId === task.taskId ? stopped : entry)),
  });
  return { state: next, task: stopped, replayed: false };
}
