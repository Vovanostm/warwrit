import { EconomyViolation, requireEconomy } from './economy-state.js';
import { unsigned } from './input.js';
import { prepareLearningBacking } from './learning-backing.js';
import type { LearningBackingRequest } from './learning-backing.js';
import { admitLearningTask } from './learning-admission.js';
import type { LearningTaskAdmission } from './learning-admission.js';
import { calculateCourseProgress } from './course-progress.js';
import { readLearningTaskState, stopLearningTask } from './learning-task.js';
import type { LearningTaskState } from './learning-task.js';
import { prepareLearningTime } from './learning-time.js';
import { readLearningTimeIntervals } from './learning-time.js';
import type { LearningTimeInterval } from './learning-time.js';
import type { LearningQuoteContext } from './learning-quote.js';
import { advanceStudySectionTime } from './study-section.js';
import type { StudySectionProgress } from './study-section.js';
import type { StudySectionCompletion } from './study-section.js';
import { readStudyAccessState } from './study-access.js';
import type { StudyAccessState } from './study-access.js';
import type { CompanyEconomyState } from './economy-types.js';
import { person } from './lifecycle-state.js';
import type { CommandOf } from './lifecycle-types.js';
import { creditProgression } from './progression.js';
import { readSkillProgress } from './skill-progress.js';

export type LearningCompositionRequest =
  | {
      readonly kind: 'START';
      readonly taskId: string;
      readonly effectId: string;
      readonly admission: LearningTaskAdmission;
      readonly accessEvidenceId?: string;
    }
  | {
      readonly kind: 'STOP';
      readonly taskId: string;
      readonly effectId: string;
      readonly command: CommandOf<'StopLearning'>;
      readonly accessEvidenceId?: string;
    }
  | {
      readonly kind: 'ADVANCE';
      readonly taskId: string;
      readonly effectId: string;
      readonly command: CommandOf<'AdvanceCampaign'>;
      readonly accessEvidenceId?: string;
    };

/*
 * Start/stop and elapsed advancement meet here before a candidate escapes. StartLearning
 * retries are delegated to C04's full stored-start comparison; stop causes remain explicit.
 */
function prepareStart(
  state: CompanyEconomyState,
  tasks: LearningTaskState,
  studyAccess: StudyAccessState,
  studyProgress: StudySectionProgress | null,
  context: LearningQuoteContext,
  request: Extract<LearningCompositionRequest, { kind: 'START' }>,
): LearningCompositionPreparation {
  if (!state.physical) throw new RangeError('LEARNING_PHYSICAL_ROOT_REQUIRED');
  const admitted = admitLearningTask(
    tasks,
    studyAccess,
    { lifecycle: state.lifecycle, finance: state.finance, physical: state.physical },
    context,
    request.admission,
  );
  const backing: LearningBackingRequest = {
    taskId: request.taskId,
    effectId: request.effectId,
    command: request.admission.command,
    acceptedTicks: '0',
    ...(request.accessEvidenceId ? { accessEvidenceId: request.accessEvidenceId } : {}),
  };
  const finance = prepareLearningBacking(state, admitted.state, context, backing);
  return Object.freeze({
    state: finance.state,
    tasks: admitted.state,
    studyAccess: admitted.studyAccess,
    studyProgress,
    studyCompletion: null,
    acceptedTicks: finance.acceptedTicks,
    appliedElapsedTicks: '0',
    goalReached: false,
    quotedLimitReached: false,
    replayed: admitted.replayed || finance.replayed,
  });
}

function prepareStop(
  state: CompanyEconomyState,
  tasks: LearningTaskState,
  studyAccess: StudyAccessState,
  studyProgress: StudySectionProgress | null,
  context: LearningQuoteContext,
  request: Extract<LearningCompositionRequest, { kind: 'STOP' }>,
): LearningCompositionPreparation {
  const stopped = stopLearningTask(tasks, request.command);
  if (stopped.task.start.taskId !== request.taskId) throw new RangeError('INVALID_ARGUMENT');
  const nextTasks = readLearningTaskState({
    schemaVersion: 1,
    tasks: stopped.state.tasks,
  });
  const backing: LearningBackingRequest = {
    taskId: request.taskId,
    effectId: request.effectId,
    command: request.command,
    acceptedTicks: stopped.task.completedTicks,
    ...(request.accessEvidenceId ? { accessEvidenceId: request.accessEvidenceId } : {}),
  };
  const finance = prepareLearningBacking(state, nextTasks, context, backing);
  return Object.freeze({
    state: finance.state,
    tasks: nextTasks,
    studyAccess,
    studyProgress,
    studyCompletion: null,
    acceptedTicks: finance.acceptedTicks,
    appliedElapsedTicks: '0',
    goalReached: false,
    quotedLimitReached:
      BigInt(stopped.task.completedTicks) === BigInt(stopped.task.start.quote.maxTicks),
    replayed: stopped.replayed || finance.replayed,
  });
}

export interface LearningAdvanceRequest {
  readonly taskId: string;
  readonly command: CommandOf<'AdvanceCampaign'>;
  readonly effectId: string;
  readonly accessEvidenceId?: string;
}

export interface LearningCompositionPreparation {
  readonly state: CompanyEconomyState;
  readonly tasks: LearningTaskState;
  readonly studyAccess: StudyAccessState;
  readonly studyProgress: StudySectionProgress | null;
  readonly studyCompletion: StudySectionCompletion | null;
  readonly acceptedTicks: string;
  readonly appliedElapsedTicks: string;
  readonly goalReached: boolean;
  readonly quotedLimitReached: boolean;
  readonly replayed: boolean;
}

function nextProcessedThrough(
  intervals: readonly LearningTimeInterval[],
  acceptedTicks: bigint,
  fromTick: string,
): string {
  let remaining = acceptedTicks;
  let cursor = fromTick;
  for (const interval of intervals) {
    const from = BigInt(interval.fromTick);
    const to = BigInt(interval.toTick);
    if (interval.kind === 'INELIGIBLE') {
      cursor = interval.toTick;
      continue;
    }
    if (remaining === 0n) break;
    const elapsed = to - from;
    const consumed = remaining < elapsed ? remaining : elapsed;
    cursor = (from + consumed).toString();
    remaining -= consumed;
    if (consumed < elapsed || remaining === 0n) break;
  }
  requireEconomy(remaining === 0n, 'INVALID_STATE');
  return cursor;
}

/** One pure candidate for elapsed time, actual study/course progress and finance. */
export function prepareLearningComposition(
  stateValue: CompanyEconomyState,
  tasksValue: LearningTaskState,
  studyAccessValue: StudyAccessState,
  studyProgressValue: StudySectionProgress | null,
  context: LearningQuoteContext,
  intervalValues: readonly LearningTimeInterval[],
  requestValue: LearningCompositionRequest,
): LearningCompositionPreparation {
  const studyAccess = readStudyAccessState(studyAccessValue);
  if (requestValue.kind === 'START')
    return prepareStart(
      stateValue,
      tasksValue,
      studyAccess,
      studyProgressValue,
      context,
      requestValue,
    );
  if (requestValue.kind === 'STOP')
    return prepareStop(
      stateValue,
      tasksValue,
      studyAccess,
      studyProgressValue,
      context,
      requestValue,
    );
  return prepareLearningAdvance(
    stateValue,
    tasksValue,
    studyAccess,
    studyProgressValue,
    context,
    intervalValues,
    requestValue,
  );
}

function prepareLearningAdvance(
  stateValue: CompanyEconomyState,
  tasksValue: LearningTaskState,
  studyAccess: StudyAccessState,
  studyProgressValue: StudySectionProgress | null,
  context: LearningQuoteContext,
  intervalValues: readonly LearningTimeInterval[],
  requestValue: LearningAdvanceRequest,
): LearningCompositionPreparation {
  const tasks = readLearningTaskState(tasksValue);
  const target = tasks.tasks.find((entry) => entry.start.taskId === requestValue.taskId);
  requireEconomy(target, 'INVALID_ARGUMENT');
  const { start } = target;
  const characterId = start.command.payload.characterId;
  requireEconomy(
    stateValue.lifecycle.companyId === context.companyId &&
      stateValue.lifecycle.worldId === context.worldId &&
      context.canonicalRevision === stateValue.lifecycle.revision &&
      context.atTick === stateValue.lifecycle.campaignTick,
    'AUTHORIZATION',
  );
  const sourceEventId = requestValue.command.sourceEventId ?? null;
  const previousEffect = (stateValue.finance.learningEffects ?? []).find(
    (effect) =>
      effect.companyId === context.companyId &&
      effect.worldId === context.worldId &&
      effect.taskId === target.start.taskId &&
      (effect.commandId === requestValue.command.commandId ||
        (sourceEventId !== null && effect.sourceEventId === sourceEventId)),
  );
  if (previousEffect) {
    const ownedIds = new Set(requestValue.command.payload.authoritativeInputs);
    const replayIntervals = readLearningTimeIntervals(intervalValues);
    for (const interval of replayIntervals) {
      requireEconomy(
        interval.taskId === target.start.taskId &&
          interval.commandId === requestValue.command.commandId &&
          interval.companyId === context.companyId &&
          interval.worldId === context.worldId &&
          interval.characterId === characterId &&
          ownedIds.has(interval.intervalId) &&
          ownedIds.has(interval.ownerIntervalId),
        'INVALID_SOURCE',
      );
    }
    let originalRequest: unknown;
    try {
      originalRequest = JSON.parse(previousEffect.requestKey);
    } catch {
      throw new EconomyViolation('INVALID_STATE');
    }
    requireEconomy(
      originalRequest !== null &&
        typeof originalRequest === 'object' &&
        'acceptedTicks' in originalRequest &&
        typeof originalRequest.acceptedTicks === 'string' &&
        unsigned.read(originalRequest.acceptedTicks),
      'INVALID_STATE',
    );
    const replay = prepareLearningBacking(stateValue, tasks, context, {
      taskId: target.start.taskId,
      effectId: requestValue.effectId,
      command: requestValue.command,
      acceptedTicks: originalRequest.acceptedTicks,
      ...(requestValue.accessEvidenceId ? { accessEvidenceId: requestValue.accessEvidenceId } : {}),
    });
    requireEconomy(BigInt(replay.acceptedTicks) <= BigInt(target.completedTicks), 'INVALID_STATE');
    return Object.freeze({
      state: stateValue,
      tasks,
      studyAccess,
      studyProgress: studyProgressValue,
      studyCompletion: null,
      acceptedTicks: replay.acceptedTicks,
      appliedElapsedTicks: '0',
      goalReached: false,
      quotedLimitReached: BigInt(replay.acceptedTicks) === BigInt(target.start.quote.maxTicks),
      replayed: true,
    });
  }
  requireEconomy(!target.stop, 'INVALID_ARGUMENT');
  const time = prepareLearningTime(target, requestValue.command, context, intervalValues);
  const inputs = start.inputs;
  if (!inputs) throw new RangeError('LEARNING_START_INPUTS_REQUIRED');

  let requestedTicks = BigInt(time.eligibleTicks);
  let goalReached: boolean;
  if (inputs.kind === 'COURSE') {
    const course = calculateCourseProgress(target, stateValue.lifecycle, requestedTicks.toString());
    requestedTicks = BigInt(course.appliedElapsedTicks);
    goalReached = course.goalReached;
  } else {
    requireEconomy(start.studyIntervalId, 'INVALID_SOURCE');
    const interval = studyAccess.intervals.find(
      (entry) => entry.intervalId === start.studyIntervalId,
    );
    requireEconomy(
      interval &&
        interval.characterId === characterId &&
        interval.workId === inputs.workId &&
        interval.sectionId === inputs.sectionId &&
        start.command.payload.resourceIds.includes(interval.itemId),
      'CONTACT_OR_ACCESS_REQUIRED',
    );
    for (const segment of time.intervals) {
      if (segment.kind === 'ELIGIBLE')
        requireEconomy(
          BigInt(segment.fromTick) >= BigInt(interval.fromTick) &&
            BigInt(segment.toTick) <= BigInt(interval.toTick),
          'CONTACT_OR_ACCESS_REQUIRED',
        );
    }
    const book = advanceStudySectionTime(
      studyProgressValue,
      { characterId, workId: inputs.workId, sectionId: inputs.sectionId },
      requestedTicks.toString(),
      start.quote.coefficients.task.studyDurationBps,
    );
    requestedTicks = BigInt(book.appliedElapsedTicks);
    goalReached = book.completion !== null;
  }

  const priorAccepted = (stateValue.finance.learningEffects ?? [])
    .filter(
      (effect) =>
        effect.companyId === context.companyId &&
        effect.worldId === context.worldId &&
        effect.taskId === target.start.taskId,
    )
    .reduce((max, effect) => {
      const ticks = BigInt(effect.acceptedTicks);
      return ticks > max ? ticks : max;
    }, 0n);
  requireEconomy(priorAccepted === BigInt(target.completedTicks), 'INVALID_STATE');

  const backing: LearningBackingRequest = {
    taskId: target.start.taskId,
    effectId: requestValue.effectId,
    command: requestValue.command,
    acceptedTicks: (BigInt(target.completedTicks) + requestedTicks).toString(),
    ...(requestValue.accessEvidenceId ? { accessEvidenceId: requestValue.accessEvidenceId } : {}),
  };
  const prepared = prepareLearningBacking(stateValue, tasks, context, backing);
  const financeState = prepared.state;
  const accepted = BigInt(prepared.acceptedTicks);
  const replayed = prepared.replayed;
  requireEconomy(accepted >= BigInt(target.completedTicks), 'INVALID_STATE');
  const acceptedDelta = accepted - BigInt(target.completedTicks);
  const processedThroughTick = nextProcessedThrough(time.intervals, acceptedDelta, time.fromTick);
  const nextTask = {
    ...target,
    completedTicks: accepted.toString(),
    processedThroughTick,
  };
  const nextTasks = readLearningTaskState({
    schemaVersion: 1,
    tasks: tasks.tasks.map((entry) => (entry === target ? nextTask : entry)),
  });

  let nextStudy = studyProgressValue;
  let lifecycle = financeState.lifecycle;
  let studyCompletion: StudySectionCompletion | null = null;
  if (acceptedDelta > 0n && inputs.kind === 'BOOK') {
    const result = advanceStudySectionTime(
      studyProgressValue,
      { characterId, workId: inputs.workId, sectionId: inputs.sectionId },
      acceptedDelta.toString(),
      start.quote.coefficients.task.studyDurationBps,
    );
    nextStudy = result.next;
    studyCompletion = result.completion;
    goalReached = result.completion !== null;
    const learner = person(lifecycle, characterId);
    const previous = readSkillProgress(learner.skills[inputs.skillId]);
    requireEconomy(typeof previous !== 'number', 'INVALID_STATE');
    const amount = creditProgression(previous.amount, result.creditedMilliXp, {
      aptitudeBps: inputs.aptitudeAtStartBps,
      challengeBps: 10000,
      outcomeBps: 10000,
    });
    const nextSkill = Object.freeze({ ...previous, amount });
    lifecycle = {
      ...lifecycle,
      characters: lifecycle.characters.map((entry) =>
        entry === learner
          ? { ...entry, skills: { ...entry.skills, [inputs.skillId]: nextSkill } }
          : entry,
      ),
    };
  } else if (acceptedDelta > 0n && inputs.kind === 'COURSE') {
    const progress = calculateCourseProgress(
      target,
      stateValue.lifecycle,
      acceptedDelta.toString(),
    );
    const learner = person(lifecycle, characterId);
    lifecycle = {
      ...lifecycle,
      characters: lifecycle.characters.map((entry) =>
        entry === learner
          ? { ...entry, skills: { ...entry.skills, [progress.skillId]: progress.nextSkill } }
          : entry,
      ),
    };
    goalReached = progress.goalReached;
  }
  const nextState =
    lifecycle === financeState.lifecycle ? financeState : { ...financeState, lifecycle };
  return Object.freeze({
    state: nextState,
    tasks: nextTasks,
    studyAccess,
    studyProgress: nextStudy,
    studyCompletion,
    acceptedTicks: accepted.toString(),
    appliedElapsedTicks: acceptedDelta.toString(),
    goalReached,
    quotedLimitReached: BigInt(accepted) === BigInt(start.quote.maxTicks),
    replayed,
  });
}
