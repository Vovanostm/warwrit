import { canonicalJson, choice, either, id, object, snapshotJson, unsigned } from './input.js';
import { requireEconomy } from './economy-state.js';
import { parseCompanyCommand } from './commands.js';
import type { CompanyEconomyState } from './economy-types.js';
import type { LearningTaskState } from './learning-task.js';
import { readLearningTaskState } from './learning-task.js';
import type { StudyAccessState } from './study-access.js';
import {
  closeStudyAccessForItems,
  readStudyAccessState,
  hasStudyAccessOwner,
} from './study-access.js';
import type { StudySectionProgress } from './study-section.js';
import { readStudySectionProgress } from './study-section.js';
import { COMPANY_CATALOGUE } from './definitions.js';

export interface CompanyLearningState {
  readonly schemaVersion: 1;
  readonly tasks: LearningTaskState;
  readonly studyAccess: StudyAccessState;
  /** Separate personal progress for each learner and finite section. */
  readonly studyProgress: readonly StudySectionProgress[];
  readonly ownerTransitions: readonly LearningOwnerTransition[];
}

export interface LearningOwnerTransition {
  readonly kind: 'BOOK_TRANSFER';
  readonly commandId: string;
  readonly atTick: string;
  readonly learnerId: string | null;
  readonly itemId: string;
  readonly fromContainerId: string;
  readonly toContainerId: string;
  readonly taskId: string | null;
}

const transitionInput = object({
  kind: choice('BOOK_TRANSFER'),
  commandId: id,
  atTick: unsigned,
  learnerId: either(
    { schema: { type: 'null' }, read: (value: unknown): value is null => value === null },
    id,
  ),
  itemId: id,
  fromContainerId: id,
  toContainerId: id,
  taskId: either(
    { schema: { type: 'null' }, read: (value: unknown): value is null => value === null },
    id,
  ),
});

export function readCompanyLearningState(value: unknown): CompanyLearningState {
  const snapshot = snapshotJson(value) as CompanyLearningState | undefined;
  requireEconomy(
    snapshot !== undefined &&
      snapshot !== null &&
      typeof snapshot === 'object' &&
      snapshot.schemaVersion === 1 &&
      Array.isArray(snapshot.studyProgress) &&
      Array.isArray(snapshot.ownerTransitions) &&
      snapshot.ownerTransitions.every((entry) => transitionInput.read(entry)),
    'INVALID_STATE',
  );
  const tasks = readLearningTaskState(snapshot.tasks);
  const studyAccess = readStudyAccessState(snapshot.studyAccess);
  const studyProgress = snapshot.studyProgress.map(readStudySectionProgress);
  requireEconomy(
    new Set(studyProgress.map((p) => `${p.characterId}\0${p.workId}\0${p.sectionId}`)).size ===
      studyProgress.length &&
      new Set(snapshot.ownerTransitions.map((entry) => entry.commandId)).size ===
        snapshot.ownerTransitions.length,
    'INVALID_STATE',
  );
  return Object.freeze({ ...snapshot, tasks, studyAccess, studyProgress });
}

export function createCompanyLearningState(): CompanyLearningState {
  return readCompanyLearningState({
    schemaVersion: 1,
    tasks: { schemaVersion: 1, tasks: [] },
    studyAccess: { schemaVersion: 1, intervals: [] },
    studyProgress: [],
    ownerTransitions: [],
  });
}

/** Retains a nonsplit book transfer only after the economy candidate proves it happened. */
export function recordBookTransfer(
  learningValue: CompanyLearningState,
  before: CompanyEconomyState,
  after: CompanyEconomyState,
  commandValue: unknown,
): CompanyLearningState {
  const learning = readCompanyLearningState(learningValue);
  const parsed = parseCompanyCommand(commandValue);
  requireEconomy(parsed.ok && parsed.command.type === 'TransferItem', 'INVALID_ARGUMENT');
  const command = parsed.command;
  requireEconomy(before.physical && after.physical, 'INVALID_STATE');
  requireEconomy(
    before.lifecycle.companyId === after.lifecycle.companyId &&
      before.lifecycle.worldId === after.lifecycle.worldId &&
      command.companyId === before.lifecycle.companyId &&
      command.worldId === before.lifecycle.worldId &&
      before.lifecycle.revision !== after.lifecycle.revision &&
      !before.finance.applied.some((receipt) => receipt.commandId === command.commandId) &&
      after.finance.applied.some(
        (receipt) =>
          receipt.commandId === command.commandId && receipt.requestKey === canonicalJson(command),
      ) &&
      after.lifecycle.campaignTick === command.campaignTick &&
      !learning.ownerTransitions.some((entry) => entry.commandId === command.commandId),
    'INVALID_SOURCE',
  );
  const oldItem = before.physical.items.find((item) => item.itemId === command.payload.itemId);
  const nextItem = after.physical.items.find((item) => item.itemId === command.payload.itemId);
  requireEconomy(
    oldItem &&
      nextItem &&
      oldItem.containerId !== nextItem.containerId &&
      oldItem.definitionId === nextItem.definitionId &&
      COMPANY_CATALOGUE.items.some(
        (definition) => definition.id === oldItem.definitionId && definition.kind === 'book',
      ) &&
      oldItem.quantity === 1 &&
      nextItem.quantity === 1 &&
      oldItem.containerId === command.payload.fromContainerId &&
      nextItem.containerId === command.payload.toContainerId &&
      oldItem.owner.kind === nextItem.owner.kind &&
      oldItem.owner.id === nextItem.owner.id &&
      oldItem.tombstone === null &&
      nextItem.tombstone === null,
    'INVALID_SOURCE',
  );
  const task = learning.tasks.tasks.find(
    (entry) =>
      !entry.stop &&
      (!entry.terminal || entry.terminal.commandId === command.commandId) &&
      entry.start.inputs?.kind === 'BOOK' &&
      entry.start.command.payload.resourceIds.includes(oldItem.itemId) &&
      hasStudyAccessOwner(learning.studyAccess.intervals, {
        intervalId: entry.start.studyIntervalId,
        itemId: oldItem.itemId,
        characterId: entry.start.command.payload.characterId,
      }),
  );
  if (task) {
    const effects = (after.finance.learningEffects ?? []).filter(
      (effect) =>
        effect.companyId === after.lifecycle.companyId &&
        effect.worldId === after.lifecycle.worldId &&
        effect.taskId === task.start.taskId &&
        effect.commandId === command.commandId,
    );
    requireEconomy(
      effects.length === 1 && effects[0]?.acceptedTicks === task.completedTicks,
      'INVALID_SOURCE',
    );
  }
  const studyAccess = closeStudyAccessForItems(
    learning.studyAccess,
    [oldItem.itemId],
    command.campaignTick,
  );
  const tasks =
    task && !task.terminal
      ? readLearningTaskState({
          schemaVersion: 1,
          tasks: learning.tasks.tasks.map((entry) =>
            entry.start.taskId === task.start.taskId
              ? {
                  ...entry,
                  terminal: {
                    kind: 'INTERRUPTED',
                    commandId: command.commandId,
                    campaignTick: command.campaignTick,
                    processedThroughTick: entry.processedThroughTick ?? command.campaignTick,
                  },
                }
              : entry,
          ),
        })
      : learning.tasks;
  const transition: LearningOwnerTransition = {
    kind: 'BOOK_TRANSFER',
    commandId: command.commandId,
    atTick: command.campaignTick,
    learnerId: task?.start.command.payload.characterId ?? null,
    itemId: oldItem.itemId,
    fromContainerId: oldItem.containerId!,
    toContainerId: nextItem.containerId!,
    taskId: task?.start.taskId ?? null,
  };
  return readCompanyLearningState({
    ...learning,
    tasks,
    studyAccess,
    ownerTransitions: [...learning.ownerTransitions, transition],
  });
}
