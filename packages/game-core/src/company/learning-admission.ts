import { EconomyViolation, requireEconomy } from './economy-state.js';
import { checkFreshCompanyRevision, guardCompanyCommand } from './guards.js';
import { id, jsonObject, object, optional, snapshotJson } from './input.js';
import { quoteLearningTask } from './learning-quote.js';
import type { LearningQuoteContext } from './learning-quote.js';
import { readLearningTaskState, startLearningTask } from './learning-task.js';
import type {
  LearningTaskStart,
  LearningTaskState,
  LearningTaskTransition,
} from './learning-task.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { admitStudyInterval, readStudyAccessState } from './study-access.js';
import type { StudyAccessRequest, StudyAccessState } from './study-access.js';

const admissionInput = object({
  taskId: id,
  command: jsonObject,
  study: optional(object({ intervalId: id, itemId: id, accessEvidenceId: id })),
});
export type LearningTaskAdmission = Pick<LearningTaskStart, 'taskId' | 'command'> & {
  readonly study?: Pick<StudyAccessRequest, 'intervalId' | 'itemId' | 'accessEvidenceId'>;
};

/** Internal candidate composition only; C08 owns public activation, C05 owns settlement. */
export function admitLearningTask(
  stateValue: LearningTaskState,
  studyValue: StudyAccessState,
  root: MaterializedCompanyState,
  context: LearningQuoteContext,
  requestValue: LearningTaskAdmission,
): LearningTaskTransition & { readonly studyAccess: StudyAccessState } {
  const request = snapshotJson(requestValue);
  requireEconomy(admissionInput.read(request), 'INVALID_ARGUMENT');
  const guarded = guardCompanyCommand(request.command, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  requireEconomy(guarded.command.type === 'StartLearning', 'INVALID_ARGUMENT');
  const command = guarded.command;
  requireEconomy(
    context.companyId === root.lifecycle.companyId && context.worldId === root.lifecycle.worldId,
    'INVALID_SOURCE',
  );
  const state = readLearningTaskState(stateValue);
  let studyAccess = readStudyAccessState(studyValue);
  const { taskId, study } = request;
  const binding = study ? { studyIntervalId: study.intervalId } : {};
  const payload = command.payload;
  const previous = state.tasks.find(
    (task) =>
      task.start.taskId === taskId ||
      task.start.command.commandId === command.commandId ||
      task.stop?.commandId === command.commandId,
  );
  if (previous) {
    // C04a compares the complete explicit start; ambient observations are not retry identity.
    const replay = startLearningTask(state, {
      taskId,
      command,
      quote: previous.start.quote,
      ...binding,
    });
    requireEconomy(('workId' in payload.goal) === (study !== undefined), 'IDEMPOTENCY_CONFLICT');
    if (study) {
      const interval = studyAccess.intervals.find((entry) => entry.intervalId === study.intervalId);
      requireEconomy(
        interval &&
          'workId' in payload.goal &&
          interval.itemId === study.itemId &&
          interval.accessEvidenceId === study.accessEvidenceId &&
          interval.characterId === payload.characterId &&
          interval.workId === payload.goal.workId &&
          (payload.goal.sectionId === undefined || interval.sectionId === payload.goal.sectionId) &&
          payload.resourceIds.includes(interval.itemId) &&
          interval.fromTick === command.campaignTick &&
          BigInt(interval.toTick) ===
            BigInt(command.campaignTick) + BigInt(previous.start.quote.maxTicks),
        'IDEMPOTENCY_CONFLICT',
      );
    }
    return { ...replay, studyAccess };
  }
  requireEconomy(
    context.canonicalRevision === root.lifecycle.revision &&
      checkFreshCompanyRevision(command, context),
    'INVALID_SOURCE',
  );
  requireEconomy(command.campaignTick === context.atTick, 'INVALID_TIME');
  const quote = quoteLearningTask(root, command, context);
  if ('workId' in payload.goal) {
    requireEconomy(study && payload.resourceIds.includes(study.itemId), 'INVALID_SOURCE');
    // Dereference C03's admitted source, including its section when the goal omitted one.
    const sources = context.learningFacts.filter(
      (source) => source.id === quote.sourceId && source.sourceVersion === quote.sourceVersion,
    );
    const source = sources[0];
    requireEconomy(
      sources.length === 1 && source?.workId !== undefined && source.sectionId !== undefined,
      'INVALID_SOURCE',
    );
    studyAccess = admitStudyInterval(studyAccess, root, context, {
      ...study,
      characterId: payload.characterId,
      workId: source.workId,
      sectionId: source.sectionId,
      fromTick: command.campaignTick,
      toTick: (BigInt(command.campaignTick) + BigInt(quote.maxTicks)).toString(),
    });
  } else {
    requireEconomy(study === undefined, 'INVALID_ARGUMENT');
  }
  // Nothing escapes if the final lifecycle admission rejects the detached copy candidate.
  return { ...startLearningTask(state, { taskId, command, quote, ...binding }), studyAccess };
}
