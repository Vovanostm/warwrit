import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  createLearningTaskState,
  moneyQ,
  readLearningTaskState,
  startLearningTask,
  stopLearningTask,
} from '@warwrit/game-core';
import type {
  CommandOf,
  LearningTaskQuote,
  StudyAccessInterval,
} from '@warwrit/game-core';
import { command, economy, tick } from './company-economy-fixture.js';

const workId = 'wound-care-basics';
const sectionId = 'wound-care-basics-1';
const one = { numerator: '10000', denominator: '1' } as const;

function quote(
  characterId: string,
  maxTicks: string,
  taskScope: 'STUDY' | 'TRAINING',
): LearningTaskQuote {
  const funded = taskScope === 'TRAINING';
  return {
    sourceId: funded ? 'course-source' : 'book-source',
    sourceVersion: funded ? 'course-v1' : 'book-v1',
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
      holderId: characterId,
      taskScope,
      contributingPerkIds: [],
      weapon: null,
      additive: { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 },
      task: {
        careRecoveryBps: one,
        careCostBps: one,
        studyDurationBps: one,
        trainingCostBps: one,
        trainingDurationBps: one,
      },
    },
  };
}

function startBook(id = 'start-book', at = 10) {
  const root = economy([1n], 100n, at);
  return command(
    root,
    'StartLearning',
    {
      characterId: 'leader',
      methodId: 'book-study',
      goal: { workId, sectionId, maxTicks: '10' },
      resourceIds: ['book-1'],
      budgetPoolId: 'local',
      maxBudgetQ: '0',
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

function startCourse(id = 'start-course', at = 10) {
  const root = economy([1n], 100n, at);
  return command(
    root,
    'StartLearning',
    {
      characterId: 'leader',
      methodId: 'funded-practice',
      goal: { skillId: 'medicine', maxTicks: '20' },
      resourceIds: ['course-kit'],
      budgetPoolId: 'local',
      maxBudgetQ: '5000000',
    },
    id,
    'PLAYER',
    tick(at),
  ) as CommandOf<'StartLearning'>;
}

function stop(
  taskId: string,
  reason: 'PLAYER' | 'GOAL' | 'FUNDS' | 'PREREQUISITES',
  actor: 'PLAYER' | 'SYSTEM',
  id: string,
  at: number,
) {
  const root = economy([1n], 100n, at);
  return command(
    root,
    'StopLearning',
    { taskId, reason },
    id,
    actor,
    tick(at),
  ) as CommandOf<'StopLearning'>;
}

const reload = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('C04 — internal finite learning task lifecycle', () => {
  it('starts self-study only from the matching C02 copy interval and replays once', () => {
    const command = startBook();
    const initial = createLearningTaskState();
    const first = startLearningTask(initial, {
      taskId: 'task-book',
      command,
      quote: quote('leader', '10', 'STUDY'),
      studyInterval: interval(),
    });

    expect(first.task).toMatchObject({
      taskId: 'task-book',
      startCommandId: 'start-book',
      characterId: 'leader',
      methodId: 'book-study',
      studyIntervalId: 'study-copy',
      startedAt: '10',
      completedTicks: '0',
    });
    expect(readLearningTaskState(reload(first.state))).toEqual(first.state);
    expect(
      startLearningTask(first.state, {
        taskId: 'task-book',
        command,
        quote: quote('leader', '10', 'STUDY'),
        studyInterval: interval(),
      }).replayed,
    ).toBe(true);
  });

  it('rejects missing/stale copy binding and a second concurrent task for one learner', () => {
    const command = startBook();
    expect(() =>
      startLearningTask(createLearningTaskState(), {
        taskId: 'task-missing',
        command,
        quote: quote('leader', '10', 'STUDY'),
      }),
    ).toThrow('CONTACT_OR_ACCESS_REQUIRED');
    expect(() =>
      startLearningTask(createLearningTaskState(), {
        taskId: 'task-stale',
        command,
        quote: quote('leader', '10', 'STUDY'),
        studyInterval: interval({ toTick: '19' }),
      }),
    ).toThrow('INVALID_SOURCE');

    const active = startLearningTask(createLearningTaskState(), {
      taskId: 'task-one',
      command,
      quote: quote('leader', '10', 'STUDY'),
      studyInterval: interval(),
    }).state;
    expect(() =>
      startLearningTask(active, {
        taskId: 'task-two',
        command: startBook('another-start'),
        quote: quote('leader', '10', 'STUDY'),
        studyInterval: interval({ intervalId: 'another-copy-window' }),
      }),
    ).toThrow('INCOMPATIBLE_ACTIVITY');
  });

  it('freezes a funded course quote without a book interval or input aliasing', () => {
    const command = startCourse();
    const mutable = quote('leader', '15', 'TRAINING');
    const result = startLearningTask(createLearningTaskState(), {
      taskId: 'task-course',
      command,
      quote: mutable,
    });
    (mutable.coefficients.task.trainingCostBps as { numerator: string }).numerator = '1';

    expect(result.task).toMatchObject({
      taskId: 'task-course',
      methodId: 'funded-practice',
      quote: {
        maxTicks: '15',
        mentorId: 'provider',
        funding: { authorizedBudgetQ: '5000000' },
        coefficients: { task: { trainingCostBps: { numerator: '10000' } } },
      },
    });
    expect(() =>
      startLearningTask(createLearningTaskState(), {
        taskId: 'bad-course',
        command,
        quote: quote('leader', '15', 'TRAINING'),
        studyInterval: interval(),
      }),
    ).toThrow('INVALID_ARGUMENT');
  });

  it('enforces stop-reason authority, preserves completed work and never auto-renews', () => {
    const started = startLearningTask(createLearningTaskState(), {
      taskId: 'task-course',
      command: startCourse(),
      quote: quote('leader', '15', 'TRAINING'),
    }).state;
    const withWork = readLearningTaskState({
      ...started,
      tasks: [{ ...started.tasks[0]!, completedTicks: '7' }],
    });
    expect(() =>
      stopLearningTask(withWork, stop('task-course', 'FUNDS', 'PLAYER', 'bad-player-stop', 14)),
    ).toThrow('AUTHORIZATION');
    expect(() =>
      stopLearningTask(withWork, stop('task-course', 'PLAYER', 'SYSTEM', 'bad-system-stop', 14)),
    ).toThrow('AUTHORIZATION');

    const stopped = stopLearningTask(
      withWork,
      stop('task-course', 'FUNDS', 'SYSTEM', 'stop-course', 14),
    );
    expect(stopped.task).toMatchObject({
      completedTicks: '7',
      endedAt: '14',
      stopReason: 'FUNDS',
      stopCommandId: 'stop-course',
    });
    expect(stopped.state.tasks).toHaveLength(1);
    expect(
      stopLearningTask(
        stopped.state,
        stop('task-course', 'FUNDS', 'SYSTEM', 'stop-course', 14),
      ).replayed,
    ).toBe(true);
  });

  it('rejects conflicting start/stop identities while allowing explicit later start', () => {
    const firstCommand = startBook();
    const first = startLearningTask(createLearningTaskState(), {
      taskId: 'task-one',
      command: firstCommand,
      quote: quote('leader', '10', 'STUDY'),
      studyInterval: interval(),
    });
    expect(() =>
      startLearningTask(first.state, {
        taskId: 'different-task-id',
        command: firstCommand,
        quote: quote('leader', '10', 'STUDY'),
        studyInterval: interval(),
      }),
    ).toThrow('IDEMPOTENCY_CONFLICT');

    const stopped = stopLearningTask(
      first.state,
      stop('task-one', 'PLAYER', 'PLAYER', 'stop-one', 15),
    ).state;
    expect(() =>
      stopLearningTask(stopped, stop('task-one', 'GOAL', 'SYSTEM', 'other-stop', 15)),
    ).toThrow('INCOMPATIBLE_ACTIVITY');

    const later = startLearningTask(stopped, {
      taskId: 'task-later',
      command: startBook('start-later', 20),
      quote: quote('leader', '10', 'STUDY'),
      studyInterval: interval({ intervalId: 'later-window', fromTick: '20', toTick: '30' }),
    });
    expect(later.state.tasks).toHaveLength(2);
  });
});
