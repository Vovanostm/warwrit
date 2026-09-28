import { describe, expect, it } from 'vitest';
import {
  createLearningTaskState,
  createStudyAccessState,
  initialSkillProgress,
  prepareLearningComposition,
} from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  CourseAttendanceEvidence,
  LearningQuoteContext,
  LearningTimeInterval,
} from '@warwrit/game-core';
import { access, cash, command, context, economy, scope, tick } from './company-economy-fixture.js';
import { addItem, item, itemAccess } from './company-physical-fixture.js';

type Start = ReturnType<typeof command> & CommandOf<'StartLearning'>;
type Advance = ReturnType<typeof command> & CommandOf<'AdvanceCampaign'>;
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function admitted(course: boolean) {
  let state = economy([1n], 7_000_000n, 10);
  const owner = { kind: 'COMPANY' as const, id: state.lifecycle.companyId };
  for (const id of ['book-1', 'book-2'])
    state = addItem(state, item(id, 'study-book-medicine', owner, 'fixture-supply'));
  const root = state as Required<typeof state>;
  const learner = root.lifecycle.characters.find((p) => p.identity.characterId === 'leader')!;
  Object.assign(learner, {
    skills: {
      leadership: 25,
      scholarship: course ? 60 : 25,
      medicine: initialSkillProgress(0, 'learning-composition'),
    },
    aptitudeBySkill: { leadership: 10000, medicine: 10000 },
    perks: [course ? 'scholarship-60-b' : 'scholarship-25-a'],
  });
  const start = command(
    root,
    'StartLearning',
    {
      characterId: 'leader',
      methodId: course ? 'funded-practice' : 'book-study',
      goal: course
        ? { skillId: 'medicine', maxTicks: '5000' }
        : { workId: 'wound-care-basics', maxTicks: '5000' },
      resourceIds: ['book-1', 'book-2'],
      budgetPoolId: 'local',
      maxBudgetQ: course ? '50000000' : '0',
    },
    `start-${course}`,
    'PLAYER',
    tick(10),
  ) as Start;
  const book = {
    intervalId: `access-${course}`,
    itemId: 'book-1',
    accessEvidenceId: `book-access-${course}`,
  };
  const accessFact = {
    ...itemAccess(root, book.accessEvidenceId, 'STUDY', ['fixture-supply'], ['book-1']),
    operatorId: 'leader',
  };
  const facts: LearningQuoteContext['learningFacts'] = [
    {
      ...scope(root, `source-${course}`, tick(10)),
      sourceVersion: 'v1',
      expiresAt: tick(500),
      learnerId: 'leader',
      location: { kind: 'AT', siteId: 'village', areaId: 'square' },
      resourceIds: start.payload.resourceIds,
      ...(course
        ? {
            kind: 'COURSE' as const,
            methodId: 'funded-practice',
            skillId: 'medicine',
            challengeLevel: 0,
            providerId: 'provider',
            mentorId: 'provider',
            poolId: 'local',
            providerWalletId: 'wallet-provider',
            moneyAccessEvidenceId: 'money-access',
            costQPerDay: cash(5_000_000),
            maxTicks: '5000',
          }
        : {
            kind: 'SELF_STUDY' as const,
            methodId: 'book-study',
            workId: 'wound-care-basics',
            sectionId: 'wound-care-basics-1',
          }),
    },
  ];
  const startContext: LearningQuoteContext = {
    ...context(root, start, [access(root, tick(10))], [], [accessFact]),
    learningFacts: facts,
  };
  const result = prepareLearningComposition(
    root,
    createLearningTaskState(),
    createStudyAccessState(),
    null,
    startContext,
    [],
    {
      kind: 'START',
      taskId: `task-${course}`,
      effectId: `start-effect-${course}`,
      admission: { taskId: `task-${course}`, command: start, ...(!course ? { study: book } : {}) },
    },
  );
  return {
    state: result.state,
    task: result.tasks.tasks[0]!,
    tasks: result.tasks,
    study: result.studyAccess,
    startContext,
  };
}

function atTick(stateValue: CompanyEconomyState, n: number) {
  const state = reload(stateValue);
  Object.assign(state.lifecycle, { campaignTick: tick(n) });
  Object.assign(state.finance, { processedTick: tick(n) });
  if (state.physical) Object.assign(state.physical, { processedTick: tick(n) });
  return state;
}

function prepare(
  fixture: ReturnType<typeof admitted>,
  to: number,
  intervals: readonly LearningTimeInterval[],
  state: CompanyEconomyState = atTick(fixture.state, to),
  tasks = fixture.tasks,
  study = fixture.study,
  progress: Parameters<typeof prepareLearningComposition>[3] = null,
) {
  const authoritativeInputs = [...new Set(intervals.flatMap(intervalEvidenceIds))];
  const cmd = command(
    state,
    'AdvanceCampaign',
    { toTick: String(to), authoritativeInputs },
    `advance-${to}-${fixture.task.start.taskId}`,
    'SYSTEM',
    tick(to),
  ) as Advance;
  const learningContext: LearningQuoteContext = {
    ...context(state, cmd, [access(state, tick(to))]),
    learningFacts: fixture.startContext.learningFacts,
  };
  const bound = intervals.map((entry) => ({ ...entry, commandId: cmd.commandId }));
  return prepareLearningComposition(state, tasks, study, progress, learningContext, bound, {
    kind: 'ADVANCE',
    taskId: fixture.task.start.taskId,
    command: cmd,
    effectId: `effect-${cmd.commandId}`,
  });
}

function replayAdvance(
  fixture: ReturnType<typeof admitted>,
  state: CompanyEconomyState,
  tasks: ReturnType<typeof admitted>['tasks'],
  study: ReturnType<typeof admitted>['study'],
  progress: Parameters<typeof prepareLearningComposition>[3],
  to: number,
  intervals: readonly LearningTimeInterval[],
) {
  const sourceState = atTick(fixture.state, to);
  const authoritativeInputs = [...new Set(intervals.flatMap(intervalEvidenceIds))];
  const cmd = command(
    sourceState,
    'AdvanceCampaign',
    { toTick: String(to), authoritativeInputs },
    `advance-${to}-${fixture.task.start.taskId}`,
    'SYSTEM',
    tick(to),
  ) as Advance;
  const learningContext: LearningQuoteContext = {
    ...context(state, cmd, [access(state, state.lifecycle.campaignTick)]),
    atTick: state.lifecycle.campaignTick,
    learningFacts: fixture.startContext.learningFacts,
  };
  const bound = intervals.map((entry) => ({ ...entry, commandId: cmd.commandId }));
  return prepareLearningComposition(state, tasks, study, progress, learningContext, bound, {
    kind: 'ADVANCE',
    taskId: fixture.task.start.taskId,
    command: cmd,
    effectId: `effect-${cmd.commandId}`,
  });
}

function segment(
  fixture: ReturnType<typeof admitted>,
  from: number,
  to: number,
  kind: LearningTimeInterval['kind'],
): LearningTimeInterval {
  const source = fixture.startContext.learningFacts[0];
  let courseAttendance: CourseAttendanceEvidence | undefined;
  if (source?.kind === 'COURSE' && kind === 'ELIGIBLE') {
    const providerId = source.providerId!;
    const mentorId = source.mentorId!;
    const characterIds = [...new Set(['leader', providerId, mentorId])];
    const membership = fixture.state.lifecycle.memberships.find(
      (entry) => entry.characterId === 'leader' && entry.endedAt === null,
    )!;
    courseAttendance = {
      attendanceId: `${fixture.task.start.taskId}-attendance-${from}-${to}`,
      sourceId: source.id,
      sourceVersion: source.sourceVersion,
      taskId: fixture.task.start.taskId,
      companyId: source.companyId,
      worldId: source.worldId,
      learnerId: 'leader',
      providerId,
      mentorId,
      skillId: source.skillId!,
      resourceIds: source.resourceIds,
      location: source.location,
      fromTick: String(from),
      toTick: String(to),
      membership: {
        membershipId: membership.membershipId,
        companyId: membership.companyId,
        characterId: membership.characterId,
        startedAt: membership.startedAt,
        endedAt: membership.endedAt,
      },
      observations: characterIds.map((characterId) => {
        const person = fixture.state.lifecycle.characters.find(
          (entry) => entry.identity.characterId === characterId,
        )!;
        if (person.presence.location.kind !== 'AT') throw new Error('Expected local person');
        return {
          observationId: `${fixture.task.start.taskId}-status-${characterId}-${from}-${to}`,
          characterId,
          fromTick: String(from),
          toTick: String(to),
          location: person.presence.location,
          assignment: person.presence.assignment,
          availability: person.presence.availability,
          encounterBindingId: person.presence.encounterBindingId,
          conditionIds: person.conditionIds,
        };
      }),
    };
  }
  return {
    intervalId: `${fixture.task.start.taskId}-${from}-${to}`,
    taskId: fixture.task.start.taskId,
    commandId: 'bound-by-prepare',
    ownerIntervalId: fixture.task.start.studyIntervalId ?? fixture.task.start.quote.sourceId,
    companyId: 'company',
    worldId: 'world',
    characterId: 'leader',
    fromTick: String(from),
    toTick: String(to),
    kind,
    ...(courseAttendance ? { courseAttendance } : {}),
  };
}

function intervalEvidenceIds(interval: LearningTimeInterval): readonly string[] {
  const attendance = interval.courseAttendance;
  return [
    interval.intervalId,
    interval.ownerIntervalId,
    ...(attendance
      ? [
          attendance.attendanceId,
          attendance.membership.membershipId,
          ...attendance.observations.map((entry) => entry.observationId),
        ]
      : []),
  ];
}

describe('C05 time and atomic learning composition', () => {
  it('replays the full admitted start and a stop without changing owners', () => {
    const fixture = admitted(true);
    const startRetry = prepareLearningComposition(
      fixture.state,
      fixture.tasks,
      fixture.study,
      null,
      fixture.startContext,
      [],
      {
        kind: 'START',
        taskId: fixture.task.start.taskId,
        effectId: `start-effect-true`,
        admission: {
          taskId: fixture.task.start.taskId,
          command: fixture.task.start.command,
        },
      },
    );
    expect(startRetry.replayed).toBe(true);
    expect(startRetry.state).toEqual(fixture.state);
    expect(startRetry.tasks).toEqual(fixture.tasks);

    const stopCommand = {
      ...fixture.task.start.command,
      type: 'StopLearning' as const,
      commandId: 'stop-learning',
      sourceEventId: 'stop-learning-source',
      payload: { taskId: fixture.task.start.taskId, reason: 'PLAYER' as const },
    } as CommandOf<'StopLearning'>;
    const stopContext: LearningQuoteContext = fixture.startContext;
    const stopped = prepareLearningComposition(
      fixture.state,
      fixture.tasks,
      fixture.study,
      null,
      stopContext,
      [],
      {
        kind: 'STOP',
        taskId: fixture.task.start.taskId,
        effectId: 'stop-effect',
        command: stopCommand,
      },
    );
    expect(stopped.tasks.tasks[0]?.stop?.payload.reason).toBe('PLAYER');
    expect(stopped.state).not.toBe(fixture.state);
    const stopRetry = prepareLearningComposition(
      stopped.state,
      stopped.tasks,
      stopped.studyAccess,
      null,
      stopContext,
      [],
      {
        kind: 'STOP',
        taskId: fixture.task.start.taskId,
        effectId: 'stop-effect',
        command: stopCommand,
      },
    );
    expect(stopRetry.replayed).toBe(true);
    expect(stopRetry.state).toEqual(stopped.state);
  });

  it('preserves book progress and cursor across whole, split and JSON reload paths', () => {
    const whole = admitted(false);
    const one = prepare(whole, 14, [segment(whole, 10, 14, 'ELIGIBLE')]);
    const split = admitted(false);
    const first = prepare(split, 12, [segment(split, 10, 12, 'ELIGIBLE')]);
    const second = prepare(
      split,
      14,
      [segment(split, 12, 14, 'ELIGIBLE')],
      atTick(first.state, 14),
      first.tasks,
      first.studyAccess,
      first.studyProgress,
    );
    expect(reload(second.studyProgress)).toEqual(reload(one.studyProgress));
    expect(second.acceptedTicks).toBe(one.acceptedTicks);
    expect(second.tasks.tasks[0]?.processedThroughTick).toBe('14');
    expect(whole.task.completedTicks).toBe('0');
    expect(whole.state).not.toBe(one.state);
  });

  it('replays historical advances after later progress, reload, and task stop', () => {
    const fixture = admitted(false);
    const firstInterval = segment(fixture, 10, 12, 'ELIGIBLE');
    const first = prepare(fixture, 12, [firstInterval]);
    const secondInterval = segment(fixture, 12, 14, 'ELIGIBLE');
    const second = prepare(
      fixture,
      14,
      [secondInterval],
      atTick(first.state, 14),
      first.tasks,
      first.studyAccess,
      first.studyProgress,
    );

    const replayed = replayAdvance(
      fixture,
      reload(second.state),
      reload(second.tasks),
      reload(second.studyAccess),
      reload(second.studyProgress),
      12,
      [firstInterval],
    );
    expect(replayed.replayed).toBe(true);
    expect(replayed.acceptedTicks).toBe('2');
    expect(replayed.state).toEqual(second.state);
    expect(replayed.tasks).toEqual(second.tasks);

    const stopCommand = command(
      second.state,
      'StopLearning',
      { taskId: fixture.task.start.taskId, reason: 'PLAYER' },
      'stop-after-progress',
      'PLAYER',
      tick(14),
    ) as CommandOf<'StopLearning'>;
    const stopContext: LearningQuoteContext = {
      ...fixture.startContext,
      principal: stopCommand.actorRef,
      publicRevision: second.state.lifecycle.knowledge.revision,
      canonicalRevision: second.state.lifecycle.revision,
      atTick: tick(14),
      financeFacts: [access(second.state, tick(14))],
    };
    const stopped = prepareLearningComposition(
      second.state,
      second.tasks,
      second.studyAccess,
      second.studyProgress,
      stopContext,
      [],
      {
        kind: 'STOP',
        taskId: fixture.task.start.taskId,
        effectId: 'stop-after-progress-effect',
        command: stopCommand,
      },
    );
    const replayAfterStop = replayAdvance(
      fixture,
      reload(stopped.state),
      reload(stopped.tasks),
      reload(stopped.studyAccess),
      reload(stopped.studyProgress),
      12,
      [firstInterval],
    );
    expect(replayAfterStop.replayed).toBe(true);
    expect(replayAfterStop.acceptedTicks).toBe('2');
    expect(replayAfterStop.state).toEqual(stopped.state);
  });

  it('counts only eligible segments, rejects missing chronology and leaves owners unchanged on late failure', () => {
    const fixture = admitted(false);
    const before = reload({ state: fixture.state, tasks: fixture.tasks, study: fixture.study });
    const prepared = prepare(fixture, 14, [
      segment(fixture, 10, 12, 'INELIGIBLE'),
      segment(fixture, 12, 14, 'ELIGIBLE'),
    ]);
    expect(prepared.appliedElapsedTicks).toBe('2');
    expect(prepared.tasks.tasks[0]?.processedThroughTick).toBe('14');
    expect(() => prepare(fixture, 14, [segment(fixture, 11, 14, 'ELIGIBLE')])).toThrow();
    expect({ state: fixture.state, tasks: fixture.tasks, study: fixture.study }).toEqual(before);
  });

  it('uses the retained course quote and keeps finance, skill and cursor in one candidate', () => {
    const fixture = admitted(true);
    const prepared = prepare(fixture, 14, [segment(fixture, 10, 14, 'ELIGIBLE')]);
    expect(prepared.appliedElapsedTicks).toBe('4');
    expect(prepared.state.finance.learningEffects?.at(-1)?.acceptedTicks).toBe('4');
    expect(prepared.tasks.tasks[0]?.completedTicks).toBe('4');
    expect(
      prepared.state.lifecycle.characters.find((p) => p.identity.characterId === 'leader')?.skills[
        'medicine'
      ],
    ).not.toEqual(
      fixture.state.lifecycle.characters.find((p) => p.identity.characterId === 'leader')?.skills[
        'medicine'
      ],
    );
    expect(fixture.task.completedTicks).toBe('0');
  });

  it('does not advance task time when the real payer cannot back the next course tick', () => {
    const fixture = admitted(true);
    const current = atTick(fixture.state, 14);
    const payerId = current.finance.pools.find((pool) => pool.poolId === 'local')!.walletId;
    const emptyPayer = {
      ...current,
      finance: {
        ...current.finance,
        wallets: current.finance.wallets.map((wallet) =>
          wallet.walletId === payerId ? { ...wallet, cashQ: cash(0) } : wallet,
        ),
      },
    };
    const before = reload({ state: emptyPayer, tasks: fixture.tasks });
    const prepared = prepare(fixture, 14, [segment(fixture, 10, 14, 'ELIGIBLE')], emptyPayer);
    expect(prepared.acceptedTicks).toBe('0');
    expect(prepared.tasks.tasks[0]?.completedTicks).toBe('0');
    expect(prepared.tasks.tasks[0]?.processedThroughTick).toBe('10');
    expect({ state: emptyPayer, tasks: fixture.tasks }).toEqual(before);

    const fundedLater = atTick(prepared.state, 16);
    const fundedLaterPayerId = fundedLater.finance.pools.find(
      (pool) => pool.poolId === 'local',
    )!.walletId;
    const replenished = {
      ...fundedLater,
      finance: {
        ...fundedLater.finance,
        wallets: fundedLater.finance.wallets.map((wallet) =>
          wallet.walletId === fundedLaterPayerId ? { ...wallet, cashQ: cash(7_000_000) } : wallet,
        ),
      },
    };
    expect(() =>
      prepare(
        fixture,
        16,
        [segment(fixture, 10, 16, 'ELIGIBLE')],
        replenished,
        prepared.tasks,
        prepared.studyAccess,
        prepared.studyProgress,
      ),
    ).toThrow();
    const replay = prepare(
      fixture,
      14,
      [segment(fixture, 10, 14, 'ELIGIBLE')],
      reload({ state: prepared.state, tasks: prepared.tasks }).state,
      reload({ state: prepared.state, tasks: prepared.tasks }).tasks,
      prepared.studyAccess,
      prepared.studyProgress,
    );
    expect(replay.replayed).toBe(true);
    expect(replay.acceptedTicks).toBe('0');
  });

  it('stops at the retained book quote cap without consuming later time', () => {
    const fixture = admitted(false);
    const prepared = prepare(fixture, 1010, [
      segment(fixture, 10, 910, 'ELIGIBLE'),
      segment(fixture, 910, 1010, 'INELIGIBLE'),
    ]);
    expect(prepared.acceptedTicks).toBe(fixture.task.start.quote.maxTicks);
    expect(prepared.quotedLimitReached).toBe(true);
    expect(prepared.tasks.tasks[0]?.processedThroughTick).toBe('910');
    const replay = prepare(
      fixture,
      1010,
      [segment(fixture, 10, 910, 'ELIGIBLE'), segment(fixture, 910, 1010, 'INELIGIBLE')],
      prepared.state,
      prepared.tasks,
      prepared.studyAccess,
      prepared.studyProgress,
    );
    expect(replay.replayed).toBe(true);
    expect(replay.state).toEqual(prepared.state);
    expect(replay.tasks).toEqual(prepared.tasks);
    expect(replay.studyProgress).toEqual(prepared.studyProgress);
  });
});
