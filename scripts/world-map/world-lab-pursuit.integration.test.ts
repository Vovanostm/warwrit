import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { sql } from 'kysely';
import { Client } from 'pg';
import { afterAll, expect, it, vi } from 'vitest';
import { PAINTED_ATLAS_REGION, paintedAtlasPoint } from '@warwrit/game-core';
import type { WorldFreeMovementV2RequestDto, WorldLabPursuitRequestDto } from '@warwrit/protocol';
import { worldLabPursuitToken } from '@warwrit/protocol';
import { createDatabase } from '../../apps/server/src/db/database.js';
import { readWorldLabState } from '../../apps/server/src/world-lab/state.js';
import { readWorldLabPursuit } from '../../apps/server/src/world-lab/pursuit-store.js';
import {
  executeWorldLabGroundOrder,
  executeWorldLabPursuit,
  stepWorldLabPursuit,
} from '../../apps/server/src/world-lab/pursuit.js';
import { startWorldLabNpcWorker } from '../../apps/server/src/world-lab/npc-worker.js';
import { readWorldLabNpcGroups } from '../../apps/server/src/world-lab/npc-store.js';
import { ensureWorldLabSeed } from './world-lab-seed.js';

const url = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = url ? createDatabase(url) : undefined;
afterAll(async () => {
  await database?.destroy();
});
async function scenario() {
  if (!database) throw Error('PostgreSQL required');
  const worldId = randomUUID();
  const fixtures = await ensureWorldLabSeed(database, worldId);
  const clock = await database
    .selectFrom('world_campaign_clocks')
    .select('epoch_ms')
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  let time = Number(clock.epoch_ms) + 600_000;
  const context = { database, worldId, fixtures, now: () => new Date(time) };
  const own = fixtures[0]!;
  // These pursuit fixtures are nearby, genuinely observable threats. The
  // production forest/mill seeds intentionally need not be visible at night.
  const origin = paintedAtlasPoint([1731, 1244]);
  const nearby = { xFp: origin.xFp + 112, zFp: origin.zFp };
  const farther = { xFp: origin.xFp + 144, zFp: origin.zFp };
  for (const group of await readWorldLabNpcGroups(database, worldId)) {
    if (!['lab-bandits', 'lab-night-creature'].includes(group.groupId)) continue;
    const home = { ...group.home, point: nearby, routePoints: [nearby, farther] };
    const state = { ...group.state, point: nearby, plan: null, routeIndex: 1 };
    await sql`
      update world_lab_npc_groups
         set home = ${JSON.stringify(home)}::jsonb,
             state = ${JSON.stringify(state)}::jsonb
       where world_id = ${worldId} and group_id = ${group.groupId}
    `.execute(database);
  }
  const state = () =>
    readWorldLabState(database, worldId, fixtures, own.accountId, context.now).then((value) => {
      if (!value) throw Error('Missing lab state');
      return value;
    });
  return {
    context,
    own,
    state,
    advance: (ms: number) => {
      time += ms;
    },
  };
}
async function follow(s: Awaited<ReturnType<typeof scenario>>, targetGroupId = 'lab-bandits') {
  const current = await s.state();
  const request: WorldLabPursuitRequestDto = {
    schemaVersion: 1,
    commandId: randomUUID(),
    expectedPublicRevision: current.own.movement.publicRevision,
    expectedMovementEpoch: current.own.movement.movementEpoch,
    targetGroupId,
  };
  const result = await executeWorldLabPursuit(s.context, s.own, request);
  return { request, result, orderId: (await s.state()).pursuit!.orderId };
}
async function ground(
  s: Awaited<ReturnType<typeof scenario>>,
  action: WorldFreeMovementV2RequestDto['action'],
) {
  const current = await s.state();
  const request: WorldFreeMovementV2RequestDto = {
    schemaVersion: 2,
    commandId: randomUUID(),
    expectedPublicRevision: current.own.movement.publicRevision,
    expectedMovementEpoch: current.own.movement.movementEpoch,
    action,
  };
  await executeWorldLabGroundOrder(s.context, s.own, request, s.own.companyId);
  return request;
}

it.skipIf(!database)(
  'accepts STOP at exact arrival using departure tokens and retains its receipt on later replay',
  async () => {
    const s = await scenario();
    const before = await s.state();
    const move: WorldFreeMovementV2RequestDto = {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision: before.own.movement.publicRevision,
      expectedMovementEpoch: before.own.movement.movementEpoch,
      action: {
        kind: 'MOVE_TO',
        mapEdition: PAINTED_ATLAS_REGION.mapEdition,
        target: { kind: 'TERRAIN', ...paintedAtlasPoint([1765, 1244]) },
      },
    };
    const accepted = await executeWorldLabGroundOrder(s.context, s.own, move, s.own.companyId);
    if (!accepted.plan) throw Error('Expected a persisted moving plan');
    const stop: WorldFreeMovementV2RequestDto = {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision: accepted.publicRevision,
      expectedMovementEpoch: accepted.movementEpoch,
      action: { kind: 'STOP' },
    };
    s.advance(Number(accepted.plan.arrivesAtMs) - s.context.now().getTime());
    // Do not read state here: STOP itself must atomically validate the submitted
    // departure tokens and settle arrival, without a prior mutating projection.
    const stopped = await executeWorldLabGroundOrder(s.context, s.own, stop, s.own.companyId);
    expect(stopped).toMatchObject({
      result: 'ACCEPTED',
      commandId: stop.commandId,
      mode: 'STATIONARY_TERRAIN',
      point: accepted.plan.goal,
      plan: null,
      serverTimeMs: accepted.plan.arrivesAtMs,
    });
    const current = await s.state();
    expect({
      point: current.own.movement.point,
      mode: current.own.movement.mode,
      pursuit: current.pursuit,
    }).toEqual({ point: accepted.plan.goal, mode: 'STATIONARY_TERRAIN', pursuit: null });
    s.advance(5_000);
    expect(await executeWorldLabGroundOrder(s.context, s.own, stop, s.own.companyId)).toEqual(
      stopped,
    );

    const retained = () =>
      Promise.all([
        database!
          .selectFrom('company_snapshots')
          .selectAll()
          .where('world_id', '=', s.context.worldId)
          .where('company_id', '=', s.own.companyId)
          .execute(),
        database!
          .selectFrom('world_party_routes')
          .selectAll()
          .where('world_id', '=', s.context.worldId)
          .where('company_id', '=', s.own.companyId)
          .execute(),
        database!
          .selectFrom('world_route_receipts')
          .selectAll()
          .where('world_id', '=', s.context.worldId)
          .where('company_id', '=', s.own.companyId)
          .orderBy('command_id')
          .execute(),
        readWorldLabPursuit(database!, s.context.worldId, s.own.companyId),
      ]);
    const saved = await retained();
    await expect(
      executeWorldLabGroundOrder(
        s.context,
        s.own,
        { ...stop, commandId: randomUUID() },
        s.own.companyId,
      ),
    ).rejects.toThrow('STALE_REVISION');
    expect(await retained()).toEqual(saved);
  },
);

it.skipIf(!database)(
  'repaths toward a moving observed threat through a new database pool',
  async () => {
    const s = await scenario();
    const errors: unknown[] = [];
    const stopNpc = startWorldLabNpcWorker(
      database!,
      s.context.worldId,
      (error) => errors.push(error),
      s.context.now,
    );
    await vi.waitFor(async () => {
      const npc = (await readWorldLabNpcGroups(database!, s.context.worldId)).find(
        (g) => g.groupId === 'lab-bandits',
      );
      expect(npc?.state['plan']).toBeTruthy();
    });
    await stopNpc();
    const started = await follow(s);
    s.advance(20_000);
    const fresh = createDatabase(url!);
    try {
      await stepWorldLabPursuit({ ...s.context, database: fresh }, s.own);
      const current = await s.state();
      expect({
        errors,
        changedGoal: current.own.movement.plan?.goal,
        pursuit: current.pursuit?.targetId,
        sameOrder: current.pursuit?.orderId === started.orderId,
        laterEpoch:
          BigInt(current.own.movement.movementEpoch) > BigInt(started.result.movementEpoch),
      }).toMatchObject({
        errors: [],
        pursuit: 'lab-bandits',
        sameOrder: true,
        laterEpoch: true,
        changedGoal: expect.not.objectContaining(started.result.plan!.goal),
      });
    } finally {
      await fresh.destroy();
    }
  },
  30_000,
);

it.skipIf(!database)(
  'an old tab cannot cancel a newer pursuit even with freshly read movement revisions',
  async () => {
    const s = await scenario();
    const first = await follow(s);
    const newer = await follow(s);
    const current = await s.state();
    const stop: WorldFreeMovementV2RequestDto = {
      schemaVersion: 2,
      commandId: randomUUID(),
      expectedPublicRevision: current.own.movement.publicRevision,
      expectedMovementEpoch: current.own.movement.movementEpoch,
      action: { kind: 'STOP' },
    };
    await expect(
      executeWorldLabGroundOrder(
        s.context,
        s.own,
        stop,
        s.own.companyId,
        worldLabPursuitToken(first.orderId),
      ),
    ).rejects.toThrow('STALE_MOVEMENT_EPOCH');
    const retained = (await s.state()).pursuit?.orderId;
    await executeWorldLabGroundOrder(
      s.context,
      s.own,
      stop,
      s.own.companyId,
      worldLabPursuitToken(newer.orderId),
    );
    expect({ retained, pursuit: (await s.state()).pursuit }).toEqual({
      retained: newer.orderId,
      pursuit: null,
    });
  },
  30_000,
);

it.skipIf(!database)(
  'preserves pursuit on rejection and old replays, but STOP atomically cancels it',
  async () => {
    const s = await scenario();
    const ordinary = await ground(s, { kind: 'STOP' });
    const started = await follow(s);
    const before = await s.state();
    await expect(follow(s, 'lab-patrol')).rejects.toThrow('TARGET_NOT_VISIBLE');
    await expect(follow(s, 'not-an-observed-id')).rejects.toThrow('TARGET_NOT_VISIBLE');
    await expect(
      ground(s, {
        kind: 'MOVE_TO',
        mapEdition: PAINTED_ATLAS_REGION.mapEdition,
        target: { kind: 'TERRAIN', ...paintedAtlasPoint([2546, 1549]) },
      }),
    ).rejects.toThrow();
    await executeWorldLabGroundOrder(s.context, s.own, ordinary, s.own.companyId);
    const retained = await s.state();
    await ground(s, { kind: 'STOP' });
    await executeWorldLabPursuit(s.context, s.own, started.request);
    await stepWorldLabPursuit(s.context, s.own);
    const stopped = await s.state();
    expect({
      retained: retained.pursuit,
      pointBefore: before.own.movement.point,
      pointAfterRejections: retained.own.movement.point,
      stopped: stopped.pursuit,
      mode: stopped.own.movement.mode,
    }).toEqual({
      retained: before.pursuit,
      pointBefore: before.own.movement.point,
      pointAfterRejections: before.own.movement.point,
      stopped: null,
      mode: 'STATIONARY_SITE',
    });
  },
  30_000,
);

it.skipIf(!database)(
  'freezes the last observed destination when the night creature disappears',
  async () => {
    const s = await scenario();
    // The nearby trusted creature fixture is visible at epoch+600000 NIGHT;
    // no player order or chart is fabricated to reveal the remote mill.
    const started = await follow(s, 'lab-night-creature');
    const observedPoint = (await s.state()).pursuit!.lastPoint;
    s.advance(300_000);
    await stepWorldLabPursuit(s.context, s.own);
    const lost = await s.state();
    s.advance(600_000);
    await stepWorldLabPursuit(s.context, s.own);
    const again = await s.state();
    expect({
      lostStatus: lost.pursuit?.status,
      lostPoint: lost.pursuit?.lastPoint,
      stillLastSeen: again.pursuit?.status,
      point: again.pursuit?.lastPoint,
      originalTarget: started.request.targetGroupId,
    }).toEqual({
      lostStatus: 'LAST_SEEN',
      lostPoint: observedPoint,
      stillLastSeen: 'LAST_SEEN',
      point: observedPoint,
      originalTarget: 'lab-night-creature',
    });
  },
  30_000,
);

it.skipIf(!database)(
  'refuses the pursuit migration rollback while a pursuit is persisted',
  async () => {
    // Only the integration runner may own schema operations, never the persistent lab.
    if (!url || !new URL(url).pathname.startsWith('/ww_integration_'))
      throw Error('Isolated integration database required');
    const s = await scenario();
    await follow(s);
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      // Exercise the original pursuit guard directly. The latest migration
      // now has its own independent cartography-data rollback guard.
      const migration = await readFile(
        new URL(
          '../../apps/server/migrations/0017_world_lab_pursuit_order_ids.down.sql',
          import.meta.url,
        ),
        'utf8',
      );
      await client.query('begin');
      await expect(client.query(migration)).rejects.toThrow(
        'refusing to delete persisted world lab pursuits',
      );
      await client.query('rollback');
      expect(
        (await readWorldLabPursuit(database!, s.context.worldId, s.own.companyId))?.targetId,
      ).toBe('lab-bandits');
    } finally {
      await client.query('rollback');
      await client.end();
    }
  },
  30_000,
);
