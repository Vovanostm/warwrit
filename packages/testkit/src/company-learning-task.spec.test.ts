import { describe, expect, it } from 'vitest';
import {
  createLearningTaskState,
  calculateRetrainingProgress,
  evaluatePerkEffects,
  initialSkillProgress,
  readLearningTaskState,
  startLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type { CommandOf, CompanyEconomyState, LearningTaskStart } from '@warwrit/game-core';
import { cash, command, economy, tick } from './company-economy-fixture.js';

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const root = economy([1n], 100n, 10) as Required<CompanyEconomyState>;
function seed(taskId = 'task', commandId = 'start', characterId = 'leader'): LearningTaskStart {
  const payload = {
    characterId,
    methodId: 'book-study',
    goal: { workId: 'wound-care-basics', maxTicks: '10' },
    resourceIds: ['book-1'],
    budgetPoolId: 'local',
    maxBudgetQ: '0',
  };
  return reload({
    taskId,
    command: command(root, 'StartLearning', payload, commandId) as CommandOf<'StartLearning'>,
    quote: {
      sourceId: 'book-source',
      sourceVersion: 'source-v1',
      maxTicks: '10',
      mentorId: null,
      funding: null,
      coefficients: evaluatePerkEffects(root, { kind: 'CHARACTER', characterId, task: 'STUDY' }),
    },
    studyIntervalId: 'study-copy',
  });
}
function stop(
  reason: CommandOf<'StopLearning'>['payload']['reason'] = 'PLAYER',
  actor: 'PLAYER' | 'SYSTEM' = 'PLAYER',
) {
  const payload = { taskId: 'task', reason };
  return command(
    root,
    'StopLearning',
    payload,
    'stop',
    actor,
    tick(20),
  ) as CommandOf<'StopLearning'>;
}
const active = () => startLearningTask(createLearningTaskState(), seed());
function retrainingSeed(
  taskId = 'retrain-task',
  commandId = 'retrain-start',
): LearningTaskStart<CommandOf<'StartRetraining'>> {
  const payload = {
    characterId: 'leader',
    oldPerkId: 'blades-25-a',
    newPerkId: 'blades-25-b',
    mentorEvidenceId: 'guard-mentor',
    budgetPoolId: 'local',
  };
  return reload({
    taskId,
    command: command(root, 'StartRetraining', payload, commandId) as CommandOf<'StartRetraining'>,
    quote: {
      sourceId: 'guard-retraining',
      sourceVersion: 'guard-v1',
      maxTicks: '3000',
      mentorId: 'guard',
      funding: {
        poolId: 'local',
        walletId: 'wallet-local',
        providerWalletId: 'wallet-guard',
        authorizedBudgetQ: cash(15_000_000),
        costQPerDay: { numerator: '5000000', denominator: '1' },
      },
      coefficients: evaluatePerkEffects(root, {
        kind: 'CHARACTER',
        characterId: 'leader',
        task: 'TRAINING',
      }),
    },
    inputs: {
      schemaVersion: 1,
      rulesVersion: 's02-progression-parameters-1',
      kind: 'COURSE',
      skillId: 'blades',
      levelAtStart: 25,
      aptitudeAtStartBps: 10000,
      coursePolicyVersion: 's02-course-effort-1',
      ticksPerDay: '1000',
      baseMilliXpPerDay: '0',
      challengeLevel: 0,
      challengeBps: 10000,
      outcomeBps: 10000,
    },
    retraining: { oldPerkId: 'blades-25-a', newPerkId: 'blades-25-b' },
  });
}

describe('C04a — finite learning task state and lifecycle', () => {
  it('owns nested snapshots and replays after progress and JSON reload', () => {
    const input = seed();
    const first = startLearningTask(createLearningTaskState(), input);
    const saved = reload(first.task.start);
    Object.assign(input.command.payload.goal, { maxTicks: '99' });
    Object.assign(input.quote.coefficients.task.studyDurationBps, { numerator: '2' });
    (input.command.payload.resourceIds as string[])[0] = 'rewritten';
    expect(first.task.start).toEqual(saved);
    expect(Object.isFrozen(first.task.start.quote.coefficients.task)).toBe(true);
    const progressed = {
      ...first.task,
      completedTicks: '3',
      processedThroughTick: String(BigInt(first.task.start.command.campaignTick) + 3n),
    };
    const state = readLearningTaskState(reload({ ...first.state, tasks: [progressed] }));
    expect(startLearningTask(state, seed())).toEqual({ state, task: progressed, replayed: true });
    expect(readLearningTaskState(reload(state))).toEqual(state);
  });

  it('conflicts on reused identities and limits active tasks per learner', () => {
    const { state } = active();
    const before = reload(state);
    const changed = { ...seed(), studyIntervalId: 'changed' };
    const alteredBody = seed();
    Object.assign(alteredBody.command.payload.goal, { maxTicks: '20' });
    for (const input of [seed('other'), seed('task', 'other'), changed, alteredBody])
      expect(() => startLearningTask(state, input)).toThrow('IDEMPOTENCY_CONFLICT');
    expect(() => startLearningTask(state, seed('other', 'other'))).toThrow('INCOMPATIBLE_ACTIVITY');
    const second = startLearningTask(state, seed('other', 'other', 'worker-0'));
    expect(second.state.tasks).toHaveLength(2);
    expect(state).toEqual(before);
  });

  it.each(['PLAYER', 'GOAL', 'FUNDS', 'PREREQUISITES'] as const)('closes with %s', (reason) => {
    const first = active();
    const progressed = {
      ...first.task,
      completedTicks: '7',
      processedThroughTick: String(BigInt(first.task.start.command.campaignTick) + 7n),
    };
    const state = readLearningTaskState({ ...first.state, tasks: [progressed] });
    const cmd = stop(reason, reason === 'PLAYER' ? 'PLAYER' : 'SYSTEM');
    const closed = stopLearningTask(state, cmd);
    expect(closed.task.completedTicks).toBe('7');
    expect(closed.task.stop).toEqual(cmd);
    expect(closed.replayed).toBe(false);
    Object.assign(cmd.actorRef, { id: 'rewritten' });
    const retry = stopLearningTask(readLearningTaskState(reload(closed.state)), closed.task.stop!);
    expect(retry).toEqual({ ...closed, replayed: true });
    expect(retry.state.tasks).toHaveLength(1);
  });

  it('rejects unauthorized or premature stops without mutation', () => {
    const { state } = active();
    const before = reload(state);
    for (const invalid of [stop('FUNDS', 'PLAYER'), stop('PLAYER', 'SYSTEM')])
      expect(() => stopLearningTask(state, invalid)).toThrow('AUTHORIZATION');
    const premature = { ...stop(), campaignTick: tick(9) };
    expect(() => stopLearningTask(state, premature)).toThrow('INVALID_TIME');
    const reused = { ...stop(), commandId: 'start' };
    expect(() => stopLearningTask(state, reused)).toThrow('IDEMPOTENCY_CONFLICT');
    expect(() => stopLearningTask(createLearningTaskState(), stop())).toThrow('INVALID_ARGUMENT');
    expect(state).toEqual(before);
  });

  it('rejects changed stop retries and replacement terminal history', () => {
    const closed = stopLearningTask(active().state, stop('FUNDS', 'SYSTEM'));
    const cmd = closed.task.stop!;
    const before = reload(closed.state);
    for (const change of [
      { campaignTick: tick(21) },
      { actorRef: { kind: 'SYSTEM' as const, id: 'other' } },
      { sourceEventId: 'other' },
      { worldId: 'other' },
      { payload: { taskId: 'task', reason: 'GOAL' as const } },
      { payload: { taskId: 'other', reason: 'FUNDS' as const } },
    ]) {
      const changed = reload(cmd);
      Object.assign(changed, change);
      expect(() => stopLearningTask(closed.state, changed)).toThrow('IDEMPOTENCY_CONFLICT');
    }
    const replacement = { ...cmd, commandId: 'other' };
    expect(() => stopLearningTask(closed.state, replacement)).toThrow('INCOMPATIBLE_ACTIVITY');
    expect(() => startLearningTask(closed.state, seed('other', 'stop'))).toThrow(
      'IDEMPOTENCY_CONFLICT',
    );
    expect(closed.state).toEqual(before);
  });

  it('requires an explicit later start and still replays the old terminal task', () => {
    const closed = stopLearningTask(active().state, stop());
    expect(closed.state.tasks).toHaveLength(1);
    const input = seed('later', 'later-start');
    const cmd = { ...input.command, campaignTick: tick(20) };
    const later = startLearningTask(closed.state, { ...input, command: cmd });
    expect(later.state.tasks.map((task) => task.start.taskId)).toEqual(['task', 'later']);
    const replay = startLearningTask(later.state, seed());
    expect(replay).toEqual({ state: later.state, task: closed.task, replayed: true });
  });

  it('rejects malformed, over-budget, overlapping, or contradictory saved tasks', () => {
    const { state, task } = active();
    for (const patch of [
      { schemaVersion: 2 },
      { completedTicks: '11' },
      { completedTicks: '-1' },
      { start: { ...task.start, quote: {} } },
      { start: { ...task.start, quote: { ...task.start.quote, maxTicks: '0' } } },
      { start: { ...task.start, quote: { ...task.start.quote, maxTicks: '11' } } },
      { stop: stop('FUNDS', 'PLAYER') },
      { stop: { ...stop(), campaignTick: tick(9) } },
      { stop: { ...stop(), payload: { taskId: 'other', reason: 'PLAYER' } } },
      { stop: { ...stop(), commandId: 'start' } },
    ])
      expect(() => readLearningTaskState({ ...state, tasks: [{ ...task, ...patch }] })).toThrow(
        'INVALID_STATE',
      );
    expect(() => readLearningTaskState({ schemaVersion: 2, tasks: [] })).toThrow('INVALID_STATE');
    expect(() => readLearningTaskState({ ...state, tasks: [task, task] })).toThrow('INVALID_STATE');
    const another = { ...task, start: seed('other', 'other') };
    expect(() => readLearningTaskState({ ...state, tasks: [task, another] })).toThrow(
      'INVALID_STATE',
    );
  });

  it('retains the original retraining command and preserves its slot pair on stop', () => {
    const input = retrainingSeed();
    const started = startLearningTask(createLearningTaskState(), input);
    expect(started.task.start.command).toEqual(input.command);
    expect(startLearningTask(started.state, retrainingSeed())).toEqual({
      ...started,
      replayed: true,
    });
    const stopped = stopLearningTask(
      started.state,
      command(
        root,
        'StopLearning',
        { taskId: input.taskId, reason: 'PLAYER' },
        'retrain-stop',
        'PLAYER',
        tick(3000),
      ) as CommandOf<'StopLearning'>,
    );
    expect(stopped.task.start.retraining).toEqual({
      oldPerkId: 'blades-25-a',
      newPerkId: 'blades-25-b',
    });
    expect(stopped.task.start.command).toEqual(input.command);
  });

  it('uses accepted retraining time without granting skill XP before the perk swap', () => {
    const learner = root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === 'leader',
    )!;
    Object.assign(learner, {
      skills: { ...learner.skills, blades: initialSkillProgress(25, 'retraining-fixture') },
      perks: ['blades-25-a'],
    });
    const task = startLearningTask(createLearningTaskState(), retrainingSeed()).task;
    const result = calculateRetrainingProgress(task, root.lifecycle, '3000');
    expect(result).toMatchObject({
      appliedElapsedTicks: '3000',
      goalReached: true,
      skillId: 'blades',
      nextSkill: initialSkillProgress(25, 'retraining-fixture'),
    });
    expect(learner.perks).toEqual(['blades-25-a']);
  });
});
