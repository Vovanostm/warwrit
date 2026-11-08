import {
  campaignTickAt,
  createCampaignClock,
  createLightClock,
  lightPhaseAt,
} from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';

export interface WorldClockReading {
  readonly epochMs: string;
  readonly startingTick: string;
  readonly nowMs: string;
  readonly tick: string;
}

/** Shared by Kysely world reads and the encounter receipt adapter. */
export function worldClockAt(
  row: { readonly epoch_ms: string; readonly starting_tick: string; readonly qa_offset_ms: string },
  nowMs: number,
): WorldClockReading {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new TypeError('Invalid trusted server time');
  const simulationNowMs = (BigInt(nowMs) + BigInt(row.qa_offset_ms)).toString();
  const tick = campaignTickAt(
    createCampaignClock(row.epoch_ms, row.starting_tick),
    simulationNowMs,
  );
  return { epochMs: row.epoch_ms, startingTick: row.starting_tick, nowMs: simulationNowMs, tick };
}

export async function readWorldClock(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  now: Date = new Date(),
  lock = false,
): Promise<WorldClockReading> {
  const nowMs = now.getTime();
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new TypeError('Invalid trusted server time');
  await transaction
    .insertInto('world_campaign_clocks')
    .values({ world_id: worldId, epoch_ms: String(nowMs), starting_tick: '0' })
    .onConflict((conflict) => conflict.column('world_id').doNothing())
    .execute();
  let query = transaction
    .selectFrom('world_campaign_clocks')
    .select(['epoch_ms', 'starting_tick', 'qa_offset_ms'])
    .where('world_id', '=', worldId);
  if (lock) query = query.forUpdate();
  const row = await query.executeTakeFirst();
  if (!row) throw new Error('World campaign clock is unavailable');
  return worldClockAt(row, nowMs);
}

const LIGHT_DAY_MS = 600_000n;
const LIGHT_NIGHT_MS = 300_000n;

/** Light runs from the same world genesis as the campaign clock but on its own fixed cycle. */
export function readWorldLight(clock: WorldClockReading): {
  readonly phase: 'DAY' | 'NIGHT';
  readonly msIntoPhase: string;
  readonly phaseMs: string;
} {
  const phase = lightPhaseAt(createLightClock(clock.epochMs), clock.nowMs);
  const offset = (BigInt(clock.nowMs) - BigInt(clock.epochMs)) % (LIGHT_DAY_MS + LIGHT_NIGHT_MS);
  return phase === 'DAY'
    ? { phase, msIntoPhase: offset.toString(), phaseMs: LIGHT_DAY_MS.toString() }
    : {
        phase,
        msIntoPhase: (offset - LIGHT_DAY_MS).toString(),
        phaseMs: LIGHT_NIGHT_MS.toString(),
      };
}
