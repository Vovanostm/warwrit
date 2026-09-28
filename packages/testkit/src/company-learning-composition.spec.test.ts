import { describe, expect, it } from 'vitest';
import {
  createLearningTaskState,
  createCompanyLearningState,
  createStudyAccessState,
  initialSkillProgress,
  prepareLearningComposition,
  prepareCompanyEconomyWithLearning,
} from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  CourseAttendanceEvidence,
  LearningQuoteContext,
  LearningTimeInterval,
} from '@warwrit/game-core';
import { access, cash, command, context, economy, scope, tick } from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  careHandover,
  container,
  item,
  itemAccess,
  withCareProvider,
} from './company-physical-fixture.js';

type Start = ReturnType<typeof command> & CommandOf<'StartLearning'>;
type Advance = ReturnType<typeof command> & CommandOf<'AdvanceCampaign'>;
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function admitted(course: boolean, maxTicks = '5000') {
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
        ? { skillId: 'medicine', maxTicks }
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
            maxTicks,
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

function startAnotherCourse(
  fixture: ReturnType<typeof admitted>,
  stateValue: CompanyEconomyState,
  tasks: ReturnType<typeof admitted>['tasks'],
  study: ReturnType<typeof admitted>['study'],
  at: number,
) {
  const state = atTick(stateValue, at);
  const start = command(
    state,
    'StartLearning',
    fixture.task.start.command.payload,
    `start-course-again-${at}`,
    'PLAYER',
    tick(at),
  ) as Start;
  const source = fixture.startContext.learningFacts[0]!;
  const learningFacts = [
    {
      ...source,
      ...scope(state, `course-again-${at}`, tick(at)),
      sourceVersion: `v-again-${at}`,
      atTick: tick(at),
      expiresAt: tick(at + 5000),
    },
  ];
  const startContext: LearningQuoteContext = {
    ...context(state, start, [access(state, tick(at))]),
    learningFacts,
  };
  return prepareLearningComposition(state, tasks, study, null, startContext, [], {
    kind: 'START',
    taskId: `task-course-again-${at}`,
    effectId: `start-effect-course-again-${at}`,
    admission: { taskId: `task-course-again-${at}`, command: start },
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
  it('settles an accrued book prefix when transfer arrives after admitted access ends', () => {
    const fixture = admitted(false);
    const state = addContainer(
      fixture.state,
      container('late-reader-pack', { kind: 'CHARACTER', id: 'leader' }, 30000, {
        kind: 'CHARACTER',
        id: 'leader',
      }),
    );
    const commandTick = 5010;
    const move = command(
      state,
      'TransferItem',
      {
        itemId: 'book-1',
        quantity: 1,
        fromContainerId: 'fixture-supply',
        toContainerId: 'late-reader-pack',
        accessEvidenceId: 'late-transfer-access',
      },
      'transfer-after-study-window',
      'PLAYER',
      tick(commandTick),
    );
    const admittedThrough = Number(fixture.study.intervals[0]!.toTick);
    const timeline = [
      { ...segment(fixture, 10, admittedThrough, 'ELIGIBLE'), commandId: move.commandId },
      ...(admittedThrough < commandTick
        ? [
            {
              ...segment(fixture, admittedThrough, commandTick, 'INELIGIBLE'),
              commandId: move.commandId,
            },
          ]
        : []),
    ];
    const manifest = {
      companyId: state.lifecycle.companyId,
      worldId: state.lifecycle.worldId,
      commandId: move.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.task.start.studyIntervalId!,
      targetTick: tick(commandTick),
      evidenceIds: [...new Set(timeline.flatMap(intervalEvidenceIds))],
    };
    const result = prepareCompanyEconomyWithLearning(
      {
        economy: state,
        learning: {
          ...createCompanyLearningState(),
          tasks: fixture.tasks,
          studyAccess: fixture.study,
        },
      },
      move,
      {
        ...context(
          state,
          move,
          [],
          [],
          [
            {
              ...itemAccess(
                state,
                'late-transfer-access',
                'TRANSFER',
                ['fixture-supply', 'late-reader-pack'],
                ['book-1'],
              ),
              atTick: tick(commandTick),
            },
          ],
        ),
        learningFacts: fixture.startContext.learningFacts,
      },
      {
        intervals: timeline,
        effectId: 'effect-transfer-after-study-window',
        manifest,
      },
    );

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: fixture.task.start.quote.maxTicks,
      terminal: {
        kind: 'GOAL_REACHED',
        commandId: move.commandId,
        campaignTick: tick(commandTick),
      },
    });
    expect(result.next.learning.studyProgress[0]?.learnedTicks).toBe('1000');
    expect(result.next.economy.finance.learningEffects?.at(-1)).toMatchObject({
      taskId: fixture.task.start.taskId,
      commandId: move.commandId,
      acceptedTicks: fixture.task.start.quote.maxTicks,
    });
    expect(result.next.learning.ownerTransitions[0]).toMatchObject({
      commandId: move.commandId,
      itemId: 'book-1',
      taskId: fixture.task.start.taskId,
      learnerId: 'leader',
    });
    expect(
      result.next.economy.physical?.items.find((entry) => entry.itemId === 'book-1'),
    ).toMatchObject({ containerId: 'late-reader-pack' });
  });

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

  it('retains an earned book prefix and closes its copy interval at a real nonsplit transfer', () => {
    const fixture = admitted(false);
    const sameActionState = addContainer(
      fixture.state,
      container('new-reader-pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
        kind: 'CHARACTER',
        id: 'worker-0',
      }),
    );
    const sameActionMove = command(
      sameActionState,
      'TransferItem',
      {
        itemId: 'book-1',
        quantity: 1,
        fromContainerId: 'fixture-supply',
        toContainerId: 'new-reader-pack',
        accessEvidenceId: 'transfer-same-action',
      },
      'transfer-same-action',
      'PLAYER',
      tick(14),
    );
    const sameActionManifest = {
      companyId: sameActionState.lifecycle.companyId,
      worldId: sameActionState.lifecycle.worldId,
      commandId: sameActionMove.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.task.start.studyIntervalId!,
      targetTick: '14',
      evidenceIds: [`${fixture.task.start.taskId}-10-14`, fixture.task.start.studyIntervalId!],
    };
    const sameActionLearningContext: LearningQuoteContext = {
      ...context(
        sameActionState,
        sameActionMove,
        [],
        [],
        [
          {
            ...itemAccess(
              sameActionState,
              'transfer-same-action',
              'TRANSFER',
              ['fixture-supply', 'new-reader-pack'],
              ['book-1'],
            ),
            atTick: tick(14),
          },
        ],
      ),
      learningFacts: fixture.startContext.learningFacts,
    };
    const sameActionIntervals = [
      {
        ...segment(fixture, 10, 14, 'ELIGIBLE'),
        commandId: sameActionMove.commandId,
      },
    ];
    const learningBeforeTransfer = {
      ...createCompanyLearningState(),
      tasks: fixture.tasks,
      studyAccess: fixture.study,
    };
    const sameAction = prepareCompanyEconomyWithLearning(
      { economy: sameActionState, learning: learningBeforeTransfer },
      sameActionMove,
      sameActionLearningContext,
      {
        intervals: sameActionIntervals,
        effectId: 'effect-transfer-same-action',
        manifest: sameActionManifest,
      },
    );
    expect(sameAction.kind).toBe('PREPARED');
    if (sameAction.kind !== 'PREPARED') return;
    expect(sameAction.next.learning.tasks.tasks[0]?.completedTicks).toBe('4');
    expect(sameAction.next.learning.studyProgress[0]?.learnedTicks).toBe('4');
    expect(sameAction.next.learning.tasks.tasks[0]?.terminal).toMatchObject({
      kind: 'INTERRUPTED',
      commandId: sameActionMove.commandId,
      processedThroughTick: '14',
    });
    expect(sameAction.next.economy.finance.learningEffects?.at(-1)?.commandId).toBe(
      sameActionMove.commandId,
    );
    expect(
      sameAction.next.economy.physical?.items.find((entry) => entry.itemId === 'book-1'),
    ).toMatchObject({ containerId: 'new-reader-pack' });
    expect(sameAction.next.learning.studyAccess.intervals[0]).toMatchObject({
      fromTick: '10',
      effectiveToTick: '14',
    });
    expect(BigInt(sameAction.next.economy.lifecycle.revision)).toBe(
      BigInt(sameActionState.lifecycle.revision) + 1n,
    );
    const unrelatedMove = command(
      sameActionState,
      'TransferItem',
      {
        itemId: 'book-2',
        quantity: 1,
        fromContainerId: 'fixture-supply',
        toContainerId: 'new-reader-pack',
        accessEvidenceId: 'transfer-unused-book',
      },
      'transfer-unused-book',
      'PLAYER',
      tick(14),
    );
    const unrelatedTransfer = prepareCompanyEconomyWithLearning(
      { economy: sameActionState, learning: learningBeforeTransfer },
      unrelatedMove,
      {
        ...context(
          sameActionState,
          unrelatedMove,
          [],
          [],
          [
            {
              ...itemAccess(
                sameActionState,
                'transfer-unused-book',
                'TRANSFER',
                ['fixture-supply', 'new-reader-pack'],
                ['book-2'],
              ),
              atTick: tick(14),
            },
          ],
        ),
        learningFacts: fixture.startContext.learningFacts,
      },
      { intervals: [], effectId: 'unused-book-transfer-effect' },
    );
    expect(unrelatedTransfer.kind).toBe('PREPARED');
    if (unrelatedTransfer.kind === 'PREPARED') {
      expect(unrelatedTransfer.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();
      expect(unrelatedTransfer.next.learning.ownerTransitions[0]).toMatchObject({
        taskId: null,
        learnerId: null,
        itemId: 'book-2',
      });
    }
    const replayedTransfer = prepareCompanyEconomyWithLearning(
      reload(sameAction.next),
      sameActionMove,
      sameActionLearningContext,
      {
        intervals: sameActionIntervals,
        effectId: 'effect-transfer-same-action',
        manifest: sameActionManifest,
      },
    );
    expect(replayedTransfer).toMatchObject({ kind: 'PREPARED', replayed: true });
    if (replayedTransfer.kind === 'PREPARED')
      expect(replayedTransfer.next).toEqual(reload(sameAction.next));

    const historicalStartRetry = prepareLearningComposition(
      reload(sameAction.next.economy),
      reload(sameAction.next.learning.tasks),
      reload(sameAction.next.learning.studyAccess),
      sameAction.next.learning.studyProgress[0] ?? null,
      fixture.startContext,
      [],
      {
        kind: 'START',
        taskId: fixture.task.start.taskId,
        effectId: `start-effect-false`,
        admission: {
          taskId: fixture.task.start.taskId,
          command: fixture.task.start.command,
          study: {
            intervalId: fixture.task.start.studyIntervalId!,
            itemId: 'book-1',
            accessEvidenceId: 'book-access-false',
          },
        },
      },
    );
    expect(historicalStartRetry.replayed).toBe(true);
    expect(historicalStartRetry.state).toEqual(sameAction.next.economy);
    expect(historicalStartRetry.tasks).toEqual(sameAction.next.learning.tasks);

    const reopen = command(
      sameAction.next.economy,
      'StartLearning',
      {
        ...fixture.task.start.command.payload,
        resourceIds: ['book-2'],
      },
      'start-book-two-after-transfer',
      'PLAYER',
      tick(14),
    ) as Start;
    const reopenSource = {
      ...fixture.startContext.learningFacts[0]!,
      ...scope(sameAction.next.economy, 'self-study-book-two', tick(14)),
      sourceVersion: 'book-two-v2',
      atTick: tick(14),
      expiresAt: tick(500),
      resourceIds: ['book-2'],
    };
    const reopenContext: LearningQuoteContext = {
      ...context(
        sameAction.next.economy,
        reopen,
        [access(sameAction.next.economy, tick(14))],
        [],
        [
          {
            ...itemAccess(
              sameAction.next.economy,
              'study-book-two',
              'STUDY',
              ['fixture-supply'],
              ['book-2'],
            ),
            atTick: tick(14),
          },
        ],
      ),
      learningFacts: [reopenSource],
    };
    const reopened = prepareLearningComposition(
      sameAction.next.economy,
      sameAction.next.learning.tasks,
      sameAction.next.learning.studyAccess,
      null,
      reopenContext,
      [],
      {
        kind: 'START',
        taskId: 'task-book-two-after-transfer',
        effectId: 'effect-book-two-after-transfer',
        admission: {
          taskId: 'task-book-two-after-transfer',
          command: reopen,
          study: {
            intervalId: 'access-book-two-after-transfer',
            itemId: 'book-2',
            accessEvidenceId: 'study-book-two',
          },
        },
      },
    );
    expect(reopened.tasks.tasks.map((entry) => entry.start.taskId)).toEqual([
      fixture.task.start.taskId,
      'task-book-two-after-transfer',
    ]);
    expect(
      reopened.studyAccess.intervals.find(
        (entry) => entry.intervalId === 'access-book-two-after-transfer',
      ),
    ).toMatchObject({ itemId: 'book-2', fromTick: '14' });

    const blockedState = addContainer(
      sameActionState,
      container('full-pack', { kind: 'COMPANY', id: 'company' }, 0),
    );
    const blocked = command(
      blockedState,
      'TransferItem',
      {
        itemId: 'book-1',
        quantity: 1,
        fromContainerId: 'fixture-supply',
        toContainerId: 'full-pack',
        accessEvidenceId: 'transfer-to-full-pack',
      },
      'transfer-rejected-at-14',
      'PLAYER',
      tick(14),
    );
    const blockedContext: LearningQuoteContext = {
      ...context(
        blockedState,
        blocked,
        [],
        [],
        [
          {
            ...itemAccess(
              blockedState,
              'transfer-to-full-pack',
              'TRANSFER',
              ['fixture-supply', 'full-pack'],
              ['book-1'],
            ),
            atTick: tick(14),
          },
        ],
      ),
      learningFacts: fixture.startContext.learningFacts,
    };
    const rejected = prepareCompanyEconomyWithLearning(
      { economy: blockedState, learning: learningBeforeTransfer },
      blocked,
      blockedContext,
      {
        intervals: [{ ...segment(fixture, 10, 14, 'ELIGIBLE'), commandId: blocked.commandId }],
        effectId: 'effect-transfer-rejected',
        manifest: {
          ...sameActionManifest,
          commandId: blocked.commandId,
          evidenceIds: [`${fixture.task.start.taskId}-10-14`, fixture.task.start.studyIntervalId!],
        },
      },
    );
    expect(rejected).toMatchObject({ kind: 'REJECTED', error: 'CAPACITY' });
    expect(rejected.state).toEqual({ economy: blockedState, learning: learningBeforeTransfer });
  });

  it('retains the admitted interval when a transfer interrupts at the start tick', () => {
    const fixture = admitted(false);
    const state = addContainer(
      fixture.state,
      container('same-tick-reader-pack', { kind: 'CHARACTER', id: 'worker-0' }, 30000, {
        kind: 'CHARACTER',
        id: 'worker-0',
      }),
    );
    const move = command(state, 'TransferItem', {
      itemId: 'book-1',
      quantity: 1,
      fromContainerId: 'fixture-supply',
      toContainerId: 'same-tick-reader-pack',
      accessEvidenceId: 'same-tick-transfer-access',
    });
    const result = prepareCompanyEconomyWithLearning(
      {
        economy: state,
        learning: {
          ...createCompanyLearningState(),
          tasks: fixture.tasks,
          studyAccess: fixture.study,
        },
      },
      move,
      {
        ...context(
          state,
          move,
          [],
          [],
          [
            itemAccess(
              state,
              'same-tick-transfer-access',
              'TRANSFER',
              ['fixture-supply', 'same-tick-reader-pack'],
              ['book-1'],
            ),
          ],
        ),
        learningFacts: fixture.startContext.learningFacts,
      },
      {
        intervals: [],
        effectId: 'same-tick-transfer-learning',
        manifest: {
          companyId: state.lifecycle.companyId,
          worldId: state.lifecycle.worldId,
          commandId: move.commandId,
          taskId: fixture.task.start.taskId,
          ownerIntervalId: fixture.task.start.studyIntervalId!,
          targetTick: '10',
          evidenceIds: [],
        },
      },
    );
    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.studyAccess.intervals[0]).toMatchObject({
      fromTick: '10',
      toTick: (
        BigInt(fixture.task.start.command.campaignTick) + BigInt(fixture.task.start.quote.maxTicks)
      ).toString(),
      effectiveToTick: '10',
    });
    expect(result.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: '0',
      terminal: { kind: 'INTERRUPTED', commandId: move.commandId },
    });
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

  it('resumes course attendance after an ineligible gap and reload', () => {
    const fixture = admitted(true, '10');
    const interrupted = prepare(fixture, 21, [
      segment(fixture, 10, 20, 'INELIGIBLE'),
      segment(fixture, 20, 21, 'ELIGIBLE'),
    ]);
    const resumed = prepare(
      fixture,
      22,
      [segment(fixture, 21, 22, 'ELIGIBLE')],
      atTick(reload(interrupted.state), 22),
      reload(interrupted.tasks),
      reload(interrupted.studyAccess),
      reload(interrupted.studyProgress),
    );

    expect(interrupted.acceptedTicks).toBe('1');
    expect(resumed.acceptedTicks).toBe('2');
    expect(resumed.tasks.tasks[0]?.completedTicks).toBe('2');
    expect(resumed.tasks.tasks[0]?.processedThroughTick).toBe('22');
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

  it('rejects unavailable instructors and continues attendance through a frozen quote after offer expiry', () => {
    const fixture = admitted(true);
    const eligible = segment(fixture, 10, 14, 'ELIGIBLE');
    const attendance = eligible.courseAttendance!;
    const providerId = attendance.providerId;
    const invalidDuty = {
      ...eligible,
      courseAttendance: {
        ...attendance,
        observations: attendance.observations.map((observation) =>
          observation.characterId === providerId
            ? { ...observation, assignment: 'REMOTE_TASK' as const }
            : observation,
        ),
      },
    };
    expect(() => prepare(fixture, 14, [invalidDuty])).toThrow();

    const providerWounded = {
      ...eligible,
      courseAttendance: {
        ...attendance,
        observations: attendance.observations.map((observation) =>
          observation.characterId === providerId
            ? { ...observation, conditionIds: ['critical-bleed'] }
            : observation,
        ),
      },
    };
    expect(() => prepare(fixture, 14, [providerWounded])).toThrow();

    const safeService = {
      agreementId: 'course-f1-service',
      kind: 'SAFE_SERVICE' as const,
      partyId: 'provider-party',
      location: attendance.location,
      beneficiaryIds: ['leader'],
      beneficiaryEnds: [],
      startedAt: tick(12),
      endedAt: null,
      knownEndedAt: null,
      sourceId: 'course-f1-source',
      providerId: 'provider',
      termsVersion: 'safe-v1',
    };
    const f1State = atTick(
      {
        ...fixture.state,
        finance: { ...fixture.state.finance, maintenance: [safeService] },
      },
      14,
    );
    expect(() => prepare(fixture, 14, [eligible], f1State)).toThrow();

    Object.assign(fixture.startContext.learningFacts[0]!, { expiresAt: tick(11) });
    const continued = prepare(fixture, 14, [eligible]);
    expect(continued.appliedElapsedTicks).toBe('4');
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
    const nextTask = startAnotherCourse(
      fixture,
      replenished,
      reload(prepared.tasks),
      reload(prepared.studyAccess),
      16,
    );
    expect(nextTask.tasks.tasks).toHaveLength(2);
    expect(nextTask.tasks.tasks[0]?.terminal?.kind).toBe('FUNDING_SHORTFALL');
    expect(nextTask.tasks.tasks[1]?.start.taskId).toBe('task-course-again-16');
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
    expect(prepared.tasks.tasks[0]?.terminal?.kind).toBe('GOAL_REACHED');
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

    const courseFixture = admitted(true);
    const restarted = startAnotherCourse(
      courseFixture,
      prepared.state,
      prepared.tasks,
      prepared.studyAccess,
      1010,
    );
    expect(restarted.tasks.tasks).toHaveLength(2);
    expect(restarted.tasks.tasks[0]?.terminal?.kind).toBe('GOAL_REACHED');
    expect(restarted.tasks.tasks[1]?.start.taskId).toBe('task-course-again-1010');
  });

  it('records an accepted duty change as the same-tick learning interruption', () => {
    const fixture = admitted(false);
    const state = withCareProvider(atTick(fixture.state, 20));
    const interval = {
      ...segment(fixture, 10, 20, 'ELIGIBLE'),
      commandId: 'duty-change-command',
    };
    const duty = command(
      state,
      'SetAssignment',
      {
        characterId: 'leader',
        assignment: 'HOME_RESERVE',
        locationId: 'village',
        dutyEvidenceId: 'duty-change',
        fundingPoolId: 'local',
      },
      'duty-change-command',
      'PLAYER',
      tick(20),
    );
    const dutyFact = {
      ...scope(state, 'duty-change', tick(20)),
      kind: 'DUTY' as const,
      characterId: 'leader',
      assignment: 'HOME_RESERVE' as const,
      location: { kind: 'AT' as const, siteId: 'village', areaId: 'square' },
      fundingPoolId: 'local',
      handoverToId: 'provider',
      partyId: null,
    };
    const learning = {
      ...createCompanyLearningState(),
      tasks: fixture.tasks,
      studyAccess: fixture.study,
    };
    const handover = careHandover(state, 'leader');
    const input = { economy: state, learning };
    const contextWithFacts = (includeDuty: boolean) => ({
      ...context(state, duty, [access(state, tick(20))], includeDuty ? [dutyFact] : [], [handover]),
      learningFacts: fixture.startContext.learningFacts,
    });
    const interruption = {
      intervals: [interval],
      effectId: 'duty-learning-effect',
      manifest: {
        companyId: state.lifecycle.companyId,
        worldId: state.lifecycle.worldId,
        commandId: duty.commandId,
        taskId: fixture.task.start.taskId,
        ownerIntervalId: fixture.task.start.studyIntervalId!,
        targetTick: '20',
        evidenceIds: [...new Set([...intervalEvidenceIds(interval), 'duty-change'])],
      },
    };
    const prepared = prepareCompanyEconomyWithLearning(
      input,
      duty,
      contextWithFacts(true),
      interruption,
    );
    if (prepared.kind !== 'PREPARED') throw new Error(prepared.error);
    expect(prepared.next.learning.tasks.tasks[0]?.completedTicks).toBe('10');
    expect(
      prepared.next.economy.finance.learningEffects?.find(
        (effect) => effect.commandId === duty.commandId,
      )?.acceptedTicks,
    ).toBe('10');
    expect(prepared.next.learning.tasks.tasks[0]?.terminal).toMatchObject({
      kind: 'INTERRUPTED',
      commandId: duty.commandId,
      processedThroughTick: '20',
    });
    expect(prepared.next.learning.ownerTransitions.at(-1)).toMatchObject({
      kind: 'DUTY_CHANGE',
      commandId: duty.commandId,
      previousAssignment: 'FIELD',
      nextAssignment: 'HOME_RESERVE',
      dutyEvidenceId: 'duty-change',
    });

    const rejected = prepareCompanyEconomyWithLearning(
      input,
      duty,
      contextWithFacts(false),
      interruption,
    );
    expect(rejected.kind).toBe('REJECTED');
    expect(rejected.state).toEqual(input);
  });
});
