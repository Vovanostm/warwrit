import { describe, expect, it } from 'vitest';
import {
  createLearningTaskState,
  createCompanyLearningState,
  createStudyAccessState,
  advanceStudySection,
  admitStudyInterval,
  initialSkillProgress,
  prepareCompanyEconomy,
  prepareLearningComposition,
  prepareCompanyEconomyWithLearning,
  entityId,
} from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  CourseAttendanceEvidence,
  PhysicalEvidence,
  MaterializedCompanyState,
  LearningQuoteContext,
  LearningTimeInterval,
  LifecycleEvidence,
} from '@warwrit/game-core';
import {
  access,
  cash,
  command,
  context,
  economy,
  physicalScope,
  place,
  scope,
  tick,
} from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  careHandover,
  container,
  item,
  itemAccess,
  visibleCharacter,
  withCareProvider,
} from './company-physical-fixture.js';

type Start = ReturnType<typeof command> & CommandOf<'StartLearning'>;
type Advance = ReturnType<typeof command> & CommandOf<'AdvanceCampaign'>;
type Capture = ReturnType<typeof command> & CommandOf<'Capture'>;
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
    root,
    start,
    book,
    state: result.state,
    task: result.tasks.tasks[0]!,
    tasks: result.tasks,
    study: result.studyAccess,
    startContext,
  };
}

type ScenarioFixture = Pick<ReturnType<typeof admitted>, 'task' | 'state' | 'startContext'>;

function startScenarioTask(
  stateValue: CompanyEconomyState,
  learning: ReturnType<typeof createCompanyLearningState>,
  learnerId: string,
  course: boolean,
  bookItemId: string,
) {
  const state = visibleCharacter(stateValue, learnerId, (character) => ({
    ...character,
    skills: {
      ...character.skills,
      scholarship: course ? 60 : 25,
      medicine: initialSkillProgress(0, `scenario-${learnerId}`),
    },
    aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
    perks: [course ? 'scholarship-60-b' : 'scholarship-25-a'],
  }));
  const taskId = `scenario-task-${learnerId}`;
  const sourceId = `scenario-source-${learnerId}`;
  const commandId = `scenario-start-${learnerId}`;
  const resourceIds = course ? ['book-1', 'book-2'] : [bookItemId];
  const start = command(
    state,
    'StartLearning',
    {
      characterId: learnerId,
      methodId: course ? 'funded-practice' : 'book-study',
      goal: course
        ? { skillId: 'medicine', maxTicks: '5000' }
        : { workId: 'wound-care-basics', maxTicks: '5000' },
      resourceIds,
      budgetPoolId: 'local',
      maxBudgetQ: course ? '50000000' : '0',
    },
    commandId,
    'PLAYER',
    tick(10),
  ) as Start;
  const source: LearningQuoteContext['learningFacts'][number] = {
    ...scope(state, sourceId, tick(10)),
    sourceVersion: `version-${learnerId}`,
    expiresAt: tick(500),
    learnerId,
    location: place,
    resourceIds,
    ...(course
      ? {
          kind: 'COURSE' as const,
          methodId: 'funded-practice',
          skillId: 'medicine',
          challengeLevel: 0,
          providerId: 'leader',
          mentorId: 'leader',
          poolId: 'local',
          providerWalletId: 'wallet-leader',
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
  };
  const study = course
    ? undefined
    : {
        intervalId: `scenario-access-${learnerId}`,
        itemId: bookItemId,
        accessEvidenceId: `scenario-book-access-${learnerId}`,
      };
  const physicalFacts = study
    ? [
        {
          ...itemAccess(state, study.accessEvidenceId, 'STUDY', ['fixture-supply'], [bookItemId]),
          operatorId: learnerId,
        },
      ]
    : [];
  const startContext = {
    ...context(state, start, [access(state, tick(10))], [], physicalFacts),
    learningFacts: [source],
  };
  const result = prepareCompanyEconomyWithLearning(
    { economy: state, learning },
    start,
    startContext,
    {
      taskId,
      effectId: `scenario-start-effect-${learnerId}`,
      intervals: [],
      ...(study ? { study } : {}),
    },
  );
  if (result.kind !== 'PREPARED') throw new Error(`Scenario start ${learnerId}: ${result.error}`);
  const task = result.next.learning.tasks.tasks.find((entry) => entry.start.taskId === taskId);
  if (!task) throw new Error(`Scenario task missing for ${learnerId}`);
  return {
    result,
    fixture: { state: result.next.economy, task, startContext } satisfies ScenarioFixture,
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
  fixture: ScenarioFixture,
  from: number,
  to: number,
  kind: LearningTimeInterval['kind'],
): LearningTimeInterval {
  const source = fixture.startContext.learningFacts[0];
  let courseAttendance: CourseAttendanceEvidence | undefined;
  if (source?.kind === 'COURSE' && kind === 'ELIGIBLE') {
    const learnerId = fixture.task.start.command.payload.characterId;
    const providerId = source.providerId!;
    const mentorId = source.mentorId!;
    const characterIds = [...new Set([learnerId, providerId, mentorId])];
    const membership = fixture.state.lifecycle.memberships.find(
      (entry) => entry.characterId === learnerId && entry.endedAt === null,
    )!;
    courseAttendance = {
      attendanceId: `${fixture.task.start.taskId}-attendance-${from}-${to}`,
      sourceId: source.id,
      sourceVersion: source.sourceVersion,
      taskId: fixture.task.start.taskId,
      companyId: source.companyId,
      worldId: source.worldId,
      learnerId,
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
    characterId: fixture.task.start.command.payload.characterId,
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
  it('prepares public start and settles the exact public stop prefix in one root', () => {
    const fixture = admitted(false);
    const start = prepareCompanyEconomyWithLearning(
      { economy: fixture.root, learning: createCompanyLearningState() },
      fixture.start,
      fixture.startContext,
      {
        taskId: fixture.task.start.taskId,
        effectId: 'public-learning-start',
        intervals: [],
        study: fixture.book,
        accessEvidenceId: fixture.book.accessEvidenceId,
      },
    );
    expect(start.kind).toBe('PREPARED');
    if (start.kind !== 'PREPARED') return;
    expect(start.next.learning.tasks.tasks[0]?.start.command).toEqual(fixture.start);

    const advanceState = atTick(start.next.economy, 15);
    const advanceInterval = {
      ...segment(fixture, 10, 15, 'ELIGIBLE'),
      commandId: 'public-learning-advance',
    };
    const advance = command(
      advanceState,
      'AdvanceCampaign',
      {
        toTick: '15',
        authoritativeInputs: [],
      },
      'public-learning-advance',
      'SYSTEM',
      tick(15),
    ) as Advance;
    const advanceAccessFact = access(advanceState, tick(15));
    const foodFacts = (state: CompanyEconomyState, from: number, to: number) =>
      state.lifecycle.memberships
        .filter((membership) => membership.endedAt === null)
        .map((membership, ordinal) => ({
          ...physicalScope(state, `food-${membership.characterId}-${to}`, tick(to), ordinal),
          kind: 'FOOD_FULFILLMENT' as const,
          membershipId: membership.membershipId,
          fromTick: tick(from),
          toTick: tick(to),
          channel: 'STOCK' as const,
          location: place,
          containerId: 'fixture-supply',
        }));
    const advanceManifest = {
      companyId: advance.companyId,
      worldId: advance.worldId,
      commandId: advance.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.book.intervalId,
      targetTick: advance.payload.toTick,
      evidenceIds: [...intervalEvidenceIds(advanceInterval)],
    };
    const advanceContext = {
      ...context(advanceState, advance, [advanceAccessFact], [], foodFacts(advanceState, 10, 15)),
      learningFacts: fixture.startContext.learningFacts,
    };
    const refusedAdvance = prepareCompanyEconomyWithLearning(start.next, advance, advanceContext, {
      intervals: [advanceInterval],
      manifests: [{ ...advanceManifest, worldId: 'another-world' }],
      effectId: 'public-learning-advance',
    });
    expect(refusedAdvance).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });
    expect(refusedAdvance.state).toBe(start.next);
    const advanced = prepareCompanyEconomyWithLearning(start.next, advance, advanceContext, {
      intervals: [advanceInterval],
      manifests: [advanceManifest],
      effectId: 'public-learning-advance',
    });
    expect(advanced.kind).toBe('PREPARED');
    if (advanced.kind !== 'PREPARED') return;
    expect(advanced.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: '5',
      processedThroughTick: '15',
    });
    const advanceRetry = prepareCompanyEconomyWithLearning(
      advanced.next,
      advance,
      {
        ...context(advanced.next.economy, advance),
        learningFacts: fixture.startContext.learningFacts,
      },
      {
        intervals: [advanceInterval],
        manifests: [advanceManifest],
        effectId: 'public-learning-advance',
      },
    );
    expect(advanceRetry.kind).toBe('PREPARED');
    if (advanceRetry.kind !== 'PREPARED') return;
    expect(advanceRetry.replayed).toBe(true);
    expect(advanceRetry.receipt).toBe(advanced.receipt);
    expect(advanceRetry.next.economy).toBe(advanced.next.economy);

    const stopState = atTick(advanced.next.economy, 20);
    const stop = command(
      stopState,
      'StopLearning',
      { taskId: fixture.task.start.taskId, reason: 'PLAYER' },
      'public-learning-stop',
      'PLAYER',
      tick(20),
    ) as CommandOf<'StopLearning'>;
    const interval = { ...segment(fixture, 15, 20, 'ELIGIBLE'), commandId: stop.commandId };
    const manifest = {
      companyId: stop.companyId,
      worldId: stop.worldId,
      commandId: stop.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.book.intervalId,
      targetTick: stop.campaignTick,
      evidenceIds: [interval.intervalId, interval.ownerIntervalId, fixture.task.start.taskId],
    };
    const accessFact = access(stopState, tick(20));
    const stopFoodFacts = foodFacts(stopState, 15, 20);
    const stopped = prepareCompanyEconomyWithLearning(
      advanced.next,
      stop,
      {
        ...context(stopState, stop as ReturnType<typeof command>, [accessFact], [], stopFoodFacts),
        learningFacts: fixture.startContext.learningFacts,
      },
      { intervals: [interval], manifests: [manifest], effectId: 'public-learning-stop' },
    );
    expect(stopped.kind).toBe('PREPARED');
    if (stopped.kind !== 'PREPARED') return;
    expect(stopped.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: '10',
      processedThroughTick: '20',
      stop: { commandId: stop.commandId },
    });
    expect(stopped.next.learning.studyAccess.intervals[0]).toMatchObject({
      intervalId: fixture.book.intervalId,
      effectiveToTick: '20',
    });
    expect(stopped.next.learning.studyProgress[0]?.learnedTicks).toBe(
      ((10n * 10_000n) / 9_000n).toString(),
    );
    const retry = prepareCompanyEconomyWithLearning(
      stopped.next,
      stop,
      {
        ...context(stopped.next.economy, stop as ReturnType<typeof command>, [
          access(stopped.next.economy, tick(20)),
        ]),
        learningFacts: fixture.startContext.learningFacts,
      },
      { intervals: [interval], manifests: [manifest], effectId: 'public-learning-stop' },
    );
    expect(retry.kind).toBe('PREPARED');
    if (retry.kind !== 'PREPARED') return;
    expect(retry.replayed).toBe(true);
    expect(retry.next).toStrictEqual(stopped.next);
  });

  it('settles learning to a trusted retroactive death boundary before applying death', () => {
    const fixture = admitted(false);
    const started = prepareCompanyEconomyWithLearning(
      { economy: fixture.root, learning: createCompanyLearningState() },
      fixture.start,
      fixture.startContext,
      {
        taskId: fixture.task.start.taskId,
        effectId: 'death-learning-start',
        intervals: [],
        study: fixture.book,
      },
    );
    expect(started.kind).toBe('PREPARED');
    if (started.kind !== 'PREPARED') return;

    const death = command(
      started.next.economy,
      'RecordDeath',
      {
        receiptId: 'death-finance',
        characterId: 'leader',
        actualDeathTick: '15',
        causeId: 'fatal-battle',
        custodyOutcomeId: 'death-physical',
      },
      'late-learning-death',
      'OUTCOME_RECEIPT',
      tick(20),
    );
    const interval = { ...segment(fixture, 10, 15, 'ELIGIBLE'), commandId: death.commandId };
    const manifest = {
      companyId: death.companyId,
      worldId: death.worldId,
      commandId: death.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.book.intervalId,
      targetTick: tick(15),
      evidenceIds: [
        interval.intervalId,
        interval.ownerIntervalId,
        fixture.task.start.taskId,
        'death-finance',
        'death-physical',
      ],
    };
    const financeFact = {
      ...scope(started.next.economy, 'death-finance', tick(20)),
      sourceEventId: death.sourceEventId,
      kind: 'FINANCIAL_DEATH' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'fatal-battle',
      custodyOutcomeId: 'death-physical',
      recipient: { kind: 'ESTATE' as const, id: 'leader' },
    };
    const outcomeFact = {
      ...physicalScope(started.next.economy, 'death-physical', tick(20)),
      sourceEventId: death.sourceEventId,
      kind: 'DEATH_OUTCOME' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'fatal-battle',
      location: place,
      corpseContainerId: 'corpse-leader',
    };
    const foodFacts = started.next.economy.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .flatMap((membership, ordinal) => {
        const fact = (fromTick: number, toTick: number, suffix: string, index: number) => ({
          ...physicalScope(
            started.next.economy,
            `death-food-${membership.characterId}-${suffix}`,
            tick(20),
            index,
          ),
          kind: 'FOOD_FULFILLMENT' as const,
          membershipId: membership.membershipId,
          fromTick: tick(fromTick),
          toTick: tick(toTick),
          channel: 'STOCK' as const,
          location: place,
          containerId: 'fixture-supply',
        });
        return [
          fact(10, 15, '10-15', ordinal * 2),
          ...(membership.characterId === 'leader' ? [] : [fact(15, 20, '15-20', ordinal * 2 + 1)]),
        ];
      });
    const result = prepareCompanyEconomyWithLearning(
      started.next,
      death,
      {
        ...context(started.next.economy, death, [financeFact], [], [outcomeFact, ...foodFacts]),
        learningFacts: fixture.startContext.learningFacts,
      },
      {
        intervals: [interval],
        manifests: [manifest],
        effectId: 'late-learning-death',
      },
    );
    expect(result.kind, JSON.stringify(result)).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: '5',
      processedThroughTick: '15',
      terminal: {
        kind: 'INTERRUPTED',
        commandId: death.commandId,
        processedThroughTick: '15',
      },
    });
    expect(result.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBe('15');
    expect(
      result.next.economy.lifecycle.characters.find(
        (character) => character.identity.characterId === 'leader',
      )?.presence.availability,
    ).toBe('DEAD');
  });

  it('retains a StopLearning effect that reaches the book goal', () => {
    const fixture = admitted(false);
    const state = atTick(fixture.state, 11);
    const stop = command(
      state,
      'StopLearning',
      { taskId: fixture.task.start.taskId, reason: 'PLAYER' },
      'stop-at-book-goal',
      'PLAYER',
      tick(11),
    ) as CommandOf<'StopLearning'>;
    const interval = { ...segment(fixture, 10, 11, 'ELIGIBLE'), commandId: stop.commandId };
    const manifest = {
      companyId: stop.companyId,
      worldId: stop.worldId,
      commandId: stop.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.book.intervalId,
      targetTick: stop.campaignTick,
      evidenceIds: [interval.intervalId, interval.ownerIntervalId, fixture.task.start.taskId],
    };
    const source = {
      ...fixture.startContext.learningFacts[0]!,
      ...scope(state, 'restart-after-goal', tick(11)),
      sourceVersion: 'book-study-restart-v1',
      atTick: tick(11),
      expiresAt: tick(500),
      resourceIds: ['book-2'],
    };
    const accessFact = {
      ...itemAccess(state, 'restart-book-access', 'STUDY', ['fixture-supply'], ['book-2']),
      atTick: tick(11),
      operatorId: 'leader',
    };
    const learningContext = {
      ...context(
        state,
        stop as ReturnType<typeof command>,
        [access(state, tick(11))],
        [],
        [accessFact],
      ),
      learningFacts: fixture.startContext.learningFacts,
    };
    const stopped = prepareLearningComposition(
      state,
      fixture.tasks,
      fixture.study,
      {
        schemaVersion: 2,
        characterId: 'leader',
        workId: 'wound-care-basics',
        workVersion: 1,
        sectionId: 'wound-care-basics-1',
        learnedTicks: '999',
        learnedCarry: { numerator: '0', denominator: '1' },
      },
      learningContext,
      [interval],
      {
        kind: 'STOP',
        taskId: fixture.task.start.taskId,
        effectId: 'stop-at-goal-effect',
        command: stop,
        intervals: [interval],
        manifest,
      },
    );
    expect(stopped.tasks.tasks[0]?.terminal).toMatchObject({
      kind: 'GOAL_REACHED',
      commandId: stop.commandId,
      processedThroughTick: '11',
    });

    const restart = command(
      stopped.state,
      'StartLearning',
      { ...fixture.task.start.command.payload, resourceIds: ['book-2'] },
      'restart-after-book-goal',
      'PLAYER',
      tick(11),
    ) as Start;
    expect(() =>
      prepareLearningComposition(
        stopped.state,
        stopped.tasks,
        stopped.studyAccess,
        stopped.studyProgress,
        {
          ...context(
            stopped.state,
            restart as ReturnType<typeof command>,
            [access(stopped.state, tick(11))],
            [],
            [accessFact],
          ),
          learningFacts: [source],
        },
        [],
        {
          kind: 'START',
          taskId: 'task-after-book-goal',
          effectId: 'start-after-book-goal-effect',
          admission: {
            taskId: 'task-after-book-goal',
            command: restart,
            study: {
              intervalId: 'access-after-book-goal',
              itemId: 'book-2',
              accessEvidenceId: 'restart-book-access',
            },
          },
        },
      ),
    ).not.toThrow();
  });

  it('binds late missing-death learning to the real resolution fact and source', () => {
    const fixture = admitted(false);
    const started = prepareCompanyEconomyWithLearning(
      { economy: fixture.root, learning: createCompanyLearningState() },
      fixture.start,
      fixture.startContext,
      {
        taskId: fixture.task.start.taskId,
        effectId: 'missing-learning-start',
        intervals: [],
        study: fixture.book,
      },
    );
    expect(started.kind).toBe('PREPARED');
    if (started.kind !== 'PREPARED') return;
    const missingState = visibleCharacter(started.next.economy, 'leader', (character) => ({
      ...character,
      presence: {
        ...character.presence,
        availability: 'OUT_OF_CONTACT',
        assignment: 'NONE',
        fieldPartyId: null,
      },
    }));
    const resolution = command(
      missingState,
      'ResolveMissing',
      {
        resolutionId: 'missing-resolution',
        characterId: 'leader',
        notBefore: '10',
        outcomeReceiptId: 'missing-proof-fact',
      },
      'late-missing-death',
      'WORLD_RECEIPT',
      tick(20),
    );
    const interval = {
      ...segment(fixture, 10, 15, 'ELIGIBLE'),
      commandId: resolution.commandId,
    };
    const manifest = {
      companyId: resolution.companyId,
      worldId: resolution.worldId,
      commandId: resolution.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.book.intervalId,
      targetTick: tick(15),
      evidenceIds: [
        interval.intervalId,
        interval.ownerIntervalId,
        fixture.task.start.taskId,
        'missing-resolution',
        'missing-proof-fact',
      ],
    };
    const financeFact = {
      ...scope(missingState, 'missing-finance-fact', tick(20)),
      sourceEventId: resolution.sourceEventId,
      kind: 'FINANCIAL_DEATH' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'missing-fatal-cause',
      custodyOutcomeId: 'missing-body-fact',
      recipient: { kind: 'ESTATE' as const, id: 'leader' },
    };
    const deathFact = {
      ...physicalScope(missingState, 'missing-body-fact', tick(20)),
      sourceEventId: resolution.sourceEventId,
      kind: 'DEATH_OUTCOME' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'missing-fatal-cause',
      location: place,
      corpseContainerId: 'missing-corpse',
    };
    const resolutionFact = {
      ...physicalScope(missingState, 'missing-proof-fact', tick(20)),
      sourceEventId: resolution.sourceEventId,
      kind: 'MISSING_RESOLUTION' as const,
      characterId: 'leader',
      notBefore: tick(10),
      outcome: 'DEAD' as const,
      actualDeathTick: tick(15),
      causeId: 'missing-fatal-cause',
      location: place,
      custodyOutcomeId: 'missing-body-fact',
      financialDeathReceiptId: 'missing-finance-fact',
    };
    expect(resolutionFact.id).not.toBe(resolution.sourceEventId);
    const foodFacts = missingState.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .flatMap((membership, ordinal) => {
        const fact = (fromTick: number, toTick: number, suffix: string, index: number) => ({
          ...physicalScope(
            missingState,
            `missing-food-${membership.characterId}-${suffix}`,
            tick(20),
            index,
          ),
          kind: 'FOOD_FULFILLMENT' as const,
          membershipId: membership.membershipId,
          fromTick: tick(fromTick),
          toTick: tick(toTick),
          channel: 'STOCK' as const,
          location: place,
          containerId: 'fixture-supply',
        });
        return [
          fact(10, 15, '10-15', ordinal * 2),
          ...(membership.characterId === 'leader' ? [] : [fact(15, 20, '15-20', ordinal * 2 + 1)]),
        ];
      });
    const result = prepareCompanyEconomyWithLearning(
      { ...started.next, economy: missingState },
      resolution,
      {
        ...context(
          missingState,
          resolution,
          [financeFact],
          [],
          [resolutionFact, deathFact, ...foodFacts],
        ),
        learningFacts: fixture.startContext.learningFacts,
      },
      { intervals: [interval], manifests: [manifest], effectId: 'late-missing-death' },
    );
    expect(result.kind, JSON.stringify(result)).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]).toMatchObject({
      completedTicks: '5',
      processedThroughTick: '15',
      terminal: { kind: 'INTERRUPTED', commandId: resolution.commandId },
    });
    expect(
      result.next.economy.lifecycle.characters.find(
        (character) => character.identity.characterId === 'leader',
      )?.presence.availability,
    ).toBe('DEAD');
  });

  it('interrupts only shared-provider courses on provider death and replays the same candidate', () => {
    let state = economy([1n, 1n, 1n], 7_000_000n, 10);
    const owner = { kind: 'COMPANY' as const, id: state.lifecycle.companyId };
    state = addItem(state, item('book-1', 'study-book-medicine', owner, 'fixture-supply'));
    state = addItem(state, item('book-2', 'study-book-medicine', owner, 'fixture-supply'));
    let learning = createCompanyLearningState();

    const firstCourse = startScenarioTask(state, learning, 'worker-0', true, 'book-1');
    state = firstCourse.result.next.economy;
    learning = firstCourse.result.next.learning;
    const secondCourse = startScenarioTask(state, learning, 'worker-1', true, 'book-1');
    state = secondCourse.result.next.economy;
    learning = secondCourse.result.next.learning;
    const unrelatedBook = startScenarioTask(state, learning, 'worker-2', false, 'book-2');
    state = unrelatedBook.result.next.economy;
    learning = unrelatedBook.result.next.learning;

    const bookTaskId = unrelatedBook.fixture.task.start.taskId;
    const bookTaskBefore = learning.tasks.tasks.find((entry) => entry.start.taskId === bookTaskId);
    const bookAccessBefore = learning.studyAccess.intervals.filter(
      (entry) => entry.characterId === 'worker-2',
    );
    const progressBefore = learning.studyProgress;
    expect(bookTaskBefore).toBeDefined();
    expect(bookAccessBefore).toHaveLength(1);

    const death = command(
      state,
      'RecordDeath',
      {
        receiptId: 'shared-provider-death-finance',
        characterId: 'leader',
        actualDeathTick: tick(15),
        causeId: 'shared-provider-fatal-cause',
        custodyOutcomeId: 'shared-provider-death-physical',
      },
      'shared-provider-death',
      'OUTCOME_RECEIPT',
      tick(20),
    );
    const intervals = [firstCourse.fixture, secondCourse.fixture].map((fixture) => ({
      ...segment(fixture, 10, 15, 'ELIGIBLE'),
      commandId: death.commandId,
    }));
    const deathManifest = (fixture: ScenarioFixture, interval: LearningTimeInterval) => ({
      companyId: death.companyId,
      worldId: death.worldId,
      commandId: death.commandId,
      taskId: fixture.task.start.taskId,
      ownerIntervalId: fixture.task.start.quote.sourceId,
      targetTick: tick(15),
      evidenceIds: [
        ...intervalEvidenceIds(interval),
        fixture.task.start.taskId,
        'shared-provider-death-finance',
        'shared-provider-death-physical',
      ],
    });
    const manifests = [
      deathManifest(firstCourse.fixture, intervals[0]!),
      deathManifest(secondCourse.fixture, intervals[1]!),
    ];
    const financeFact = {
      ...scope(state, 'shared-provider-death-finance', tick(20)),
      sourceEventId: death.sourceEventId,
      kind: 'FINANCIAL_DEATH' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'shared-provider-fatal-cause',
      custodyOutcomeId: 'shared-provider-death-physical',
      recipient: { kind: 'ESTATE' as const, id: 'leader' },
    };
    const deathFact = {
      ...physicalScope(state, 'shared-provider-death-physical', tick(20)),
      sourceEventId: death.sourceEventId,
      kind: 'DEATH_OUTCOME' as const,
      characterId: 'leader',
      actualDeathTick: tick(15),
      causeId: 'shared-provider-fatal-cause',
      location: place,
      corpseContainerId: 'shared-provider-corpse',
    };
    const foodFacts = state.lifecycle.memberships
      .filter((membership) => membership.endedAt === null)
      .flatMap((membership, ordinal) => {
        const fact = (from: number, to: number, suffix: string, index: number) => ({
          ...physicalScope(
            state,
            `shared-provider-food-${membership.characterId}-${suffix}`,
            tick(20),
            index,
          ),
          kind: 'FOOD_FULFILLMENT' as const,
          membershipId: membership.membershipId,
          fromTick: tick(from),
          toTick: tick(to),
          channel: 'STOCK' as const,
          location: place,
          containerId: 'fixture-supply',
        });
        return [
          fact(10, 15, '10-15', ordinal * 2),
          ...(membership.characterId === 'leader' ? [] : [fact(15, 20, '15-20', ordinal * 2 + 1)]),
        ];
      });
    const learningFacts = [
      ...firstCourse.fixture.startContext.learningFacts,
      ...secondCourse.fixture.startContext.learningFacts,
      ...unrelatedBook.fixture.startContext.learningFacts,
    ];
    const deathContext = {
      ...context(state, death, [financeFact], [], [deathFact, ...foodFacts]),
      learningFacts,
    };
    const cause = {
      intervals,
      manifests,
      effectId: 'shared-provider-death-learning',
    };
    const result = prepareCompanyEconomyWithLearning(
      { economy: state, learning },
      death,
      deathContext,
      cause,
    );

    expect(result.kind, result.kind === 'REJECTED' ? result.error : undefined).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    const terminalTasks = result.next.learning.tasks.tasks.filter((entry) => entry.terminal);
    expect(terminalTasks.map((entry) => entry.start.taskId).sort()).toEqual(
      [firstCourse.fixture.task.start.taskId, secondCourse.fixture.task.start.taskId].sort(),
    );
    for (const task of terminalTasks)
      expect(task).toMatchObject({
        completedTicks: '5',
        processedThroughTick: '15',
        terminal: { kind: 'INTERRUPTED', commandId: death.commandId },
      });
    expect(
      result.next.economy.finance.learningEffects
        ?.filter((effect) => effect.commandId === death.commandId)
        .map((effect) => [effect.taskId, effect.acceptedTicks])
        .sort(([left], [right]) => left!.localeCompare(right!)),
    ).toEqual(
      [firstCourse.fixture.task.start.taskId, secondCourse.fixture.task.start.taskId]
        .sort()
        .map((taskId) => [taskId, '5']),
    );
    expect(
      result.next.learning.tasks.tasks.find((entry) => entry.start.taskId === bookTaskId),
    ).toEqual(bookTaskBefore);
    expect(
      result.next.learning.studyAccess.intervals.filter(
        (entry) => entry.characterId === 'worker-2',
      ),
    ).toEqual(bookAccessBefore);
    expect(result.next.learning.studyProgress).toEqual(progressBefore);

    const retry = prepareCompanyEconomyWithLearning(result.next, death, deathContext, cause);
    expect(retry.kind).toBe('PREPARED');
    if (retry.kind !== 'PREPARED') return;
    expect(retry.replayed).toBe(true);
    expect(retry.next).toEqual(result.next);
  });

  it('settles shared-provider course prefixes when a combat receipt records the provider missing', () => {
    let state = economy([1n, 1n], 7_000_000n, 10);
    const companyOwner = { kind: 'COMPANY' as const, id: state.lifecycle.companyId };
    state = addItem(state, item('book-1', 'study-book-medicine', companyOwner, 'fixture-supply'));
    state = addItem(state, item('book-2', 'study-book-medicine', companyOwner, 'fixture-supply'));
    let learning = createCompanyLearningState();

    const firstCourse = startScenarioTask(state, learning, 'worker-0', true, 'book-1');
    state = firstCourse.result.next.economy;
    learning = firstCourse.result.next.learning;
    const secondCourse = startScenarioTask(state, learning, 'worker-1', true, 'book-1');
    state = secondCourse.result.next.economy;
    learning = secondCourse.result.next.learning;
    // The retained courses earned through tick 15; the shared provider then entered combat.
    state = atTick(state, 20);
    state = visibleCharacter(state, 'leader', (character) => ({
      ...character,
      presence: {
        ...character.presence,
        availability: 'IN_ENCOUNTER',
        encounterBindingId: entityId<'EncounterBinding'>('missing-provider-binding'),
      },
    }));
    const missing = command(
      state,
      'RecordMissing',
      {
        receiptId: 'shared-provider-missing-entry',
        bindingId: entityId<'EncounterBinding'>('missing-provider-binding'),
        battleId: 'shared-provider-missing-battle',
        terminalReceiptId: 'shared-provider-missing-terminal',
        unitId: 'shared-provider-unit',
        characterId: 'leader',
      },
      'shared-provider-recorded-missing',
      'COMBAT_RECEIPT',
      tick(20),
    ) as ReturnType<typeof command> & CommandOf<'RecordMissing'>;
    const missingFact = {
      ...physicalScope(state, 'shared-provider-missing-entry', tick(20)),
      sourceEventId: missing.sourceEventId,
      kind: 'MISSING_ENTRY' as const,
      bindingId: missing.payload.bindingId,
      battleId: missing.payload.battleId,
      terminalReceiptId: missing.payload.terminalReceiptId,
      unitId: missing.payload.unitId,
      characterId: 'leader',
      location: place,
      containerIds: [],
      itemIds: [],
      disposition: 'RETAIN_WITH_PERSON' as const,
    };
    const courseFixtures = [firstCourse.fixture, secondCourse.fixture];
    const intervals = courseFixtures.flatMap((fixture) =>
      [segment(fixture, 10, 15, 'ELIGIBLE'), segment(fixture, 15, 20, 'INELIGIBLE')].map(
        (interval) => ({ ...interval, commandId: missing.commandId }),
      ),
    );
    const manifests = courseFixtures.map((fixture) => {
      const taskIntervals = intervals.filter((entry) => entry.taskId === fixture.task.start.taskId);
      return {
        companyId: missing.companyId,
        worldId: missing.worldId,
        commandId: missing.commandId,
        taskId: fixture.task.start.taskId,
        ownerIntervalId: fixture.task.start.quote.sourceId,
        targetTick: tick(20),
        evidenceIds: [
          ...new Set([
            ...taskIntervals.flatMap(intervalEvidenceIds),
            fixture.task.start.taskId,
            missing.payload.receiptId,
          ]),
        ],
      };
    });
    const learningFacts = [
      ...firstCourse.fixture.startContext.learningFacts,
      ...secondCourse.fixture.startContext.learningFacts,
    ];
    const missingContext = {
      ...context(state, missing, [], [], [missingFact]),
      learningFacts,
    };
    const input = { economy: state, learning };
    const before = structuredClone(input);
    const result = prepareCompanyEconomyWithLearning(input, missing, missingContext, {
      intervals,
      manifests,
      effectId: 'shared-provider-missing-learning',
    });

    expect(result.kind, result.kind === 'REJECTED' ? result.error : '').toBe('PREPARED');
    if (result.kind !== 'PREPARED') {
      expect(input).toEqual(before);
      return;
    }
    for (const fixture of courseFixtures) {
      const task = result.next.learning.tasks.tasks.find(
        (entry) => entry.start.taskId === fixture.task.start.taskId,
      );
      expect(task).toMatchObject({
        completedTicks: '5',
        processedThroughTick: '20',
        terminal: { kind: 'INTERRUPTED', commandId: missing.commandId },
      });
    }
    expect(
      result.next.economy.finance.learningEffects
        ?.filter((effect) => effect.commandId === missing.commandId)
        .map((effect) => effect.acceptedTicks)
        .sort(),
    ).toEqual(['5', '5']);
    expect(result.next.economy.physical?.containers).toEqual(state.physical?.containers);
    expect(result.next.economy.physical?.items).toEqual(state.physical?.items);
  });

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
        intervals: [],
        manifest: {
          companyId: stopCommand.companyId,
          worldId: stopCommand.worldId,
          commandId: stopCommand.commandId,
          taskId: fixture.task.start.taskId,
          ownerIntervalId: fixture.task.start.studyIntervalId ?? fixture.task.start.quote.sourceId,
          targetTick: stopCommand.campaignTick,
          evidenceIds: [
            fixture.task.start.taskId,
            fixture.task.start.studyIntervalId ?? fixture.task.start.quote.sourceId,
          ],
        },
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
        intervals: [],
        manifest: {
          companyId: stopCommand.companyId,
          worldId: stopCommand.worldId,
          commandId: stopCommand.commandId,
          taskId: fixture.task.start.taskId,
          ownerIntervalId: fixture.task.start.studyIntervalId!,
          targetTick: stopCommand.campaignTick,
          evidenceIds: [fixture.task.start.taskId, fixture.task.start.studyIntervalId!],
        },
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
        intervals: [],
        manifest: {
          companyId: stopCommand.companyId,
          worldId: stopCommand.worldId,
          commandId: stopCommand.commandId,
          taskId: fixture.task.start.taskId,
          ownerIntervalId: fixture.task.start.studyIntervalId ?? fixture.task.start.quote.sourceId,
          targetTick: stopCommand.campaignTick,
          evidenceIds: [
            fixture.task.start.taskId,
            fixture.task.start.studyIntervalId ?? fixture.task.start.quote.sourceId,
          ],
        },
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

  it('releases a book copy when prior section progress reaches its goal', () => {
    const fixture = admitted(false);
    const key = {
      characterId: 'leader',
      workId: 'wound-care-basics',
      sectionId: 'wound-care-basics-1',
    };
    const prior = advanceStudySection(null, key, '900').next;
    const completed = prepare(
      fixture,
      910,
      [segment(fixture, 10, 910, 'ELIGIBLE')],
      atTick(fixture.state, 910),
      fixture.tasks,
      fixture.study,
      prior,
    );
    expect(completed.tasks.tasks[0]?.terminal?.kind).toBe('GOAL_REACHED');
    expect(completed.studyAccess.intervals[0]?.effectiveToTick).toBe(
      completed.tasks.tasks[0]?.processedThroughTick,
    );

    const reuseCommand = command(completed.state, 'StopLearning', {
      taskId: fixture.task.start.taskId,
      reason: 'PLAYER',
    });
    const nextAccess = admitStudyInterval(
      completed.studyAccess,
      completed.state as MaterializedCompanyState,
      {
        ...context(completed.state, reuseCommand, []),
        physicalFacts: [
          {
            ...itemAccess(
              completed.state,
              'next-reader-access',
              'STUDY',
              ['fixture-supply'],
              ['book-1'],
            ),
            operatorId: 'worker-0',
          },
        ],
        contactIds: ['worker-0'],
      },
      {
        intervalId: 'next-reader-interval',
        characterId: 'worker-0',
        workId: 'wound-care-basics',
        sectionId: 'wound-care-basics-1',
        itemId: 'book-1',
        accessEvidenceId: 'next-reader-access',
        fromTick: '910',
        toTick: '920',
      },
    );
    expect(nextAccess.intervals.at(-1)).toMatchObject({
      characterId: 'worker-0',
      fromTick: '910',
    });
  });

  it('preserves eligible study across a same-location duty change', () => {
    const fixture = admitted(false);
    const state = withCareProvider(fixture.state);
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
    const handover = { ...careHandover(state, 'leader'), atTick: tick(20) };
    const input = { economy: state, learning };
    const foodFacts = state.lifecycle.memberships.map((membership, ordinal) => ({
      ...physicalScope(state, `duty-food-${membership.membershipId}`, tick(20), ordinal),
      kind: 'FOOD_FULFILLMENT' as const,
      membershipId: membership.membershipId,
      fromTick: tick(10),
      toTick: tick(20),
      channel: 'STOCK' as const,
      location: { kind: 'AT' as const, siteId: 'village', areaId: 'square' },
      containerId: 'fixture-supply',
    }));
    const contextWithFacts = (includeDuty: boolean) => ({
      ...context(state, duty, [access(state, tick(20))], includeDuty ? [dutyFact] : [], [
        handover,
        ...foodFacts,
      ]),
      learningFacts: fixture.startContext.learningFacts,
    });
    const interruption = {
      intervals: [],
      effectId: 'duty-learning-effect',
    };
    const control = prepareCompanyEconomy(state, duty, contextWithFacts(true));
    expect(control.kind).toBe('PREPARED');
    const prepared = prepareCompanyEconomyWithLearning(
      input,
      duty,
      contextWithFacts(true),
      interruption,
    );
    if (prepared.kind !== 'PREPARED') throw new Error(prepared.error);
    expect(prepared.next.learning.tasks.tasks[0]?.completedTicks).toBe('0');
    expect(prepared.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();
    expect(prepared.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBeUndefined();
    expect(
      prepared.next.economy.finance.learningEffects?.some(
        (effect) => effect.commandId === duty.commandId,
      ),
    ).toBe(false);

    const rejected = prepareCompanyEconomyWithLearning(
      input,
      duty,
      contextWithFacts(false),
      interruption,
    );
    expect(rejected.kind).toBe('REJECTED');
    expect(rejected.state).toEqual(input);
  });

  it('keeps a locally accessible book through a container transfer and interrupts on destruction', () => {
    function dispose(disposition: 'TRANSFER' | 'DESTROY_WITH_CAUSE') {
      const fixture = admitted(false);
      let state = fixture.state;
      if (disposition === 'TRANSFER')
        state = addContainer(
          state,
          container(
            'other-local-container',
            {
              kind: 'COMPANY',
              id: state.lifecycle.companyId,
            },
            200000,
          ),
        );
      const commandValue = command(
        state,
        'ApplyContainerLifecycle',
        {
          receiptId: `container-${disposition}`,
          containerId: 'fixture-supply',
          causeId: `container-${disposition}-cause`,
          notBefore: tick(10),
          disposition,
          ...(disposition === 'TRANSFER' ? { destinationId: 'other-local-container' } : {}),
        },
        `container-${disposition}`,
        'WORLD_RECEIPT',
      );
      const fact: PhysicalEvidence = {
        ...physicalScope(state, `container-${disposition}`),
        sourceEventId: commandValue.sourceEventId!,
        kind: 'CONTAINER_DISPOSITION',
        containerId: 'fixture-supply',
        causeId: `container-${disposition}-cause`,
        notBefore: tick(10),
        disposition,
        ...(disposition === 'TRANSFER' ? { destinationId: 'other-local-container' } : {}),
      };
      const commandContext = {
        ...context(state, commandValue, [], [], [fact]),
        learningFacts: fixture.startContext.learningFacts,
      };
      expect(prepareCompanyEconomy(state, commandValue, commandContext).kind).toBe('PREPARED');
      const result = prepareCompanyEconomyWithLearning(
        {
          economy: state,
          learning: {
            ...createCompanyLearningState(),
            tasks: fixture.tasks,
            studyAccess: fixture.study,
          },
        },
        commandValue,
        commandContext,
        {
          intervals: [],
          ...(disposition === 'DESTROY_WITH_CAUSE'
            ? {
                manifests: [
                  {
                    companyId: commandValue.companyId,
                    worldId: commandValue.worldId,
                    commandId: commandValue.commandId,
                    taskId: fixture.task.start.taskId,
                    ownerIntervalId: fixture.book.intervalId,
                    targetTick: commandValue.campaignTick,
                    evidenceIds: [fact.id],
                  },
                ],
              }
            : {}),
          effectId: `container-learning-${disposition}`,
        },
      );
      return { fixture, result };
    }
    const localTransfer = dispose('TRANSFER');
    expect(localTransfer.result.kind, JSON.stringify(localTransfer.result)).toBe('PREPARED');
    if (localTransfer.result.kind !== 'PREPARED') return;
    expect(localTransfer.result.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();
    expect(
      localTransfer.result.next.learning.studyAccess.intervals[0]?.effectiveToTick,
    ).toBeUndefined();

    const destroyed = dispose('DESTROY_WITH_CAUSE');
    expect(destroyed.result.kind).toBe('PREPARED');
    if (destroyed.result.kind !== 'PREPARED') return;
    expect(destroyed.result.next.learning.tasks.tasks[0]?.terminal?.kind).toBe('INTERRUPTED');
    expect(destroyed.result.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBe('10');
  });

  it('uses a solo arrival that leaves the frozen study location as an interruption boundary', () => {
    const fixture = admitted(false);
    const state = visibleCharacter(atTick(fixture.state, 20), 'leader', (character) => ({
      ...character,
      presence: {
        ...character.presence,
        assignment: 'NONE',
        fieldPartyId: null,
        location: {
          kind: 'TRANSIT',
          segmentId: 'solo-road',
          from: 'village',
          to: 'distant-village',
          startedAt: tick(10),
          arrivalNotBefore: tick(20),
        },
      },
    }));
    const arrived = command(
      state,
      'Arrive',
      {
        characterId: 'leader',
        segmentId: 'solo-road',
        arrivalEvidenceId: 'solo-arrival',
      },
      'solo-arrival',
      'WORLD_RECEIPT',
      tick(20),
    );
    const fact: LifecycleEvidence = {
      ...scope(state, 'solo-arrival', tick(20)),
      sourceEventId: arrived.sourceEventId!,
      kind: 'ARRIVAL',
      characterId: 'leader',
      segmentId: 'solo-road',
      from: 'village',
      location: { kind: 'AT', siteId: 'distant-village', areaId: 'square' },
    };
    const commandContext = {
      ...context(state, arrived, [], [fact]),
      learningFacts: fixture.startContext.learningFacts,
    };
    const arrivalControl = prepareCompanyEconomy(state, arrived, commandContext);
    expect(
      arrivalControl.kind,
      arrivalControl.kind === 'REJECTED' ? arrivalControl.error : undefined,
    ).toBe('PREPARED');
    const interval = { ...segment(fixture, 10, 20, 'INELIGIBLE'), commandId: arrived.commandId };
    const result = prepareCompanyEconomyWithLearning(
      {
        economy: state,
        learning: {
          ...createCompanyLearningState(),
          tasks: fixture.tasks,
          studyAccess: fixture.study,
        },
      },
      arrived,
      commandContext,
      {
        intervals: [interval],
        manifests: [
          {
            companyId: arrived.companyId,
            worldId: arrived.worldId,
            commandId: arrived.commandId,
            taskId: fixture.task.start.taskId,
            ownerIntervalId: fixture.book.intervalId,
            targetTick: arrived.campaignTick,
            evidenceIds: [...intervalEvidenceIds(interval), 'solo-arrival'],
          },
        ],
        effectId: 'arrival-learning',
      },
    );
    expect(result.kind, JSON.stringify(result)).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]?.terminal?.kind).toBe('INTERRUPTED');
    expect(result.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBe('20');
  });

  it('does not interrupt learning for a field camp, but does for a newly covered F1 beneficiary', () => {
    const fixture = admitted(false);
    const camp = command(fixture.state, 'BeginFieldCamp', {
      partyId: 'party',
      siteEligibilityId: 'camp-site',
    });
    const campFact = {
      ...scope(fixture.state, 'camp-site'),
      kind: 'CAMP_SITE' as const,
      partyId: 'party',
      location: place,
      stationary: true,
      conflict: false,
    };
    const campContext = {
      ...context(fixture.state, camp, [campFact]),
      learningFacts: fixture.startContext.learningFacts,
    };
    expect(prepareCompanyEconomy(fixture.state, camp, campContext).kind).toBe('PREPARED');
    const campResult = prepareCompanyEconomyWithLearning(
      {
        economy: fixture.state,
        learning: {
          ...createCompanyLearningState(),
          tasks: fixture.tasks,
          studyAccess: fixture.study,
        },
      },
      camp,
      campContext,
      { intervals: [], effectId: 'camp-learning' },
    );
    expect(campResult.kind).toBe('PREPARED');
    if (campResult.kind !== 'PREPARED') return;
    expect(campResult.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();
    expect(campResult.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBeUndefined();

    const campAgreementId = campResult.next.economy.finance.maintenance[0]!.agreementId;
    const endCamp = command(
      campResult.next.economy,
      'EndMaintenance',
      {
        agreementOrCampId: campAgreementId,
        reason: 'ENCOUNTER',
      },
      'end-field-camp',
      'SYSTEM',
    );
    const campBoundary = {
      ...scope(campResult.next.economy, 'camp-boundary'),
      sourceEventId: endCamp.sourceEventId,
      kind: 'MAINTENANCE_BOUNDARY' as const,
      agreementId: campAgreementId,
      reason: 'ENCOUNTER' as const,
    };
    const endContext = {
      ...context(campResult.next.economy, endCamp, [campBoundary]),
      learningFacts: fixture.startContext.learningFacts,
    };
    const endControl = prepareCompanyEconomy(campResult.next.economy, endCamp, endContext);
    expect(endControl.kind, endControl.kind === 'REJECTED' ? endControl.error : undefined).toBe(
      'PREPARED',
    );
    const endedCamp = prepareCompanyEconomyWithLearning(campResult.next, endCamp, endContext, {
      intervals: [],
      effectId: 'camp-release-learning',
    });
    expect(endedCamp.kind).toBe('PREPARED');
    if (endedCamp.kind !== 'PREPARED') return;
    expect(endedCamp.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();

    const state: CompanyEconomyState = {
      ...fixture.state,
      finance: {
        ...fixture.state.finance,
        maintenance: [
          {
            agreementId: 'old-safe-service',
            kind: 'SAFE_SERVICE',
            partyId: 'party',
            location: place,
            beneficiaryIds: ['leader', 'worker-0'],
            beneficiaryEnds: [{ characterId: 'leader', atTick: tick(9), knownAtTick: tick(9) }],
            startedAt: tick(0),
            endedAt: null,
            knownEndedAt: null,
            sourceId: 'old-safe-offer',
            providerId: 'provider',
            termsVersion: 'terms-v1',
          },
        ],
      },
    };
    const amendment = command(state, 'AmendSafeService', {
      agreementId: 'old-safe-service',
      beneficiaryIds: ['leader', 'worker-0'],
      quoteRevision: state.lifecycle.knowledge.revision,
    });
    const offer = {
      ...scope(state, 'safe-offer'),
      kind: 'SAFE_SERVICE_OFFER' as const,
      partyId: 'party',
      location: place,
      providerId: 'provider',
      offerRevision: state.lifecycle.knowledge.revision,
      termsVersion: 'terms-v1',
      expiresAt: tick(500),
      permittedBeneficiaryIds: ['leader', 'worker-0'],
      safe: true,
      inhabited: true,
      accessible: true,
    };
    const amendmentContext = {
      ...context(state, amendment, [access(state), offer]),
      learningFacts: fixture.startContext.learningFacts,
    };
    expect(prepareCompanyEconomy(state, amendment, amendmentContext).kind).toBe('PREPARED');
    const amended = prepareCompanyEconomyWithLearning(
      {
        economy: state,
        learning: {
          ...createCompanyLearningState(),
          tasks: fixture.tasks,
          studyAccess: fixture.study,
        },
      },
      amendment,
      amendmentContext,
      {
        intervals: [],
        manifests: [
          {
            companyId: amendment.companyId,
            worldId: amendment.worldId,
            commandId: amendment.commandId,
            taskId: fixture.task.start.taskId,
            ownerIntervalId: fixture.book.intervalId,
            targetTick: amendment.campaignTick,
            evidenceIds: ['old-safe-service'],
          },
        ],
        effectId: 'amend-safe-learning',
      },
    );
    expect(amended.kind).toBe('PREPARED');
    if (amended.kind !== 'PREPARED') return;
    expect(amended.next.learning.tasks.tasks[0]?.terminal?.kind).toBe('INTERRUPTED');
    expect(amended.next.learning.studyAccess.intervals[0]?.effectiveToTick).toBe('10');
  });

  it('interrupts a course when its actual provider loses work capability', () => {
    const fixture = admitted(true);
    const condition = command(
      fixture.state,
      'ApplyCondition',
      {
        receiptId: 'provider-injury',
        characterId: 'provider',
        conditionDefinitionId: 'critical-bleed',
        causeId: 'provider-battle-wound',
        deadlineTick: tick(260),
      },
      'provider-injury',
      'DOMAIN_RECEIPT',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(fixture.state, 'provider-injury'),
      sourceEventId: condition.sourceEventId!,
      kind: 'CONDITION_SOURCE',
      characterId: 'provider',
      definitionId: 'critical-bleed',
      causeId: 'provider-battle-wound',
      onsetTick: tick(10),
      deadlineTick: tick(260),
    };
    const injuryContext = {
      ...context(fixture.state, condition, [], [], [fact]),
      learningFacts: fixture.startContext.learningFacts,
    };
    const injuryControl = prepareCompanyEconomy(fixture.state, condition, injuryContext);
    expect(
      injuryControl.kind,
      injuryControl.kind === 'REJECTED' ? injuryControl.error : undefined,
    ).toBe('PREPARED');
    const result = prepareCompanyEconomyWithLearning(
      {
        economy: fixture.state,
        learning: { ...createCompanyLearningState(), tasks: fixture.tasks },
      },
      condition,
      injuryContext,
      {
        intervals: [],
        manifests: [
          {
            companyId: condition.companyId,
            worldId: condition.worldId,
            commandId: condition.commandId,
            taskId: fixture.task.start.taskId,
            ownerIntervalId: fixture.task.start.quote.sourceId,
            targetTick: condition.campaignTick,
            evidenceIds: ['provider-injury'],
          },
        ],
        effectId: 'provider-injury-learning',
      },
    );
    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]?.terminal?.kind).toBe('INTERRUPTED');

    const courseSource = fixture.startContext.learningFacts[0]!;
    const capture = command(
      fixture.state,
      'Capture',
      {
        receiptId: 'provider-capture',
        characterId: 'provider',
        captorRef: { kind: 'WORLD', id: 'world' },
        locationRef: place,
        seizedItems: [],
      },
      'provider-capture',
      'OUTCOME_RECEIPT',
    ) as Capture;
    const captureFact: PhysicalEvidence = {
      ...physicalScope(fixture.state, 'provider-capture'),
      sourceEventId: capture.sourceEventId!,
      kind: 'CAPTURE_OUTCOME',
      characterId: 'provider',
      captor: { kind: 'WORLD', id: 'world' },
      location: place,
    };
    const captureContext = {
      ...context(fixture.state, capture, [], [], [captureFact]),
      learningFacts: fixture.startContext.learningFacts,
    };
    const captureControl = prepareCompanyEconomy(fixture.state, capture, captureContext);
    expect(
      captureControl.kind,
      captureControl.kind === 'REJECTED' ? captureControl.error : undefined,
    ).toBe('PREPARED');
    const capturedProvider = prepareCompanyEconomyWithLearning(
      {
        economy: fixture.state,
        learning: { ...createCompanyLearningState(), tasks: fixture.tasks },
      },
      capture,
      captureContext,
      {
        intervals: [],
        manifests: [
          {
            companyId: capture.companyId,
            worldId: capture.worldId,
            commandId: capture.commandId,
            taskId: fixture.task.start.taskId,
            ownerIntervalId: courseSource.id,
            targetTick: capture.campaignTick,
            evidenceIds: ['provider-capture'],
          },
        ],
        effectId: 'provider-capture-learning',
      },
    );
    expect(capturedProvider.kind).toBe('PREPARED');
    if (capturedProvider.kind !== 'PREPARED') return;
    expect(capturedProvider.next.learning.tasks.tasks[0]?.terminal?.kind).toBe('INTERRUPTED');
    expect(capturedProvider.next.learning.tasks.tasks[0]?.start.command.payload.characterId).toBe(
      'leader',
    );
    expect(capture.payload.characterId).toBe(
      courseSource.kind === 'COURSE' ? courseSource.providerId : undefined,
    );
  });

  it('keeps a course active when a provider condition preserves work capability', () => {
    const fixture = admitted(true);
    const condition = command(
      fixture.state,
      'ApplyCondition',
      {
        receiptId: 'provider-minor-wound',
        characterId: 'provider',
        conditionDefinitionId: 'minor-field-wound',
        causeId: 'provider-minor-wound',
      },
      'provider-minor-wound',
      'DOMAIN_RECEIPT',
    );
    const fact: PhysicalEvidence = {
      ...physicalScope(fixture.state, 'provider-minor-wound'),
      sourceEventId: condition.sourceEventId!,
      kind: 'CONDITION_SOURCE',
      characterId: 'provider',
      definitionId: 'minor-field-wound',
      causeId: 'provider-minor-wound',
      onsetTick: tick(10),
    };
    const causeContext = {
      ...context(fixture.state, condition, [], [], [fact]),
      learningFacts: fixture.startContext.learningFacts,
    };
    expect(prepareCompanyEconomy(fixture.state, condition, causeContext).kind).toBe('PREPARED');

    const result = prepareCompanyEconomyWithLearning(
      {
        economy: fixture.state,
        learning: { ...createCompanyLearningState(), tasks: fixture.tasks },
      },
      condition,
      causeContext,
      { intervals: [], manifests: [], effectId: 'provider-minor-wound-learning' },
    );

    expect(result.kind).toBe('PREPARED');
    if (result.kind !== 'PREPARED') return;
    expect(result.next.learning.tasks.tasks[0]?.terminal).toBeUndefined();
    expect(result.next.learning.tasks.tasks[0]?.stop).toBeUndefined();
  });
});
