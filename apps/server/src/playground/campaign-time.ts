import { createCampaignClock } from '@warwrit/game-core';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { PlaygroundTimeReceipt } from '@warwrit/protocol';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { PlaygroundRefusal } from './store.js';

/** Mounted inside the authenticated Playground scope, only for an operator-selected QA world. */
export function registerCampaignTime(
  scope: FastifyInstance,
  database: Kysely<DatabaseSchema>,
  worldId: string,
): void {
  const path = '/dev/playground/api/campaign-time';
  scope.get(path, async () =>
    database.transaction().execute(async (tx) => {
      const clock = await readWorldClock(tx, worldId);
      return { worldId, tick: clock.tick };
    }),
  );
  scope.post(path, { bodyLimit: 512 }, async (request) => {
    const body = request.body as Record<string, unknown> | null;
    if (
      !body ||
      Array.isArray(body) ||
      Object.keys(body).length !== 2 ||
      typeof body['commandId'] !== 'string' ||
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(body['commandId']) ||
      ![1, 10, 100, 1000].includes(body['ticks'] as number)
    )
      throw new PlaygroundRefusal('INVALID_TIME_COMMAND', 400);
    const commandId = body['commandId'];
    const ticks = body['ticks'] as number;
    return database.transaction().execute(async (tx) => {
      const clock = await readWorldClock(tx, worldId, new Date(), true);
      const prior = await sql<{ world_id: string; ticks: number; response: PlaygroundTimeReceipt }>`
        select world_id, ticks, response from playground.campaign_time_receipts
        where owner_id=${request.playgroundAccountId} and command_id=${commandId}::uuid
      `.execute(tx);
      const receipt = prior.rows[0];
      if (receipt) {
        if (receipt.world_id !== worldId || receipt.ticks !== ticks)
          throw new PlaygroundRefusal('COMMAND_ID_CONFLICT', 409);
        return receipt.response;
      }
      const active = await tx
        .selectFrom('encounters')
        .select('id')
        .where('world_id', '=', worldId)
        .where('status', '=', 'active')
        .executeTakeFirst();
      const unsettled = await tx
        .selectFrom('encounter_admissions')
        .select('encounter_id')
        .where('world_id', '=', worldId)
        .where('effects_applied_at', 'is', null)
        .executeTakeFirst();
      if (active || unsettled) throw new PlaygroundRefusal('ACTIVE_ENCOUNTER', 409);
      const rate = createCampaignClock(clock.epochMs, clock.startingTick).rateSegments[0]!
        .ticksPerMs;
      const numerator = BigInt(ticks) * BigInt(rate.denominator);
      if (BigInt(rate.numerator) === 0n || numerator % BigInt(rate.numerator) !== 0n)
        throw new PlaygroundRefusal('UNSUPPORTED_CLOCK_RATE', 409);
      const elapsedMs = numerator / BigInt(rate.numerator);
      if (BigInt(clock.nowMs) + elapsedMs > BigInt(Number.MAX_SAFE_INTEGER))
        throw new PlaygroundRefusal('TIME_LIMIT', 409);
      await tx
        .updateTable('world_campaign_clocks')
        .set({ qa_offset_ms: sql<string>`qa_offset_ms + ${elapsedMs.toString()}::bigint` })
        .where('world_id', '=', worldId)
        .execute();
      const response: PlaygroundTimeReceipt = {
        commandId,
        worldId,
        ticks,
        beforeTick: clock.tick,
        afterTick: (BigInt(clock.tick) + BigInt(ticks)).toString(),
      };
      await sql`insert into playground.campaign_time_receipts
        (owner_id, command_id, world_id, ticks, response)
        values (${request.playgroundAccountId}, ${commandId}::uuid, ${worldId}, ${ticks}, ${JSON.stringify(response)}::jsonb)
      `.execute(tx);
      return response;
    });
  });
}
