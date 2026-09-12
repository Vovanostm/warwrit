import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  createLearningTaskState,
  moneyQ,
  readLearningTaskState,
  startLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type { CommandOf, LearningTaskQuote, LearningTaskStart } from '@warwrit/game-core';
import { command, economy, tick } from './company-economy-fixture.js';

const bps = { numerator: '10000', denominator: '1' } as const;
const coefficients = {
  schemaVersion: 1 as const,
  kind: 'CHARACTER' as const,
  catalogueVersion: COMPANY_CATALOGUE.version,
  rulesetId: COMPANY_CATALOGUE.rulesetId,
  holderId: 'leader',
  taskScope: 'STUDY' as const,
  contributingPerkIds: [],
  weapon: null,
  additive: { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 },
  task: {
    careRecoveryBps: bps,
    careCostBps: bps,
    studyDurationBps: bps,
    trainingCostBps: bps,
    trainingDurationBps: bps,
  },
};
const quote: LearningTaskQuote = {
  sourceId: 'book-source',
  sourceVersion: 'source-v1',
  maxTicks: '10',
  mentorId: null,
  funding: null,
  coefficients,
};

function seed(patch: Partial<LearningTaskStart> = {}): LearningTaskStart {
  return {
    taskId: 'task',
    startCommandId: 'start',
    characterId: 'leader',
    methodId: 'book-study',
    goal: { workId: 'wound-care-basics', sectionId: 'wound-care-basics-1', maxTicks: '10' },
    resourceIds: ['book-1'],
    quote,
    studyIntervalId: 'study-copy',
    startedAt: '10',
    ...patch,
  };
}

function stop(
  reason: 'PLAYER' | 'GOAL' | 'FUNDS' | 'PREREQUISITES',
  actor: 'PLAYER' | 'SYSTEM',
  id = 'stop',
  at = 14,
) {
  const root = economy([1n], 100n, at);
  return command(
    root,
    'StopLearning',
    { taskId: 'task', reason },
    id,
    actor,
    tick(at),
  ) as CommandOf<'StopLearning'>;
}

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('C04a — finite learning task state and lifecycle', () => {
  it('owns, reloads and replays the same frozen start snapshot once', () => {
    const start = seed();
    const first = startLearningTask(createLearningTaskState(), start);
    expect(first.task).toMatchObject({
      taskId: 'task',
      startCommandId: 'start',
      studyIntervalId: 'study-copy',
      startedAt: '10',
      completedTicks: '0',
    });
    expect(readLearningTaskState(reload(first.state))).toEqual(first.state);
    expect(startLearningTask(first.state, seed()).replayed).toBe(true);
    expect(() => startLearningTask(first.state, seed({ taskId: 'other' }))).toThrow(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('permits only one active task per learner', () => {
    const active = startLearningTask(createLearningTaskState(), seed()).state;
    expect(() =>
      startLearningTask(active, seed({ taskId: 'other', startCommandId: 'other-start' })),
    ).toThrow('INCOMPATIBLE_ACTIVITY');
  });

  it('enforces stop authority, preserves completed work and replays one stop', () => {
    const started = startLearningTask(createLearningTaskState(), seed()).state;
    const withWork = readLearningTaskState({
      ...started,
      tasks: [{ ...started.tasks[0]!, completedTicks: '7' }],
    });
    for (const invalid of [stop('FUNDS', 'PLAYER'), stop('PLAYER', 'SYSTEM')])
      expect(() => stopLearningTask(withWork, invalid)).toThrow('AUTHORIZATION');

    const stopped = stopLearningTask(withWork, stop('FUNDS', 'SYSTEM'));
    expect(stopped.task).toMatchObject({
      completedTicks: '7',
      endedAt: '14',
      stopReason: 'FUNDS',
      stopCommandId: 'stop',
    });
    expect(stopLearningTask(stopped.state, stop('FUNDS', 'SYSTEM')).replayed).toBe(true);
    expect(() => stopLearningTask(stopped.state, stop('GOAL', 'SYSTEM', 'other-stop'))).toThrow(
      'INCOMPATIBLE_ACTIVITY',
    );
  });

  it('does not auto-renew; a later task requires an explicit new start', () => {
    const active = startLearningTask(createLearningTaskState(), seed()).state;
    const stopped = stopLearningTask(active, stop('PLAYER', 'PLAYER', 'player-stop', 15)).state;
    expect(stopped.tasks).toHaveLength(1);

    const later = startLearningTask(
      stopped,
      seed({ taskId: 'later', startCommandId: 'later-start', startedAt: '20' }),
    );
    expect(later.state.tasks.map((task) => task.taskId)).toEqual(['task', 'later']);
  });

  it('rejects impossible persisted task progress', () => {
    const state = startLearningTask(createLearningTaskState(), seed()).state;
    expect(() =>
      readLearningTaskState({ ...state, tasks: [{ ...state.tasks[0]!, completedTicks: '11' }] }),
    ).toThrow('INVALID_STATE');
  });
});
