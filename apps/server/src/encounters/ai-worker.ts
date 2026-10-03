import type { Kysely } from 'kysely';
import type { EncounterCommandResponse } from '@warwrit/protocol';

import type { DatabaseSchema } from '../db/database.js';
import { applyPendingFirstHuntTerminalEffects } from './effects.js';
import {
  executeEncounterAiWake,
  executeEncounterTimeout,
  listDueEncounterAiWakes,
  listDueEncounterTimeouts,
} from './executor.js';

const IDLE_POLL_MS = 250;

export interface EncounterAiWorker {
  stop(): Promise<void>;
}

export interface EncounterAiWorkerOptions {
  readonly onCommitted?: (
    encounterId: string,
    response: EncounterCommandResponse,
  ) => void | Promise<void>;
  readonly onTerminalEffects?: (encounterId: string) => void | Promise<void>;
  readonly onError?: (error: unknown) => void;
}

export function startEncounterAiWorker(
  database: Kysely<DatabaseSchema>,
  options: EncounterAiWorkerOptions = {},
): EncounterAiWorker {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let active: Promise<void> | undefined;

  function schedule(delay: number): void {
    if (stopped || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      active = runOne().finally(() => {
        active = undefined;
      });
    }, delay);
  }

  async function runOne(): Promise<void> {
    if (stopped) return;
    const nextDelay = IDLE_POLL_MS;
    try {
      try {
        const terminalEffects = await applyPendingFirstHuntTerminalEffects(database);
        for (const encounterId of terminalEffects) {
          await options.onTerminalEffects?.(encounterId);
        }
      } catch (error) {
        options.onError?.(error);
      }
      const [timeouts, wakes] = await Promise.all([
        listDueEncounterTimeouts(database),
        listDueEncounterAiWakes(database),
      ]);
      const due = [
        ...timeouts.map((timeout) => ({ kind: 'timeout' as const, dueAt: timeout.dueAt, timeout })),
        ...wakes.map((wake) => ({ kind: 'ai' as const, dueAt: wake.dueAt, wake })),
      ].toSorted(
        (left, right) =>
          left.dueAt.getTime() - right.dueAt.getTime() ||
          (left.kind === right.kind ? 0 : left.kind === 'timeout' ? -1 : 1),
      );
      for (const job of due) {
        let response: EncounterCommandResponse | undefined;
        try {
          response =
            job.kind === 'timeout'
              ? await executeEncounterTimeout(database, job.timeout)
              : await executeEncounterAiWake(database, job.wake);
        } catch (error) {
          options.onError?.(error);
          continue;
        }
        if (response?.status === 'accepted') {
          const encounterId =
            job.kind === 'timeout' ? job.timeout.encounterId : job.wake.encounterId;
          await options.onCommitted?.(encounterId, response);
          break;
        }
      }
    } catch (error) {
      options.onError?.(error);
    }
    schedule(nextDelay);
  }

  schedule(0);
  return {
    async stop(): Promise<void> {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      await active;
    },
  };
}
