import { describe, expect, it } from 'vitest';
import {
  admitLearningTask,
  createLearningTaskState,
  createStudyAccessState,
  prepareCompanyEconomy,
  quoteLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type {
  CommandOf,
  LearningQuoteContext,
  LearningTaskAdmission,
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
    skills: { leadership: 25, scholarship: course ? 60 : 25 },
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
  const cmd = command(root, 'StartLearning', payload, `start-${tag}`) as ReturnType<
    typeof command
  > & CommandOf<'StartLearning'>;
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
    Object.assign(f.request.command.payload.goal, { sectionId: 'wound-care-basics-1' });
    expect(run(f).studyAccess.intervals[0]).toMatchObject({
      fromTick: '9007199254740993',
      toTick: '9007199254741893',
    });
  });

  it('rejects mismatched book bindings and unavailable copies without mutation', () => {
    const changes: ((f: Fixture) => void)[] = [
      (f) => Object.assign(f.request.command.payload.goal, { workId: 'small-unit-service' }),
      (f) => Object.assign(f.request.command.payload.goal, { sectionId: 'other' }),
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
    Object.assign(owners.state.tasks[0]!, { completedTicks: first.task.start.quote.maxTicks });
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
    Object.assign(f.request.command.payload.goal, { maxTicks: '99999' });
    (f.request.command.payload.resourceIds as string[])[0] = 'rewritten';
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
      (f) => Object.assign(f.request.command.payload.goal, { maxTicks: '999' }),
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
