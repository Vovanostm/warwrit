import { readWorldClock } from '../world/clock.js';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sql } from 'kysely';
import { buildApp } from '../app.js';
import { createDatabase } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import type { PlaygroundTimeReceipt } from '@warwrit/protocol';

const url = process.env['DATABASE_URL'];
const db = createDatabase(url ?? 'postgres://unused/unused');
const owner = randomUUID(),
  outsider = randomUUID();
const worldId = `qa-time-${randomUUID()}`;
const origin = 'http://127.0.0.1:53808';
const identity = {
  database: db,
  config: {
    issuer: `${origin}/dex`,
    clientId: 'test',
    clientSecret: 'test',
    redirectUri: `${origin}/auth/callback`,
    publicOrigin: origin,
    secureCookies: false,
  },
};
const settings = {
  environment: 'test' as const,
  host: '127.0.0.1',
  origin,
  accountIds: [owner],
  database: db,
};
const makeApp = (enabled = true) =>
  buildApp({
    logger: false,
    identity,
    company: { database: db, worldId },
    playground: { ...settings, ...(enabled ? { campaignTimeWorldId: worldId } : {}) },
  });
const headers = { origin, cookie: 'warwrit_session=time-owner' };
const app = makeApp();
const path = '/dev/playground/api/campaign-time';
const send = (body: Record<string, unknown>, override = {}) =>
  app.inject({ method: 'POST', url: path, headers: { ...headers, ...override }, payload: body });
beforeAll(async () => {
  if (!url) return;
  vi.stubEnv('NODE_ENV', 'test');
  for (const [id, token] of [
    [owner, 'time-owner'],
    [outsider, 'time-outsider'],
  ]) {
    await sql`insert into identity_accounts(id,issuer,subject) values(${id},'urn:qa-time',${id})`.execute(
      db,
    );
    await sql`insert into identity_sessions(account_id,token_digest,expires_at) values(${id},${createHash('sha256').update(token!).digest()},now()+interval '1 hour')`.execute(
      db,
    );
  }
  await sql`insert into world_campaign_clocks(world_id,epoch_ms,starting_tick)
    values(${worldId},${String(Date.now())},'15'),('retained-time-world',${String(Date.now())},'8')`.execute(
    db,
  );
});
afterAll(async () => {
  await app.close();
  await db.destroy();
  vi.unstubAllEnvs();
});

describe.skipIf(!url)('opt-in QA campaign time through the real authenticated boundary', () => {
  it('advances once, retains exact receipt across concurrency/reconstruction and refuses conflicts without touching another clock', async () => {
    const trustedNow = new Date();
    const before = await db.transaction().execute((tx) => readWorldClock(tx, worldId, trustedNow));
    const body = { commandId: randomUUID(), ticks: 100 };
    const [a, b] = await Promise.all([send(body), send(body)]);
    expect(a.statusCode, a.body).toBe(200);
    expect(b.json()).toEqual(a.json());
    const receipt = a.json<PlaygroundTimeReceipt>();
    const after = await db.transaction().execute((tx) => readWorldClock(tx, worldId, trustedNow));
    expect(BigInt(after.nowMs) - BigInt(before.nowMs)).toBe(2160000n);
    expect(BigInt(after.tick) - BigInt(before.tick)).toBe(100n);
    expect(after.startingTick).toBe('15');
    expect(BigInt(receipt.afterTick) - BigInt(receipt.beforeTick)).toBe(100n);
    expect(
      (
        await sql<{
          value: string;
        }>`select qa_offset_ms::text as value from world_campaign_clocks where world_id=${worldId}`.execute(
          db,
        )
      ).rows[0]?.value,
    ).toBe('2160000');
    expect(
      (
        await sql<{
          value: string;
        }>`select starting_tick as value from world_campaign_clocks where world_id='retained-time-world'`.execute(
          db,
        )
      ).rows[0]?.value,
    ).toBe('8');
    expect((await send({ ...body, ticks: 10 })).statusCode).toBe(409);
    const restarted = makeApp();
    try {
      expect(
        (await restarted.inject({ method: 'POST', url: path, headers, payload: body })).json(),
      ).toEqual(receipt);
    } finally {
      await restarted.close();
    }
    expect(
      (
        await sql<{
          count: string;
        }>`select count(*) from playground.campaign_time_receipts where owner_id=${owner}`.execute(
          db,
        )
      ).rows[0]?.count,
    ).toBe('1');
    const rollback = new Client({ connectionString: url });
    await rollback.connect();
    try {
      await expect(runMigrations(rollback, 'down')).rejects.toThrow(
        'retain the simulation clock schema',
      );
    } finally {
      await rollback.end();
    }
  });
  it('fails closed for disabled mode, invalid requests, other sessions/origins and active encounters', async () => {
    const disabled = makeApp(false);
    try {
      expect((await disabled.inject({ url: path, headers })).statusCode).toBe(404);
    } finally {
      await disabled.close();
    }
    const command = { commandId: randomUUID(), ticks: 10 };
    expect((await send(command, { cookie: '' })).statusCode).toBe(401);
    expect((await send(command, { cookie: 'warwrit_session=time-outsider' })).statusCode).toBe(403);
    expect((await send(command, { origin: 'https://other.example' })).statusCode).toBe(403);
    for (const ticks of [-1, 0, 1.5, 1001, '100'])
      expect((await send({ ...command, ticks })).statusCode).toBe(400);
    expect((await send({ ...command, worldId: 'retained-time-world' })).statusCode).toBe(400);
    const encounter = randomUUID();
    await sql`insert into encounters(id,world_id,schema_version,setup,state,revision,status,activation_epoch,deadline_at)
      values(${encounter},${worldId},1,'{}','{}',0,'active',0,now()+interval '1 hour')`.execute(db);
    expect((await send(command)).json()).toEqual({ code: 'ACTIVE_ENCOUNTER' });
    expect(
      (
        await sql<{
          value: string;
        }>`select qa_offset_ms::text as value from world_campaign_clocks where world_id=${worldId}`.execute(
          db,
        )
      ).rows[0]?.value,
    ).toBe('2160000');
    await sql`delete from encounters where id=${encounter}`.execute(db);
    vi.stubEnv('NODE_ENV', 'production');
    expect((await send(command)).statusCode).toBe(404);
    vi.stubEnv('NODE_ENV', 'test');
  });
  it('rolls back the clock when its receipt cannot commit, then safely retries the same request', async () => {
    await sql`alter table playground.campaign_time_receipts add constraint qa_receipt_failure check (ticks <> 10)`.execute(
      db,
    );
    const command = { commandId: randomUUID(), ticks: 10 };
    try {
      expect((await send(command)).statusCode).toBe(503);
      expect(
        (
          await sql<{
            value: string;
          }>`select qa_offset_ms::text as value from world_campaign_clocks where world_id=${worldId}`.execute(
            db,
          )
        ).rows[0]?.value,
      ).toBe('2160000');
    } finally {
      await sql`alter table playground.campaign_time_receipts drop constraint qa_receipt_failure`.execute(
        db,
      );
    }
    const accepted = await send(command);
    expect(accepted.statusCode, accepted.body).toBe(200);
    expect((await send(command)).json()).toEqual(accepted.json());
    expect(
      (
        await sql<{
          value: string;
        }>`select qa_offset_ms::text as value from world_campaign_clocks where world_id=${worldId}`.execute(
          db,
        )
      ).rows[0]?.value,
    ).toBe('2376000');
  });
});
