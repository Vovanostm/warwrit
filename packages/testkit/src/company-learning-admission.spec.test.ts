import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  admitLearningTask,
  creditProgression,
  createLearningTaskState,
  createStudyAccessState,
  initialSkillProgress,
  prepareCompanyEconomy,
  prepareLearningComposition,
  quoteLearningTask,
  readLearningTaskInputs,
  startLearningTask,
  stopLearningTask,
  xpToMilliXp,
} from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  LearningQuoteContext,
  LearningTaskAdmission,
  LearningTimeInterval,
  MaterializedCompanyState,
} from '@warwrit/game-core';
import {
  access,
  cash,
  command,
  context,
  economy,
  place,
  scope,
  tick,
} from './company-economy-fixture.js';
import { addItem, item, itemAccess } from './company-physical-fixture.js';

type Start = ReturnType<typeof command> & CommandOf<'StartLearning'>;
type Advance = ReturnType<typeof command> & CommandOf<'AdvanceCampaign'>;
type Stop = ReturnType<typeof command> & CommandOf<'StopLearning'>;
const learningCommand = (f: Fixture) => f.request.command as CommandOf<'StartLearning'>;
const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function setup(course = false, learner = 'leader', copy = 'book-1', tag = 'first', at = '10') {
  let loaded = economy([1n], 7_000_000n, 10);
  const owner = { kind: 'COMPANY' as const, id: loaded.lifecycle.companyId };
  for (const id of ['book-1', 'book-2'])
    loaded = addItem(loaded, item(id, 'study-book-medicine', owner, 'fixture-supply'));
  const root = reload(loaded) as MaterializedCompanyState;
  Object.assign(root.lifecycle, { campaignTick: tick(at) });
  Object.assign(root.finance, { processedTick: tick(at) });
  Object.assign(root.physical, { processedTick: tick(at) });
  const member = root.lifecycle.characters.find(
    (person) => person.identity.characterId === learner,
  )!;
  Object.assign(member, {
    skills: {
      leadership: 25,
      scholarship: course ? 60 : 25,
      medicine: initialSkillProgress(0, 'learning-fixture'),
    },
    aptitudeBySkill: { leadership: 10000, medicine: 10000 },
    perks: [course ? 'scholarship-60-b' : 'scholarship-25-a'],
  });
  const payload = {
    characterId: learner,
    methodId: course ? 'funded-practice' : 'book-study',
    goal: course
      ? { skillId: 'medicine', maxTicks: '9000' }
      : { workId: 'wound-care-basics', maxTicks: '1000' },
    resourceIds: ['book-1', 'book-2'],
    budgetPoolId: 'local',
    maxBudgetQ: course ? '50000000' : '0',
  };
  const cmd = command(root, 'StartLearning', payload, `start-${tag}`) as Start;
  const study = { intervalId: `interval-${tag}`, itemId: copy, accessEvidenceId: `access-${tag}` };
  const fact = {
    ...itemAccess(root, study.accessEvidenceId, 'STUDY', ['fixture-supply'], [copy]),
    operatorId: learner,
  };
  const ctx: LearningQuoteContext = {
    ...context(root, cmd, [access(root)], [], [fact]),
    learningFacts: [
      {
        ...scope(root, `source-${tag}`),
        sourceVersion: 'v1',
        expiresAt: tick(BigInt(at) + 500n),
        learnerId: learner,
        location: place,
        resourceIds: cmd.payload.resourceIds,
        ...(course
          ? {
              kind: 'COURSE',
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
              kind: 'SELF_STUDY',
              methodId: 'book-study',
              workId: 'wound-care-basics',
              sectionId: 'wound-care-basics-1',
            }),
      },
    ],
  };
  const request: LearningTaskAdmission = {
    taskId: tag,
    command: cmd,
    ...(course ? {} : { study }),
  };
  return { root, ctx, request };
}
type Fixture = ReturnType<typeof setup>;
function retrainingFixture(): Fixture {
  const fixture = setup(true, 'leader', 'book-1', 'retraining', '10');
  const learner = fixture.root.lifecycle.characters.find(
    (entry) => entry.identity.characterId === 'leader',
  )!;
  Object.assign(
    fixture.root.finance.wallets.find((wallet) => wallet.walletId === 'purse')!,
    { cashQ: cash(20_000_000) },
  );
  Object.assign(learner, {
    skills: { ...learner.skills, blades: initialSkillProgress(25, 'retraining-fixture') },
    aptitudeBySkill: { ...learner.aptitudeBySkill, blades: 10000 },
    perks: ['blades-25-a'],
  });
  Object.assign(
    fixture.root.lifecycle.knowledge.characters.find(
      (entry) => entry.identity.characterId === 'leader',
    )!,
    { skills: { ...learner.skills }, perks: ['blades-25-a'] },
  );
  const retraining = command(
    fixture.root,
    'StartRetraining',
    {
      characterId: 'leader',
      oldPerkId: 'blades-25-a',
      newPerkId: 'blades-25-b',
      mentorEvidenceId: 'guard-mentor',
      budgetPoolId: 'local',
    },
    'retraining-start',
    'PLAYER',
    tick(10),
  ) as CommandOf<'StartRetraining'>;
  fixture.request = { taskId: 'retraining', command: retraining };
  fixture.ctx = {
    ...fixture.ctx,
    learningFacts: [
      {
        ...scope(fixture.root, 'guard-mentor'),
        sourceVersion: 'guard-v1',
        expiresAt: tick(510),
        learnerId: 'leader',
        location: place,
        resourceIds: [],
        kind: 'RETRAINING',
        methodId: 'funded-practice',
        skillId: 'blades',
        oldPerkId: 'blades-25-a',
        newPerkId: 'blades-25-b',
        providerId: 'provider',
        mentorId: 'provider',
        poolId: 'local',
        providerWalletId: 'wallet-provider',
        moneyAccessEvidenceId: 'money-access',
        costQPerDay: cash(5_000_000),
        maxTicks: '3000',
      },
    ],
  };
  return fixture;
}
const empty = () => ({ state: createLearningTaskState(), studyAccess: createStudyAccessState() });
function run(f: Fixture, owners = empty()) {
  return admitLearningTask(owners.state, owners.studyAccess, f.root, f.ctx, f.request);
}
function rejects(f: Fixture, owners = empty(), error?: string) {
  const before = reload({ f, owners });
  expect(() => run(f, owners)).toThrow(error);
  expect({ f, owners }).toEqual(before);
}

describe('C04b — real admission composition', () => {
  it('admits the approved blades retraining terms and stores its real command', () => {
    const fixture = retrainingFixture();
    const admitted = run(fixture);
    expect(admitted.task.start.command).toEqual(fixture.request.command);
    expect(admitted.task.start.retraining).toEqual({
      oldPerkId: 'blades-25-a',
      newPerkId: 'blades-25-b',
    });
    expect(admitted.task.start.quote).toMatchObject({
      maxTicks: '3000',
      funding: {
        costQPerDay: { numerator: '5000000', denominator: '1' },
      },
    });
    const composed = prepareLearningComposition(
      fixture.root,
      empty().state,
      empty().studyAccess,
      null,
      fixture.ctx,
      [],
      {
        kind: 'START',
        taskId: 'retraining',
        effectId: 'retraining-start-effect',
        admission: fixture.request,
      },
    );
    expect(composed.tasks.tasks[0]?.start.command).toEqual(fixture.request.command);
    expect(
      composed.state.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ,
    ).toBe(fixture.root.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ);
  });

  it('settles one and three elapsed days, preserves the old perk on interruption, swaps on completion, and short-funds retraining', () => {
    const fixture = retrainingFixture();
    const owners = empty();
    const start = prepareLearningComposition(
      fixture.root,
      owners.state,
      owners.studyAccess,
      null,
      fixture.ctx,
      [],
      {
        kind: 'START',
        taskId: 'retraining',
        effectId: 'retraining-start-effect',
        admission: fixture.request,
      },
    );
    expect(start.tasks.tasks[0]?.start.retraining).toEqual({
      oldPerkId: 'blades-25-a',
      newPerkId: 'blades-25-b',
    });
    const advance = (
      advanceFixture: Fixture,
      studyAccess: typeof start.studyAccess,
      baseState: CompanyEconomyState,
      taskState: typeof start.tasks,
      from: number,
      to: number,
    ) => {
      const state = reload(baseState);
      Object.assign(state.lifecycle, { campaignTick: tick(to) });
      Object.assign(state.finance, { processedTick: tick(to) });
      if (state.physical) Object.assign(state.physical, { processedTick: tick(to) });
      const source = advanceFixture.ctx.learningFacts[0]!;
      const task = taskState.tasks[0]!;
      const membership = state.lifecycle.memberships.find(
        (entry) => entry.characterId === 'leader' && entry.endedAt === null,
      )!;
      const participantIds = [...new Set(['leader', source.providerId!, source.mentorId!])];
      const attendanceId = `attendance-${from}-${to}`;
      const observations = participantIds.map((characterId) => {
        const person = state.lifecycle.characters.find(
          (entry) => entry.identity.characterId === characterId,
        )!;
        const location = person.presence.location;
        if (location.kind !== 'AT') throw new Error('Expected local person');
        return {
          observationId: `observation-${characterId}-${from}-${to}`,
          characterId,
          fromTick: String(from),
          toTick: String(to),
          location,
          assignment: person.presence.assignment,
          availability: person.presence.availability,
          encounterBindingId: person.presence.encounterBindingId,
          conditionIds: person.conditionIds,
        };
      });
      const interval: LearningTimeInterval = {
        intervalId: `interval-${from}-${to}`,
        taskId: task.start.taskId,
        commandId: 'bound-by-test',
        ownerIntervalId: task.start.quote.sourceId,
        companyId: state.lifecycle.companyId,
        worldId: state.lifecycle.worldId,
        characterId: 'leader',
        fromTick: String(from),
        toTick: String(to),
        kind: 'ELIGIBLE',
        courseAttendance: {
          attendanceId,
          sourceId: source.id,
          sourceVersion: source.sourceVersion,
          taskId: task.start.taskId,
          companyId: source.companyId,
          worldId: source.worldId,
          learnerId: 'leader',
          providerId: source.providerId!,
          mentorId: source.mentorId!,
          skillId: 'blades',
          resourceIds: [],
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
          observations,
        },
      };
      const evidenceIds = [
        interval.intervalId,
        interval.ownerIntervalId,
        attendanceId,
        membership.membershipId,
        ...observations.map((entry) => entry.observationId),
      ];
      const cmd = command(
        state,
        'AdvanceCampaign',
        { toTick: String(to), authoritativeInputs: evidenceIds },
        `retraining-advance-${to}`,
        'SYSTEM',
        tick(to),
      ) as Advance;
      const advanceContext: LearningQuoteContext = {
        ...context(state, cmd, [access(state, tick(to))]),
        learningFacts: advanceFixture.ctx.learningFacts,
      };
      const boundInterval = { ...interval, commandId: cmd.commandId };
      return prepareLearningComposition(
        state,
        taskState,
        studyAccess,
        null,
        advanceContext,
        [boundInterval],
        {
          kind: 'ADVANCE',
          taskId: task.start.taskId,
          effectId: `retraining-effect-${to}`,
          command: cmd,
          manifest: {
            companyId: state.lifecycle.companyId,
            worldId: state.lifecycle.worldId,
            commandId: cmd.commandId,
            taskId: task.start.taskId,
            ownerIntervalId: task.start.quote.sourceId,
            targetTick: String(to),
            evidenceIds,
          },
        },
      );
    };
    const firstDay = advance(fixture, start.studyAccess, start.state, start.tasks, 10, 1010);
    expect(firstDay.appliedElapsedTicks).toBe('1000');
    expect(
      firstDay.state.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ,
    ).toBe(cash(15_000_000));
    expect(
      firstDay.state.finance.wallets.find((wallet) => wallet.walletId === 'wallet-provider')?.cashQ,
    ).toBe(cash(5_000_000));
    expect(
      firstDay.state.lifecycle.characters.find((entry) => entry.identity.characterId === 'leader')
        ?.perks,
    ).toEqual(['blades-25-a']);
    expect(
      firstDay.state.lifecycle.knowledge.characters.find(
        (entry) => entry.identity.characterId === 'leader',
      )?.perks,
    ).toEqual(['blades-25-a']);
    const stopState = reload(firstDay.state);
    const stopCommand = command(
      stopState,
      'StopLearning',
      { taskId: 'retraining', reason: 'PREREQUISITES' },
      'retraining-stop',
      'SYSTEM',
      tick(1010),
    ) as Stop;
    const stopContext: LearningQuoteContext = {
      ...context(stopState, stopCommand, [access(stopState, tick(1010))]),
      learningFacts: fixture.ctx.learningFacts,
    };
    const stopped = prepareLearningComposition(
      stopState,
      firstDay.tasks,
      firstDay.studyAccess,
      null,
      stopContext,
      [],
      {
        kind: 'STOP',
        taskId: 'retraining',
        effectId: 'retraining-stop-effect',
        command: stopCommand,
        intervals: [],
        manifest: {
          companyId: stopState.lifecycle.companyId,
          worldId: stopState.lifecycle.worldId,
          commandId: stopCommand.commandId,
          taskId: 'retraining',
          ownerIntervalId: firstDay.tasks.tasks[0]!.start.quote.sourceId,
          targetTick: '1010',
          evidenceIds: ['retraining'],
        },
      },
    );
    expect(stopped.tasks.tasks[0]?.stop).toEqual(stopCommand);
    expect(
      stopped.state.lifecycle.characters.find((entry) => entry.identity.characterId === 'leader')
        ?.perks,
    ).toEqual(['blades-25-a']);
    const finish = advance(
      fixture,
      firstDay.studyAccess,
      firstDay.state,
      firstDay.tasks,
      1010,
      3010,
    );
    expect(finish.appliedElapsedTicks).toBe('2000');
    expect(finish.tasks.tasks[0]?.terminal?.kind).toBe('GOAL_REACHED');
    expect(finish.state.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe(
      cash(5_000_000),
    );
    expect(
      finish.state.finance.wallets.find((wallet) => wallet.walletId === 'wallet-provider')?.cashQ,
    ).toBe(cash(15_000_000));
    expect(
      finish.state.lifecycle.characters.find((entry) => entry.identity.characterId === 'leader')
        ?.perks,
    ).toEqual(['blades-25-b']);
    expect(
      finish.state.lifecycle.knowledge.characters.find(
        (entry) => entry.identity.characterId === 'leader',
      )?.perks,
    ).toEqual(['blades-25-b']);
    expect(BigInt(finish.state.lifecycle.knowledge.revision)).toBe(
      BigInt(firstDay.state.lifecycle.knowledge.revision) + 1n,
    );

    const shortFixture = retrainingFixture();
    Object.assign(
      shortFixture.root.finance.wallets.find((wallet) => wallet.walletId === 'purse')!,
      { cashQ: cash(5_000_000) },
    );
    const shortStart = prepareLearningComposition(
      shortFixture.root,
      empty().state,
      empty().studyAccess,
      null,
      shortFixture.ctx,
      [],
      {
        kind: 'START',
        taskId: 'retraining',
        effectId: 'short-retraining-start-effect',
        admission: shortFixture.request,
      },
    );
    expect(shortStart.tasks.tasks[0]?.start.quote).toMatchObject({
      maxTicks: '3000',
      funding: { authorizedBudgetQ: cash(15_000_000) },
    });
    const shortfall = advance(
      shortFixture,
      shortStart.studyAccess,
      shortStart.state,
      shortStart.tasks,
      10,
      3010,
    );
    expect(shortfall.appliedElapsedTicks).toBe('1000');
    expect(shortfall.tasks.tasks[0]?.terminal?.kind).toBe('FUNDING_SHORTFALL');
    expect(
      shortfall.state.lifecycle.characters.find((entry) => entry.identity.characterId === 'leader')
        ?.perks,
    ).toEqual(['blades-25-a']);
  });

  it.each([false, true])('composes real owners without settlement (%s)', (course) => {
    const f = setup(course);
    const before = reload(f);
    const result = run(f);
    expect(result.task.start.quote).toEqual(quoteLearningTask(f.root, f.request.command, f.ctx));
    expect(result.task.start.quote.maxTicks).toBe(course ? '1750' : '900');
    expect(result.task.completedTicks).toBe('0');
    expect(result.replayed).toBe(false);
    expect(f).toEqual(before);
    expect(result.studyAccess.intervals).toEqual(
      course
        ? []
        : [
            {
              ...f.request.study,
              characterId: 'leader',
              workId: 'wound-care-basics',
              sectionId: 'wound-care-basics-1',
              containerId: 'fixture-supply',
              fromTick: '10',
              toTick: '910',
            },
          ],
    );
    if (course)
      expect(result.task.start.quote.funding).toMatchObject({
        walletId: 'purse',
        providerWalletId: 'wallet-provider',
        authorizedBudgetQ: '7000000',
      });
  });

  it('binds optional sections and exact large ticks', () => {
    const f = setup(false, 'leader', 'book-1', 'large', '9007199254740993');
    Object.assign(learningCommand(f).payload.goal, { sectionId: 'wound-care-basics-1' });
    expect(run(f).studyAccess.intervals[0]).toMatchObject({
      fromTick: '9007199254740993',
      toTick: '9007199254741893',
    });
  });

  it('rejects mismatched book bindings and unavailable copies without mutation', () => {
    const changes: ((f: Fixture) => void)[] = [
      (f) => Object.assign(learningCommand(f).payload.goal, { workId: 'small-unit-service' }),
      (f) => Object.assign(learningCommand(f).payload.goal, { sectionId: 'other' }),
      (f) => Object.assign(f.ctx.learningFacts[0]!, { sectionId: 'other' }),
      (f) => Object.assign(f.ctx.learningFacts[0]!, { learnerId: 'worker-0' }),
      (f) => Object.assign(f.ctx.learningFacts[0]!, { expiresAt: '10' }),
      (f) => Object.assign(f.ctx.learningFacts[0]!, { revision: '1' }),
      (f) => Object.assign(f.request.study!, { accessEvidenceId: 'missing' }),
      (f) => Object.assign(f.ctx.physicalFacts![0]!, { operatorId: 'worker-0' }),
      (f) => Object.assign(f.ctx.physicalFacts![0]!, { itemIds: ['book-2'] }),
      (f) => Object.assign(f.ctx.physicalFacts![0]!, { purpose: 'TRANSFER' }),
      (f) => Object.assign(f.request.command, { campaignTick: tick(11) }),
      (f) => Reflect.deleteProperty(f.request, 'study'),
      (f) => {
        Object.assign(f.request.command.payload, { resourceIds: ['book-2'] });
        Object.assign(f.ctx.learningFacts[0]!, { resourceIds: ['book-2'] });
      },
      (f) =>
        Object.assign(f.root.physical.containers[0]!, {
          closed: { sourceId: 'lock', causeId: 'lock', atTick: tick(10) },
        }),
    ];
    for (const change of changes) {
      const f = setup();
      change(f);
      rejects(f);
    }
  });

  it('rejects actual course provider and funding failures', () => {
    for (const patch of [
      { providerId: 'missing' },
      { mentorId: 'missing' },
      { providerWalletId: 'wallet-leader' },
      { moneyAccessEvidenceId: 'missing' },
      { maxTicks: '0' },
    ]) {
      const f = setup(true);
      Object.assign(f.ctx.learningFacts[0]!, patch);
      rejects(f);
    }
    const poor = setup(true);
    Object.assign(poor.root.finance.wallets[0]!, { cashQ: cash(0) });
    rejects(poor, empty(), 'UNPAID_OBLIGATIONS');
    const spurious = setup(true);
    Object.assign(spurious.request, { study: setup().request.study });
    rejects(spurious, empty(), 'INVALID_ARGUMENT');
  });

  it('keeps copies independent and discards candidates after final C04a rejection', () => {
    const first = run(setup());
    rejects(setup(false, 'worker-0', 'book-1', 'other'), first, 'INCOMPATIBLE_ACTIVITY');
    rejects(setup(false, 'leader', 'book-2', 'second'), first, 'INCOMPATIBLE_ACTIVITY');
    const accepted = run(setup(false, 'worker-0', 'book-2', 'second'), first);
    expect(accepted.state.tasks).toHaveLength(2);
    expect(accepted.studyAccess.intervals.map((entry) => entry.itemId)).toEqual([
      'book-1',
      'book-2',
    ]);
    expect(first.studyAccess.intervals).toHaveLength(1);
  });

  it.each([false, true])('replays frozen starts after progress and reload (%s)', (course) => {
    const f = setup(course);
    const first = run(f);
    const owners = reload(first);
    Object.assign(owners.state.tasks[0]!, {
      completedTicks: first.task.start.quote.maxTicks,
      processedThroughTick: String(
        BigInt(first.task.start.command.campaignTick) + BigInt(first.task.start.quote.maxTicks),
      ),
    });
    Object.assign(f.ctx, {
      learningFacts: [],
      financeFacts: [],
      physicalFacts: [],
      atTick: tick(9000),
    });
    Object.assign(f.root.finance.wallets[0]!, { cashQ: cash(0) });
    Object.assign(f.root.lifecycle.characters[0]!, { perks: [] });
    const result = run(f, owners);
    expect(result.replayed).toBe(true);
    expect(result.task).toEqual(owners.state.tasks[0]);
    expect(result.state.tasks).toHaveLength(1);
    expect(result.studyAccess).toEqual(first.studyAccess);
    expect(Object.isFrozen(result.task.start.quote.coefficients.task)).toBe(true);
    Object.assign(learningCommand(f).payload.goal, { maxTicks: '99999' });
    (learningCommand(f).payload.resourceIds as string[])[0] = 'rewritten';
    if (f.request.study) Object.assign(f.request.study, { itemId: 'rewritten' });
    expect(result.task.start).toEqual(first.task.start);
    expect(result.studyAccess).toEqual(first.studyAccess);
  });

  it('conflicts on changed retries and missing or inconsistent stored copy bindings', () => {
    const first = run(setup());
    const changes: ((f: Fixture) => void)[] = [
      (f) => Object.assign(f.request, { taskId: 'other' }),
      (f) => Object.assign(f.request.command, { commandId: 'other' }),
      (f) => Object.assign(f.request.command, { sourceEventId: 'other' }),
      (f) => Object.assign(f.request.command, { campaignTick: tick(11) }),
      (f) => Object.assign(learningCommand(f).payload.goal, { maxTicks: '999' }),
      (f) => Object.assign(f.request.command.payload, { maxBudgetQ: '1' }),
      (f) => Object.assign(f.request.study!, { intervalId: 'other' }),
      (f) => Object.assign(f.request.study!, { itemId: 'book-2' }),
      (f) => Object.assign(f.request.study!, { accessEvidenceId: 'other' }),
      (f) => Reflect.deleteProperty(f.request, 'study'),
    ];
    for (const change of changes) {
      const f = setup();
      change(f);
      rejects(f, first, 'IDEMPOTENCY_CONFLICT');
    }
    rejects(setup(), { ...first, studyAccess: createStudyAccessState() }, 'IDEMPOTENCY_CONFLICT');
    const corrupted = reload(first);
    Object.assign(corrupted.studyAccess.intervals[0]!, { toTick: '911' });
    rejects(setup(), corrupted, 'IDEMPOTENCY_CONFLICT');
  });

  it('does not renew, release intervals, or activate public commands', () => {
    const f = setup();
    const first = run(f);
    const stop = command(f.root, 'StopLearning', { taskId: 'first', reason: 'PLAYER' }, 'stop');
    const terminal = { ...stop, campaignTick: tick(20) } as CommandOf<'StopLearning'>;
    const closed = stopLearningTask(first.state, terminal);
    const owners = { state: closed.state, studyAccess: first.studyAccess };
    expect(run(f, reload(owners))).toMatchObject({ ...owners, task: closed.task, replayed: true });
    for (const cmd of [f.request.command, stop])
      expect(prepareCompanyEconomy(f.root, cmd, f.ctx)).toMatchObject({
        kind: 'REJECTED',
        error: 'UNSUPPORTED_ACTION',
      });
  });
});

describe('C05 prerequisite — retained calculation inputs, not elapsed settlement', () => {
  it('separates finite book content from accelerated elapsed duration', () => {
    const fast = run(setup()).task;
    const slower = setup();
    Object.assign(slower.root.lifecycle.characters[0]!, { perks: [] });
    const slow = run(slower).task;
    const inputs = readLearningTaskInputs(fast);
    const work = COMPANY_CATALOGUE.works.find((entry) => entry.id === 'wound-care-basics')!;
    expect(inputs).toMatchObject({
      kind: 'BOOK',
      workId: work.id,
      workVersion: work.version,
      sectionId: work.sectionId,
      skillId: work.skillId,
      durationTicks: work.durationTicks,
      finiteMilliXp: xpToMilliXp(work.finiteXp),
      factId: work.factId,
    });
    expect(readLearningTaskInputs(slow)).toEqual(inputs);
    expect(BigInt(fast.start.quote.maxTicks)).toBeLessThan(BigInt(slow.start.quote.maxTicks));
  });

  it('feeds retained course coefficients to A01 across fractional credit and JSON reload', () => {
    const f = setup(true);
    const learner = f.root.lifecycle.characters[0]!;
    Object.assign(learner.skills, { medicine: initialSkillProgress(12, 'prior-study') });
    Object.assign(learner.aptitudeBySkill, { medicine: 10103 });
    Object.assign(f.ctx.learningFacts[0]!, { challengeLevel: 13 });
    const first = run(f);
    const inputs = readLearningTaskInputs(first.task);
    if (inputs.kind !== 'COURSE') throw new Error('Expected admitted course');
    expect(inputs).toMatchObject({ levelAtStart: 12, challengeLevel: 13, challengeBps: 10200 });
    const coefficients = {
      aptitudeBps: inputs.aptitudeAtStartBps,
      challengeBps: inputs.challengeBps,
      outcomeBps: inputs.outcomeBps,
    };
    const initial = { milliXp: '0', carry: '0' };
    const whole = creditProgression(initial, inputs.baseMilliXpPerDay, coefficients);
    const part = creditProgression(initial, '1', coefficients);
    expect(part.carry).not.toBe('0');
    const split = creditProgression(
      reload(part),
      (BigInt(inputs.baseMilliXpPerDay) - 1n).toString(),
      coefficients,
    );
    expect(split).toEqual(whole);
    Object.assign(learner, { skills: { medicine: 100 }, aptitudeBySkill: {}, perks: [] });
    Object.assign(f.ctx, { learningFacts: [], atTick: tick(9000) });
    const replay = run(f, reload(first));
    expect(replay.replayed).toBe(true);
    expect(readLearningTaskInputs(replay.task)).toEqual(inputs);
    expect(Object.isFrozen(replay.task.start.inputs)).toBe(true);
    const changed = reload(first.task.start);
    Object.assign(changed.inputs!, { aptitudeAtStartBps: 12000 });
    expect(() => startLearningTask(first.state, changed)).toThrow('IDEMPOTENCY_CONFLICT');
  });

  it.each([false, true])('rejects missing exact skill or aptitude atomically (%s)', (course) => {
    const changes: ((f: Fixture) => void)[] = [
      (f) => Reflect.deleteProperty(f.root.lifecycle.characters[0]!.skills, 'medicine'),
      (f) => Object.assign(f.root.lifecycle.characters[0]!.skills, { medicine: 0 }),
      (f) => Reflect.deleteProperty(f.root.lifecycle.characters[0]!.aptitudeBySkill, 'medicine'),
      (f) => Object.assign(f.root.lifecycle.characters[0]!.aptitudeBySkill, { medicine: 0 }),
    ];
    for (const change of changes) {
      const f = setup(course);
      change(f);
      rejects(f, empty(), 'INVALID_STATE');
    }
  });

  it('requires authoritative course difficulty rather than choosing the learner level', () => {
    for (const challengeLevel of [undefined, -1, 101, 1.5]) {
      const f = setup(true);
      if (challengeLevel === undefined)
        Reflect.deleteProperty(f.ctx.learningFacts[0]!, 'challengeLevel');
      else Object.assign(f.ctx.learningFacts[0]!, { challengeLevel });
      rejects(f, empty(), 'INVALID_SOURCE');
    }
  });

  it.each([false, true])('preserves legacy start/stop without invented inputs (%s)', (course) => {
    const f = setup(course);
    const first = reload(run(f));
    Reflect.deleteProperty(first.state.tasks[0]!.start, 'inputs');
    Object.assign(f.ctx, { learningFacts: [], atTick: tick(9000) });
    const old = run(f, first);
    expect(old.task.start.inputs).toBeUndefined();
    expect(old.task).toEqual(first.state.tasks[0]);
    expect(() => readLearningTaskInputs(old.task)).toThrow('LEARNING_START_INPUTS_REQUIRED');
    const stop = command(f.root, 'StopLearning', { taskId: 'first', reason: 'PLAYER' }, 'old-stop');
    const terminal = { ...stop, campaignTick: tick(20) } as CommandOf<'StopLearning'>;
    const closed = stopLearningTask(old.state, terminal);
    const replay = run(f, { state: reload(closed.state), studyAccess: first.studyAccess });
    expect(replay.task).toEqual(closed.task);
    expect(() => readLearningTaskInputs(replay.task)).toThrow('LEARNING_START_INPUTS_REQUIRED');
  });

  it.each([false, true])('validates and owns retained inputs (%s)', (course) => {
    const first = run(setup(course));
    const patches = [
      { rulesVersion: 'unknown' },
      { aptitudeAtStartBps: 0 },
      course ? { skillId: 'scholarship' } : { workId: 'other-work' },
      course ? { challengeBps: 9999 } : { durationTicks: '0' },
    ];
    for (const patch of patches) {
      const task = reload(first.task);
      Object.assign(task.start.inputs!, patch);
      const before = reload(task);
      expect(() => readLearningTaskInputs(task)).toThrow('INVALID_STATE');
      expect(task).toEqual(before);
    }
    const loaded = reload(first.task);
    const owned = readLearningTaskInputs(loaded);
    Object.assign(loaded.start.inputs!, { aptitudeAtStartBps: 12000 });
    expect(owned).toEqual(first.task.start.inputs);
  });
});
