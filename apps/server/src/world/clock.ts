import { campaignTickAt, createCampaignClock } from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';

export interface WorldClockReading {
  readonly epochMs: string;
  readonly startingTick: string;
  readonly nowMs: string;
  readonly tick: string;
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
    .select(['epoch_ms', 'starting_tick'])
    .where('world_id', '=', worldId);
  if (lock) query = query.forUpdate();
  const row = await query.executeTakeFirst();
  if (!row) throw new Error('World campaign clock is unavailable');
  const tick = campaignTickAt(createCampaignClock(row.epoch_ms, row.starting_tick), String(nowMs));
  return { epochMs: row.epoch_ms, startingTick: row.starting_tick, nowMs: String(nowMs), tick };
}

export function millisecondsUntilTick(clock: WorldClockReading, dueTick: string): string {
  const deadline = BigInt(clock.epochMs) + (BigInt(dueTick) - BigInt(clock.startingTick)) * 21_600n;
  const remaining = deadline - BigInt(clock.nowMs);
  return remaining > 0n ? remaining.toString() : '0';
}
