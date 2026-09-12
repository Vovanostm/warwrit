import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  createLearningTaskState,
  moneyQ,
  readLearningTaskState,
  startLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type { CommandOf, LearningTaskQuote, StudyAccessInterval } from '@warwrit/game-core';
import { command, economy, tick } from './company-economy-fixture.js';

const workId = 'wound-care-basics';
const sectionId = 'wound-care-basics-1';
const bps = { numerator: '10000', denominator: '1' } as const;

function quote(scope: 'STUDY' | 'TRAINING', maxTicks = '10'): LearningTaskQuote {
  const funded = scope === 'TRAINING';
  return {
    sourceId: funded ? 'course-source' : 'book-source',
    sourceVersion: 'source-v1',
    maxTicks,
    mentorId: funded ? 'provider' : null,
    funding: funded
      ? {
          poolId: 'local',
          walletId: 'purse',
          providerWalletId: 'wallet-provider',
          authorizedBudgetQ: moneyQ('5000000'),
          costQPerDay: { numerator: '5000000', denominator: '1' },
        }
      : null,
    coefficients: {
      schemaVersion: 1,
      kind: 'CHARACTER',
      catalogueVersion: COMPANY_CATALOGUE.version,
      rulesetId: COMPANY_CATALOGUE.rulesetId,
      holderId: 'leader',
      taskScope: scope,
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
    },
  };
}

function start(scope: 'STUDY' | 'TRAINING', id = `start-${scope}`, at = 10) {
  const book = scope === 'STUDY';
  const root = economy([1n], 100n, at);
  return command(
    root,
    'StartLearning',
    {
      characterId: 'leader',
      methodId: book ? 'book-study' : 'funded-practice',
      goal: book
        ? { workId, sectionId, maxTicks: '10' }
        : { skillId: 'medicine', maxTicks: '20' },
      resourceIds: [book ? 'book-1' : 'course-kit'],
      budgetPoolId: 'local',
      maxBudgetQ: book ? '0' : '5000000',
    },
    id,
    'PLAYER',
    tick(at),
  ) as CommandOf<'StartLearning'>;
}

function interval(patch: Partial<StudyAccessInterval> = {}): StudyAccessInterval {
  return {
    intervalId: 'study-copy',
    characterId: 'leader',
    workId,
    sectionId,
    itemId: 'book-1',
    containerId: 'books',
    accessEvidenceId: 'study-access',
    fromTick: '10',
    toTick: '20',
    ...patch,
  };
}

function stop(reason: 'PLAYER' | 'GOAL' | 'FUNDS' | 'PREREQUISITES', actor: 'PLAYER' | 'SYSTEM', id = 'stop', at = 14) {
  const root = economy([1n], 100n, at);
  return command(root, 'StopLearning', { taskId: 'task', reason }, id, actor, tick(at)) as CommandOf<'StopLearning'>;
}

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('C04 — internal finite learning task lifecycle', () => {
  it('binds self-study to its exact C02 interval and replays the same start once', () => {
    const cmd = start('STUDY');
    const first = startLearningTask(createLearningTaskState(), {
      taskId: 'task',
      command: cmd,
      quote: quote('STUDY'),
      studyInterval: interval(),
    });
    expect(first.task).toMatchObject({
      taskId: 'task',
      studyIntervalId: 'study-copy',
      startedAt: '10',
      completedTicks: '0',
    });
    expect(readLearningTaskState(reload(first.state))).toEqual(first.state);
    expect(
      startLearningTask(first.state, {
        taskId: 'task',
        command: cmd,
        quote: quote('STUDY'),
        studyInterval: interval(),
      }).replayed,
    ).toBe(true);
    expect(() =>
      startLearningTask(createLearningTaskState(), {
        taskId: 'missing',
        command: cmd,
        quote: quote('STUDY'),
      }),
    ).toThrow('CONTACT_OR_ACCESS_REQUIRED');
    expect(() =>
      startLearningTask(createLearningTaskState(), {
        taskId: 'stale',
        command: cmd,
        quote: quote('STUDY'),
        studyInterval: interval({ toTick: '19' }),
      }),
    ).toThrow('INVALID_SOURCE');
  });

  it('freezes course quote input and rejects concurrent/conflicting starts', () => {
    const mutable = quote('TRAINING', '15');
    const first = startLearningTask(createLearningTaskState(), {
      taskId: 'task',
      command: start('TRAINING'),
      quote: mutable,
    });
    (mutable.coefficients.task.trainingCostBps as { numerator: string }).numerator = '1';
    expect(first.task.quote.coefficients.task.trainingCostBps.numerator).toBe('10000');
    expect(first.task.quote.funding?.authorizedBudgetQ).toBe('5000000');
    expect(() =>
      startLearningTask(first.state, {
        taskId: 'task-2',
        command: start('TRAINING', 'start-other'),
        quote: quote('TRAINING', '15'),
      }),
    ).toThrow('INCOMPATIBLE_ACTIVITY');
    expect(() =>
      startLearningTask(first.state, {
        taskId: 'different-id',
        command: start('TRAINING'),
        quote: quote('TRAINING', '15'),
      }),
    ).toThrow('IDEMPOTENCY_CONFLICT');
  });

  it('enforces stop authority while preserving completed work and replaying once', () => {
    const started = startLearningTask(createLearningTaskState(), {
      taskId: 'task',
      command: start('TRAINING'),
      quote: quote('TRAINING', '15'),
    }).state;
    const withWork = readLearningTaskState({
      ...started,
      tasks: [{ ...started.tasks[0]!, completedTicks: '7' }],
    });
    for (const invalid of [stop('FUNDS', 'PLAYER'), stop('PLAYER', 'SYSTEM')])
      expect(() => stopLearningTask(withWork, invalid)).toThrow('AUTHORIZATION');

    const stopped = stopLearningTask(withWork, stop('FUNDS', 'SYSTEM'));
    expect(stopped.task).toMatchObject({ completedTicks: '7', endedAt: '14', stopReason: 'FUNDS' });
    expect(stopped.state.tasks).toHaveLength(1);
    expect(stopLearningTask(stopped.state, stop('FUNDS', 'SYSTEM')).replayed).toBe(true);
    expect(() => stopLearningTask(stopped.state, stop('GOAL', 'SYSTEM', 'other-stop'))).toThrow(
      'INCOMPATIBLE_ACTIVITY',
    );
  });

  it('never auto-renews; a later task exists only after an explicit new start', () => {
    const first = startLearningTask(createLearningTaskState(), {
      taskId: 'task',
      command: start('STUDY'),
      quote: quote('STUDY'),
      studyInterval: interval(),
    });
    const stopped = stopLearningTask(first.state, stop('PLAYER', 'PLAYER', 'stop-player', 15));
    expect(stopped.state.tasks).toHaveLength(1);

    const later = startLearningTask(stopped.state, {
      taskId: 'later-task',
      command: start('STUDY', 'later-start', 20),
      quote: quote('STUDY'),
      studyInterval: interval({ intervalId: 'later-copy', fromTick: '20', toTick: '30' }),
    });
    expect(later.state.tasks.map((task) => task.taskId)).toEqual(['task', 'later-task']);
  });
});
