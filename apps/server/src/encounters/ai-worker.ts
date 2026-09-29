import type { Kysely } from 'kysely';
import type { EncounterCommandResponse } from '@warwrit/protocol';

import type { DatabaseSchema } from '../db/database.js';
import { executeEncounterAiWake, listDueEncounterAiWakes } from './executor.js';

const IDLE_POLL_MS = 250;

export interface EncounterAiWorker {
  stop(): Promise<void>;
}

export interface EncounterAiWorkerOptions {
  readonly onCommitted?: (
    encounterId: string,
    response: EncounterCommandResponse,
  ) => void | Promise<void>;
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
      const wakes = await listDueEncounterAiWakes(database);
      for (const wake of wakes) {
        let response: EncounterCommandResponse | undefined;
        try {
          response = await executeEncounterAiWake(database, wake);
        } catch (error) {
          options.onError?.(error);
          continue;
        }
        if (response?.status === 'accepted') {
          await options.onCommitted?.(wake.encounterId, response);
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
