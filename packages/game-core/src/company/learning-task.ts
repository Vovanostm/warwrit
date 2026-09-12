import { parseCompanyCommand } from './commands.js';
import { requireEconomy } from './economy-state.js';
import {
  array,
  canonicalJson,
  choice,
  either,
  id,
  jsonObject,
  natural,
  object,
  optional,
  snapshotJson,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';
import type { LearningTaskQuote } from './learning-quote.js';
import type { CommandOf } from './lifecycle-types.js';

const nil = { schema: { type: 'null' }, read: (value: unknown): value is null => value === null };
const positive = {
  ...unsigned,
  read: (value: unknown): value is string => unsigned.read(value) && BigInt(value) > 0n,
};
const ratio = object({ numerator: positive, denominator: positive });
const integer = natural(-Number.MAX_SAFE_INTEGER);
// Shape validation only: these frozen observations are not recalculated domain facts.
const quoteInput = object({
  sourceId: id,
  sourceVersion: id,
  maxTicks: positive,
  mentorId: either(nil, id),
  funding: either(
    nil,
    object({
      poolId: id,
      walletId: id,
      providerWalletId: id,
      authorizedBudgetQ: positive,
      costQPerDay: ratio,
    }),
  ),
  coefficients: object({
    schemaVersion: choice(1),
    kind: choice('CHARACTER'),
    catalogueVersion: id,
    rulesetId: id,
    holderId: id,
    taskScope: choice('STUDY', 'TRAINING'),
    contributingPerkIds: array(id, 0, 1000, true),
    weapon: either(nil, object({ itemId: id, profileId: id })),
    additive: object({
      accuracy: integer,
      initiative: integer,
      defense: integer,
      maxStamina: integer,
    }),
    task: object({
      careRecoveryBps: ratio,
      careCostBps: ratio,
      studyDurationBps: ratio,
      trainingCostBps: ratio,
      trainingDurationBps: ratio,
    }),
  }),
});
const startInput = object({
  taskId: id,
  command: jsonObject,
  quote: quoteInput,
  studyIntervalId: optional(id),
});
const taskInput = object({
  schemaVersion: choice(1),
  start: startInput,
  completedTicks: unsigned,
  stop: optional(jsonObject),
});
const stateInput = object({ schemaVersion: choice(1), tasks: array(taskInput) });
export type LearningTaskStart = Omit<ValueOf<typeof startInput>, 'command' | 'quote'> & {
  readonly command: CommandOf<'StartLearning'>;
  readonly quote: LearningTaskQuote;
};
export type LearningTask = Omit<ValueOf<typeof taskInput>, 'start' | 'stop'> & {
  readonly start: LearningTaskStart;
  readonly stop?: CommandOf<'StopLearning'>;
};
export interface LearningTaskState {
  readonly schemaVersion: 1;
  readonly tasks: readonly LearningTask[];
}
export interface LearningTaskTransition {
  readonly state: LearningTaskState;
  readonly task: LearningTask;
  readonly replayed: boolean;
}

function authorized(command: CommandOf<'StopLearning'>) {
  return command.actorRef.kind === 'PLAYER'
    ? command.payload.reason === 'PLAYER'
    : command.actorRef.kind === 'SYSTEM' && command.payload.reason !== 'PLAYER';
}
function usedCommand(task: LearningTask, id: string) {
  return task.start.command.commandId === id || task.stop?.commandId === id;
}

export function readLearningTaskState(value: unknown): LearningTaskState {
  const state = snapshotJson(value);
  requireEconomy(stateInput.read(state), 'INVALID_STATE');
  const tasks = state.tasks as unknown as readonly LearningTask[];
  const taskIds = new Set<string>();
  const commandIds = new Set<string>();
  const learnerEnds = new Map<string, string | null>();
  for (const task of tasks) {
    const { start, stop } = task;
    const parsed = parseCompanyCommand(start.command);
    requireEconomy(parsed.ok && parsed.command.type === 'StartLearning', 'INVALID_STATE');
    const command = parsed.command;
    const previousEnd = learnerEnds.get(command.payload.characterId);
    requireEconomy(
      command.actorRef.kind === 'PLAYER' &&
        command.payload.resourceIds.length > 0 &&
        !taskIds.has(start.taskId) &&
        !commandIds.has(command.commandId) &&
        (previousEnd === undefined ||
          (previousEnd !== null && BigInt(command.campaignTick) >= BigInt(previousEnd))) &&
        start.quote.coefficients.holderId === command.payload.characterId &&
        BigInt(task.completedTicks) <= BigInt(start.quote.maxTicks) &&
        BigInt(start.quote.maxTicks) <= BigInt(command.payload.goal.maxTicks),
      'INVALID_STATE',
    );
    taskIds.add(start.taskId);
    commandIds.add(command.commandId);
    if (stop) {
      const parsedStop = parseCompanyCommand(stop);
      requireEconomy(parsedStop.ok && parsedStop.command.type === 'StopLearning', 'INVALID_STATE');
      requireEconomy(
        authorized(stop) &&
          !commandIds.has(stop.commandId) &&
          stop.payload.taskId === start.taskId &&
          stop.companyId === command.companyId &&
          stop.worldId === command.worldId &&
          BigInt(stop.campaignTick) - BigInt(command.campaignTick) >= BigInt(task.completedTicks),
        'INVALID_STATE',
      );
      commandIds.add(stop.commandId);
    }
    learnerEnds.set(command.payload.characterId, stop?.campaignTick ?? null);
  }
  return state as unknown as LearningTaskState;
}
export const createLearningTaskState = (): LearningTaskState =>
  readLearningTaskState({ schemaVersion: 1, tasks: [] });

/** C04a owns an already-admitted start; C04b alone composes physical access and the quote. */
export function startLearningTask(
  stateValue: LearningTaskState,
  startValue: LearningTaskStart,
): LearningTaskTransition {
  const state = readLearningTaskState(stateValue);
  const start = snapshotJson(startValue);
  requireEconomy(startInput.read(start), 'INVALID_ARGUMENT');
  const parsed = parseCompanyCommand(start.command);
  requireEconomy(parsed.ok && parsed.command.type === 'StartLearning', 'INVALID_ARGUMENT');
  const command = parsed.command;
  const previous = state.tasks.find(
    (task) => task.start.taskId === start.taskId || usedCommand(task, command.commandId),
  );
  if (previous) {
    requireEconomy(canonicalJson(previous.start) === canonicalJson(start), 'IDEMPOTENCY_CONFLICT');
    return { state, task: previous, replayed: true };
  }
  requireEconomy(
    state.tasks.every(
      (task) => task.start.command.payload.characterId !== command.payload.characterId || task.stop,
    ),
    'INCOMPATIBLE_ACTIVITY',
  );
  const next = readLearningTaskState({
    schemaVersion: 1,
    tasks: [...state.tasks, { schemaVersion: 1, start, completedTicks: '0' }],
  });
  return { state: next, task: next.tasks.at(-1)!, replayed: false };
}

/** Lifecycle close only. C05 owns settlement; a stop never creates a replacement task. */
export function stopLearningTask(
  stateValue: LearningTaskState,
  commandValue: CommandOf<'StopLearning'>,
): LearningTaskTransition {
  const state = readLearningTaskState(stateValue);
  const parsed = parseCompanyCommand(commandValue);
  requireEconomy(parsed.ok && parsed.command.type === 'StopLearning', 'INVALID_ARGUMENT');
  const command = parsed.command;
  const previous = state.tasks.find((task) => usedCommand(task, command.commandId));
  if (previous) {
    requireEconomy(
      previous.stop && canonicalJson(previous.stop) === canonicalJson(command),
      'IDEMPOTENCY_CONFLICT',
    );
    return { state, task: previous, replayed: true };
  }
  const index = state.tasks.findIndex((task) => task.start.taskId === command.payload.taskId);
  const task = state.tasks[index];
  requireEconomy(task, 'INVALID_ARGUMENT');
  requireEconomy(authorized(command), 'AUTHORIZATION');
  requireEconomy(!task.stop, 'INCOMPATIBLE_ACTIVITY');
  requireEconomy(
    BigInt(command.campaignTick) >= BigInt(task.start.command.campaignTick),
    'INVALID_TIME',
  );
  const next = readLearningTaskState({
    schemaVersion: 1,
    tasks: state.tasks.map((entry) => (entry === task ? { ...task, stop: command } : entry)),
  });
  return { state: next, task: next.tasks[index]!, replayed: false };
}
