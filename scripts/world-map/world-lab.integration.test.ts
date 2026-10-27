import { createHash, randomUUID } from 'node:crypto';
import { fastifyCookie } from '@fastify/cookie';
import { sql } from 'kysely';
import {
  PAINTED_ATLAS_REGION,
  paintedAtlasPoint,
  positionAt,
  readContinuousMovementPlan,
} from '@warwrit/game-core';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
} from '@warwrit/protocol';
import { afterAll, expect, it, vi } from 'vitest';
import { ensureWorldLabSeed } from './world-lab-seed.js';
import { createDatabase } from '../../apps/server/src/db/database.js';
import { buildApp } from '../../apps/server/src/app.js';
import {
  executeContinuousMovement,
  handleContinuousMovementPost,
  handleContinuousMovementRead,
  readContinuousMovementSnapshot,
} from '../../apps/server/src/world/continuous-movement.js';
import { readWorldLabNpcGroups } from '../../apps/server/src/world-lab/npc-store.js';
import { startWorldLabNpcWorker } from '../../apps/server/src/world-lab/npc-worker.js';
import { WORLD_LAB_SESSION_COOKIE } from '../../apps/server/src/world-lab/model.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
afterAll(async () => {
  await database?.destroy();
});

async function scenario() {
  if (!database) throw new Error('PostgreSQL required');
  const worldId = randomUUID();
  const fixtures = await ensureWorldLabSeed(database, worldId);
  const clock = await database
    .selectFrom('world_campaign_clocks')
    .select('epoch_ms')
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  const now = new Date(Number(clock.epoch_ms) + 600_000);
  const owner = fixtures[0]!;
  const view = await readContinuousMovementSnapshot(
    database,
    worldId,
    owner.accountId,
    PAINTED_ATLAS_REGION,
    now,
    owner.companyId,
  );
  return { db: database, worldId, fixtures, owner, now, view };
}
function command(
  view: WorldFreeMovementV2ResponseDto,
  action: WorldFreeMovementV2RequestDto['action'],
): WorldFreeMovementV2RequestDto {
  return {
    schemaVersion: 2,
    commandId: randomUUID(),
    expectedPublicRevision: view.publicRevision,
    expectedMovementEpoch: view.movementEpoch,
    action,
  };
}

it.skipIf(!database)(
  'isolates the lab cookie and samples HTTP movement time after a competing account lock',
  async () => {
    const s = await scenario();
    const token = randomUUID();
    await s.db
      .insertInto('identity_sessions')
      .values({
        token_digest: createHash('sha256').update(token).digest(),
        account_id: s.owner.accountId,
        expires_at: new Date(Date.now() + 60_000),
      })
      .execute();
    let currentTime = s.now;
    const app = buildApp();
    await app.register(fastifyCookie);
    app.post('/movement', (request, reply) =>
      handleContinuousMovementPost(request, reply, {
        database: s.db,
        worldId: s.worldId,
        region: PAINTED_ATLAS_REGION,
        now: () => currentTime,
        sessionCookieName: WORLD_LAB_SESSION_COOKIE,
      }),
    );
    app.get('/movement', (request, reply) =>
      handleContinuousMovementRead(request, reply, {
        database: s.db,
        worldId: s.worldId,
        region: PAINTED_ATLAS_REGION,
        now: () => currentTime,
        sessionCookieName: WORLD_LAB_SESSION_COOKIE,
      }),
    );
    const payload = command(s.view, {
      kind: 'MOVE_TO',
      mapEdition: PAINTED_ATLAS_REGION.mapEdition,
      target: { kind: 'TERRAIN', ...paintedAtlasPoint([1765, 1244]) },
    });
    let releaseLock = () => {};
    let locked = () => {};
    const lockReady = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    let lock: Promise<void> | undefined;
    try {
      const campaignCookie = await app.inject({
        method: 'POST',
        url: '/movement',
        payload,
        headers: { cookie: `warwrit_session=${token}` },
      });
      lock = s.db.transaction().execute(async (tx) => {
        await tx
          .selectFrom('identity_accounts')
          .select('id')
          .where('id', '=', s.owner.accountId)
          .forUpdate()
          .executeTakeFirstOrThrow();
        locked();
        await release;
      });
      await lockReady;
      const pending = app
        .inject({
          method: 'POST',
          url: '/movement',
          payload,
          headers: {
            cookie: `${WORLD_LAB_SESSION_COOKIE}=${token}`,
            'x-warwrit-expected-company-id': s.owner.companyId,
          },
        })
        .then((response) => response);
      await vi.waitFor(
        async () => {
          const waiting = await sql<{ waiting: boolean }>`select exists(
          select 1 from pg_stat_activity where datname = current_database()
          and wait_event_type = 'Lock' and query ilike '%identity_accounts%'
        ) as waiting`.execute(s.db);
          expect(waiting.rows[0]?.waiting).toBe(true);
        },
        { timeout: 10000, interval: 50 },
      );
      currentTime = new Date(s.now.getTime() + 1000);
      releaseLock();
      await lock;
      const accepted = await pending;
      const snapshot = await app.inject({
        method: 'GET',
        url: '/movement',
        headers: { cookie: `${WORLD_LAB_SESSION_COOKIE}=${token}` },
      });
      expect({
        campaignStatus: campaignCookie.statusCode,
        status: accepted.statusCode,
        startedAt: accepted.json<WorldFreeMovementV2ResponseDto>().plan?.startedAtMs,
        snapshot: {
          status: snapshot.statusCode,
          plan: snapshot.json<WorldFreeMovementV2ResponseDto>().plan,
        },
      }).toEqual({
        campaignStatus: 401,
        status: 200,
        startedAt: String(currentTime.getTime()),
        snapshot: { status: 200, plan: accepted.json<WorldFreeMovementV2ResponseDto>().plan },
      });
    } finally {
      releaseLock();
      await lock;
      await app.close();
    }
  },
  20000,
);

it.skipIf(!database)(
  'round-trips the atlas plan through SQL and stops at the exact outskirts position',
  async () => {
    const s = await scenario();
    const target = paintedAtlasPoint([1765, 1244]);
    const accepted = await executeContinuousMovement(
      s.db,
      s.worldId,
      s.owner.accountId,
      s.owner.companyId,
      command(s.view, {
        kind: 'MOVE_TO',
        mapEdition: PAINTED_ATLAS_REGION.mapEdition,
        target: { kind: 'TERRAIN', ...target },
      }),
      PAINTED_ATLAS_REGION,
      s.now,
    );
    const retained = await readContinuousMovementSnapshot(
      s.db,
      s.worldId,
      s.owner.accountId,
      PAINTED_ATLAS_REGION,
      s.now,
      s.owner.companyId,
    );
    const stoppedAt = new Date(s.now.getTime() + 1000);
    const stopped = await executeContinuousMovement(
      s.db,
      s.worldId,
      s.owner.accountId,
      s.owner.companyId,
      command(retained, { kind: 'STOP' }),
      PAINTED_ATLAS_REGION,
      stoppedAt,
    );
    const fresh = createDatabase(connectionString!);
    try {
      const reloaded = await readContinuousMovementSnapshot(
        fresh,
        s.worldId,
        s.owner.accountId,
        PAINTED_ATLAS_REGION,
        stoppedAt,
        s.owner.companyId,
      );
      expect({
        retainedPlan: retained.plan?.planId,
        mode: reloaded.mode,
        point: reloaded.point,
        epoch: reloaded.movementEpoch,
      }).toEqual({
        retainedPlan: accepted.plan!.planId,
        mode: 'STATIONARY_TERRAIN',
        point: positionAt(readContinuousMovementPlan(accepted.plan), String(stoppedAt.getTime())),
        epoch: stopped.movementEpoch,
      });
    } finally {
      await fresh.destroy();
    }
  },
  15000,
);

it.skipIf(!database)(
  'rejects a foreign-company command and a water destination without changing the company',
  async () => {
    const s = await scenario();
    const water = paintedAtlasPoint([2546, 1549]);
    const revisionBefore = await s.db
      .selectFrom('company_snapshots')
      .select('canonical_revision')
      .where('world_id', '=', s.worldId)
      .where('company_id', '=', s.owner.companyId)
      .executeTakeFirstOrThrow();
    await expect(
      executeContinuousMovement(
        s.db,
        s.worldId,
        s.owner.accountId,
        s.fixtures[1]!.companyId,
        command(s.view, { kind: 'STOP' }),
        PAINTED_ATLAS_REGION,
        s.now,
      ),
    ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' });
    await expect(
      executeContinuousMovement(
        s.db,
        s.worldId,
        s.owner.accountId,
        s.owner.companyId,
        command(s.view, {
          kind: 'MOVE_TO',
          mapEdition: PAINTED_ATLAS_REGION.mapEdition,
          target: { kind: 'TERRAIN', ...water },
        }),
        PAINTED_ATLAS_REGION,
        s.now,
      ),
    ).rejects.toMatchObject({ code: 'TARGET_BLOCKED' });
    const after = await s.db
      .selectFrom('company_snapshots')
      .select('canonical_revision')
      .where('world_id', '=', s.worldId)
      .where('company_id', '=', s.owner.companyId)
      .executeTakeFirstOrThrow();
    expect(after).toEqual(revisionBefore);
  },
  15000,
);

it.skipIf(!database)(
  'NPCs advance without rooms and resume their persisted identity and route after restart',
  async () => {
    const s = await scenario();
    let stop = () => Promise.resolve();
    const errors: unknown[] = [];
    try {
      stop = startWorldLabNpcWorker(
        s.db,
        s.worldId,
        (e) => errors.push(e),
        () => s.now,
      );
      await vi.waitFor(
        async () => {
          const rows = await readWorldLabNpcGroups(s.db, s.worldId);
          expect(rows.some((row) => row.state['plan'] !== null)).toBe(true);
        },
        { timeout: 10000, interval: 50 },
      );
      await stop();
      const moving = (await readWorldLabNpcGroups(s.db, s.worldId)).find(
        (row) => row.state['plan'] !== null,
      )!;
      const plan = readContinuousMovementPlan(moving.state['plan']);
      await ensureWorldLabSeed(s.db, s.worldId);
      const retained = (await readWorldLabNpcGroups(s.db, s.worldId)).find(
        (row) => row.groupId === moving.groupId,
      )!;
      const resumeAt = new Date(Number(plan.arrivesAtMs) + 1);
      stop = startWorldLabNpcWorker(
        s.db,
        s.worldId,
        (e) => errors.push(e),
        () => resumeAt,
      );
      await vi.waitFor(
        async () => {
          const row = (await readWorldLabNpcGroups(s.db, s.worldId)).find(
            (row) => row.groupId === moving.groupId,
          )!;
          expect(row.state['plan']).toBeNull();
        },
        { timeout: 10000, interval: 50 },
      );
      const resumed = (await readWorldLabNpcGroups(s.db, s.worldId)).find(
        (row) => row.groupId === moving.groupId,
      )!;
      expect({
        retainedPlan: readContinuousMovementPlan(retained.state['plan']).planId,
        id: resumed.groupId,
        point: resumed.state['point'],
        errors,
      }).toEqual({
        retainedPlan: plan.planId,
        id: moving.groupId,
        point: { xFp: Number(plan.goal.xMicroFp) / 65536, zFp: Number(plan.goal.zMicroFp) / 65536 },
        errors: [],
      });
    } finally {
      await stop();
    }
  },
  25000,
);
