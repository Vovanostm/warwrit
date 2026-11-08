import * as combat from '@warwrit/game-core';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sql } from 'kysely';
import { buildApp } from '../app.js';
import { createDatabase } from '../db/database.js';
import { loadServerConfig } from '../config.js';
import { cleanupPlayground } from './store.js';
import { projectCombatLabReplay } from '../combat-lab/replay.js';
import { playgroundTemplate, playgroundDebugScenarios } from './scenario.js';
import type {
  PlaygroundCommand,
  PlaygroundResult,
  PlaygroundInspection,
  EncounterCommandDto,
} from '@warwrit/protocol';

const url = process.env['DATABASE_URL'];
const origin = 'http://127.0.0.1:53505';
const owner = randomUUID();
const other = randomUUID();
const outsider = randomUUID();
const db = createDatabase(url ?? 'postgres://unused/unused');
const settings = {
  environment: 'test' as const,
  host: '127.0.0.1',
  origin,
  accountIds: [owner, other],
  database: db,
};
const identity = {
  database: db,
  config: {
    issuer: `${origin}/dex`,
    clientId: 'test',
    clientSecret: 'test-only',
    redirectUri: `${origin}/auth/callback`,
    publicOrigin: origin,
    secureCookies: false,
  },
};
const app = buildApp({ logger: false, identity, playground: settings });
const headers = { origin, cookie: 'warwrit_session=owner-token' };
const command = (
  operation: PlaygroundCommand['operation'],
  prior?: PlaygroundResult,
): PlaygroundCommand => ({
  commandId: randomUUID(),
  issuedAt: new Date().toISOString(),
  operation,
  ...(operation === 'create'
    ? {}
    : { sandboxId: prior!.sandbox.id, expectedRevision: prior!.sandbox.revision }),
});
const send = (body: PlaygroundCommand, cookie = headers.cookie) =>
  app.inject({
    method: 'POST',
    url: '/dev/playground/api/commands',
    headers: { origin, cookie },
    payload: body,
  });

beforeAll(async () => {
  if (!url) return;
  for (const [id, token] of [
    [owner, 'owner-token'],
    [other, 'other-token'],
    [outsider, 'outsider-token'],
  ] as const) {
    await sql`insert into identity_accounts (id, issuer, subject) values (${id}, 'urn:wlc05:test', ${id})`.execute(
      db,
    );
    await sql`insert into identity_sessions (account_id, token_digest, expires_at) values (${id}, ${createHash('sha256').update(token).digest()}, now() + interval '1 hour')`.execute(
      db,
    );
  }
});
afterAll(async () => {
  await app.close();
  if (url) {
    const ids = sql.join([owner, other, outsider]);
    await sql`delete from playground.sandboxes where owner_id in (${ids})`.execute(db);
    await sql`delete from identity_sessions where account_id in (${ids})`.execute(db);
    await sql`delete from identity_accounts where id in (${ids})`.execute(db);
  }
  await db.destroy();
  vi.unstubAllEnvs();
});

describe.skipIf(!url)('playground real PostgreSQL authorization and isolated lifecycle', () => {
  it('denies absent/revoked sessions, nondevelopers and foreign/missing origins', async () => {
    expect((await app.inject('/dev/playground/api')).statusCode).toBe(401);
    expect((await app.inject('/dev/combat-lab/catalog')).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          url: '/dev/playground/api',
          headers: { cookie: 'warwrit_session=outsider-token' },
        })
      ).statusCode,
    ).toBe(403);
    for (const requestHeaders of [
      { cookie: headers.cookie },
      { ...headers, origin: 'http://foreign.test' },
    ]) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/dev/playground/api/commands',
            headers: requestHeaders,
            payload: command('create'),
          })
        ).statusCode,
      ).toBe(403);
    }
    const bootstrap = await app.inject({ url: '/dev/playground/api', headers });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.headers['cache-control']).toBe('private, no-store');
    expect(bootstrap.json().accountId).toBe(owner);
    expect(bootstrap.body).not.toContain('owner-token');
  });

  it('serializes retries, freezes active state, clones independently and survives app restart without world writes', async () => {
    const worldBefore = (
      await sql`select * from world_first_hunt_state order by world_id`.execute(db)
    ).rows;
    const create = command('create');
    const [first, retry] = await Promise.all([send(create), send(create)]);
    expect(first.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    let current = first.json<PlaygroundResult>();
    const id = current.sandbox.id;
    expect(
      (await send({ ...create, operation: 'delete', sandboxId: id, expectedRevision: 0 }))
        .statusCode,
    ).toBe(409);
    expect((await send(command('activate', current))).statusCode).toBe(409);
    expect((await send(command('reset', current), 'warwrit_session=other-token')).statusCode).toBe(
      404,
    );
    expect(
      (
        await app.inject({
          url: `/dev/playground/api/${id}`,
          headers: { ...headers, cookie: 'warwrit_session=other-token' },
        })
      ).statusCode,
    ).toBe(404);
    const scenario = playgroundTemplate();
    const invalid = { ...scenario, initial: { ...scenario.initial, seed: -1 } };
    expect((await send({ ...command('configure', current), scenario: invalid })).statusCode).toBe(
      400,
    );
    const configure = {
      ...command('configure', current),
      scenario: { ...scenario, initial: { ...scenario.initial, seed: 17 } },
    };
    current = (await send(configure)).json<PlaygroundResult>();
    expect(current.sandbox.revision).toBe(1);
    expect((await send(command('validate', first.json()))).statusCode).toBe(409);
    current = (await send(command('validate', current))).json<PlaygroundResult>();
    current = (await send(command('activate', current))).json<PlaygroundResult>();
    expect(current.sandbox.status).toBe('active');
    expect((await send({ ...command('configure', current), scenario })).statusCode).toBe(409);
    const inspected = await app.inject({ url: `/dev/playground/api/${id}`, headers });
    expect(inspected.statusCode).toBe(200);
    expect(inspected.json().view.sessionId).toBe(inspected.json().encounterId);
    expect(inspected.json().view.viewRevision).toBe(0);
    expect(inspected.json().audit).toHaveLength(4);
    const replay = await app.inject({ url: `/dev/playground/api/${id}/replay`, headers });
    expect(replay.statusCode).toBe(200);
    expect(projectCombatLabReplay(replay.json().replay)).toEqual(inspected.json().view);
    expect(replay.body).not.toContain('owner-token');
    expect(
      (
        await app.inject({
          url: `/dev/playground/api/${id}/replay`,
          headers: { ...headers, cookie: 'warwrit_session=other-token' },
        })
      ).statusCode,
    ).toBe(404);
    await sql`update playground.sandboxes set scenario = jsonb_set(scenario, '{contentRevision}', '"outdated"'::jsonb) where id = ${id}::uuid`.execute(
      db,
    );
    expect((await app.inject({ url: `/dev/playground/api/${id}`, headers })).json()).toMatchObject({
      view: null,
      validationError: 'CONTENT_REVISION_MISMATCH',
    });
    expect(
      (await app.inject({ url: `/dev/playground/api/${id}/replay`, headers })).statusCode,
    ).toBe(409);
    const oldClone = (await send(command('clone', current))).json<PlaygroundResult>();
    expect((await send(command('delete', oldClone))).json().sandbox.status).toBe('deleted');
    await sql`update playground.sandboxes set scenario = ${JSON.stringify(current.sandbox.scenario)}::jsonb where id = ${id}::uuid`.execute(
      db,
    );
    const clone = (await send(command('clone', current))).json<PlaygroundResult>();
    expect(clone.sandbox.id).not.toBe(id);
    expect(clone.sandbox.status).toBe('draft');
    expect(clone.sandbox.scenario).toEqual(current.sandbox.scenario);
    const reopened = buildApp({ logger: false, identity, playground: settings });
    try {
      expect((await reopened.inject({ url: `/dev/playground/api/${id}`, headers })).json()).toEqual(
        inspected.json(),
      );
    } finally {
      await reopened.close();
    }
    current = (await send(command('reset', current))).json<PlaygroundResult>();
    expect(current.sandbox.status).toBe('draft');
    const deletion = command('delete', current);
    const deleted = await send(deletion);
    expect(deleted.json().sandbox.status).toBe('deleted');
    expect((await send(deletion)).json()).toEqual(deleted.json());
    expect((await app.inject({ url: `/dev/playground/api/${id}`, headers })).statusCode).toBe(404);
    const readClone = await app.inject({ url: `/dev/playground/api/${clone.sandbox.id}`, headers });
    expect(readClone.json().sandbox.scenario.initial.seed).toBe(17);
    expect(
      (await sql`select * from world_first_hunt_state order by world_id`.execute(db)).rows,
    ).toEqual(worldBefore);
    for (const table of ['company_snapshots', 'encounters', 'encounter_receipts']) {
      expect(
        (
          await sql<{
            count: number;
          }>`select count(*)::int as count from ${sql.table(table)}`.execute(db)
        ).rows[0]!.count,
      ).toBe(0);
    }
    await sql`update playground.sandboxes set expires_at = now() - interval '1 minute' where owner_id = ${owner}`.execute(
      db,
    );
    await cleanupPlayground(db);
    expect((await app.inject({ url: '/dev/playground/api', headers })).json().sandboxes).toEqual(
      [],
    );
    expect(
      (await sql`select * from playground.receipts where owner_id = ${owner}`.execute(db)).rows,
    ).toEqual([]);
  });

  it('executes the real encounter pipeline, retries exactly, persists terminal replay and isolates reset/owners', async () => {
    const publicBefore = (await sql`select * from public.encounters`.execute(db)).rows;
    let current = (await send(command('create'))).json<PlaygroundResult>();
    const scenario = playgroundDebugScenarios()[0]!;
    current = (await send({ ...command('configure', current), scenario })).json<PlaygroundResult>();
    current = (await send(command('validate', current))).json<PlaygroundResult>();
    current = (await send(command('activate', current))).json<PlaygroundResult>();
    const read = async () =>
      (
        await app.inject({ url: `/dev/playground/api/${current.sandbox.id}`, headers })
      ).json<PlaygroundInspection>();
    let inspected = await read();
    const id = inspected.encounterId!;
    expect(inspected.view!.rulesetId).toBe('m1-domain-bridge-v5');
    expect(inspected.view!.attackPreview!.length).toBeGreaterThan(0);
    const dto = (intent: EncounterCommandDto['intent']): EncounterCommandDto => ({
      version: 2,
      encounterId: id,
      commandId: randomUUID(),
      expectedRevision: inspected.view!.viewRevision,
      activationId: inspected.view!.activation!.id,
      actorId: inspected.view!.activation!.actorId,
      intent,
    });
    const post = (body: EncounterCommandDto, cookie = headers.cookie) =>
      app.inject({
        method: 'POST',
        url: '/dev/playground/api/combat/commands',
        headers: { ...headers, cookie },
        payload: body,
      });
    const first = dto({ type: 'attack', targetId: inspected.view!.attackPreview![0]!.targetId });
    const [accepted, duplicate] = await Promise.all([post(first), post(first)]);
    expect(accepted.statusCode).toBe(200);
    expect(duplicate.json()).toEqual(accepted.json());
    expect(accepted.json().receiptId).toBe(`${id}:1`);
    expect((await post(first, 'warwrit_session=other-token')).statusCode).toBe(404);
    expect((await post({ ...first, intent: { type: 'wait' } })).json()).toMatchObject({
      status: 'rejected',
      code: 'CONFLICT',
    });
    expect((await post({ ...first, commandId: randomUUID() })).json()).toMatchObject({
      status: 'rejected',
      code: 'CONFLICT',
    });
    inspected = await read();
    expect(inspected.view!.viewRevision).toBe(1);
    expect(await read()).toEqual(inspected);
    const reopened = buildApp({ logger: false, identity, playground: settings });
    try {
      expect(
        (
          await reopened.inject({ url: `/dev/playground/api/${current.sandbox.id}`, headers })
        ).json(),
      ).toEqual(inspected);
      expect(
        (
          await reopened.inject({
            method: 'POST',
            url: '/dev/playground/api/combat/commands',
            headers,
            payload: first,
          })
        ).json(),
      ).toEqual(accepted.json());
    } finally {
      await reopened.close();
    }
    let steps = 0;
    while (inspected.view!.status === 'active' && steps++ < 500) {
      const next = await post(dto({ type: 'autoplay' }));
      expect(next.statusCode, next.body).toBe(200);
      inspected = await read();
    }
    expect(inspected.view!.status).toBe('resolved');
    expect(inspected.receipts).toHaveLength(inspected.view!.viewRevision);
    expect(inspected.rejections!.length).toBeGreaterThan(0);
    const exported = (
      await app.inject({ url: `/dev/playground/api/${current.sandbox.id}/replay`, headers })
    ).json();
    expect(exported.matches).toBe(true);
    expect(exported.expectedDigest).toBe(exported.actualDigest);
    expect(combat.replayCombat(exported.replay).events).toEqual(inspected.events);
    expect(projectCombatLabReplay(exported.replay)).toEqual(inspected.view);
    expect((await post(first)).json()).toEqual(accepted.json());
    // Corrupt only our sandbox's stored state: the UI must report actual divergence.
    const stored = (
      await sql<{
        state: combat.BattleState;
      }>`select state from playground.encounters where id = ${id}::uuid`.execute(db)
    ).rows[0]!.state;
    await sql`update playground.encounters set state = ${JSON.stringify({ ...stored, seed: stored.seed + 1 })}::json where id = ${id}::uuid`.execute(
      db,
    );
    expect(
      (
        await app.inject({ url: `/dev/playground/api/${current.sandbox.id}/replay`, headers })
      ).json().matches,
    ).toBe(false);
    await sql`update playground.encounters set state = ${JSON.stringify(stored)}::json where id = ${id}::uuid`.execute(
      db,
    );
    const savedCommand = (
      await sql<{
        command: combat.CombatCommand;
      }>`select command from playground.encounter_commands where encounter_id = ${id}::uuid and revision = 1`.execute(
        db,
      )
    ).rows[0]!.command;
    await sql`update playground.encounter_commands set command = ${JSON.stringify({ ...savedCommand, activationId: 'corrupt' })}::json where encounter_id = ${id}::uuid and revision = 1`.execute(
      db,
    );
    expect(
      (
        await app.inject({ url: `/dev/playground/api/${current.sandbox.id}/replay`, headers })
      ).json(),
    ).toMatchObject({ matches: false, actualDigest: null });
    await sql`update playground.encounter_commands set command = ${JSON.stringify(savedCommand)}::json where encounter_id = ${id}::uuid and revision = 1`.execute(
      db,
    );
    current = (await send(command('reset', current))).json<PlaygroundResult>();
    expect((await post(first)).statusCode).toBe(404);
    current = (await send(command('validate', current))).json<PlaygroundResult>();
    current = (await send(command('activate', current))).json<PlaygroundResult>();
    expect((await read()).encounterId).not.toBe(id);
    expect((await read()).view!.viewRevision).toBe(0);
    expect((await sql`select * from public.encounters`.execute(db)).rows).toEqual(publicBefore);
    await send(command('delete', current));
  });

  it('accepts a one-AP move then a three-AP shot and rejects blocked movement atomically', async () => {
    let current = (await send(command('create'))).json<PlaygroundResult>();
    const base = playgroundTemplate();
    const scenario = {
      ...base,
      initial: {
        ...base.initial,
        units: [
          {
            id: 'archer',
            profileId: 'W05',
            sideId: 'human' as const,
            position: { q: 2, r: 5 },
            skillRanks: {},
          },
          {
            id: 'enemy',
            profileId: 'W01',
            sideId: 'opponent' as const,
            position: { q: 6, r: 5 },
            skillRanks: {},
          },
        ],
      },
    };
    current = (await send({ ...command('configure', current), scenario })).json<PlaygroundResult>();
    current = (await send(command('validate', current))).json<PlaygroundResult>();
    current = (await send(command('activate', current))).json<PlaygroundResult>();
    const read = async () =>
      (
        await app.inject({ url: `/dev/playground/api/${current.sandbox.id}`, headers })
      ).json<PlaygroundInspection>();
    let detail = await read();
    const post = (intent: EncounterCommandDto['intent']) =>
      app.inject({
        method: 'POST',
        url: '/dev/playground/api/combat/commands',
        headers,
        payload: {
          version: 2,
          encounterId: detail.encounterId,
          commandId: randomUUID(),
          expectedRevision: detail.view!.viewRevision,
          activationId: detail.view!.activation!.id,
          actorId: detail.view!.activation!.actorId,
          intent,
        },
      });
    const before = detail.view;
    expect((await post({ type: 'move', to: { q: 7, r: 3 } })).json()).toMatchObject({
      status: 'rejected',
      code: 'INVALID_COMMAND',
    });
    expect((await read()).view).toEqual(before);
    expect(
      detail.view!.movementPreview!.find((move) => move.to.q === 3 && move.to.r === 5)
        ?.actionPointCost,
    ).toBe(1);
    expect((await post({ type: 'move', to: { q: 3, r: 5 } })).statusCode).toBe(200);
    detail = await read();
    expect(detail.view!.activation!.actionPoints.current).toBe(3);
    expect(
      detail.view!.attackPreview!.find((attack) => attack.targetId === 'enemy')?.actionPointCost,
    ).toBe(3);
    expect((await post({ type: 'attack', targetId: 'enemy' })).statusCode).toBe(200);
    expect((await read()).view!.viewRevision).toBe(2);
    expect(
      (
        await app.inject({ url: `/dev/playground/api/${current.sandbox.id}/replay`, headers })
      ).json().matches,
    ).toBe(true);
    await send(command('delete', current));
  });

  it('preflights field errors and every fresh debug scenario without allocating a battle', async () => {
    const before = (await sql`select id from playground.encounters`.execute(db)).rows;
    const preflight = (scenario: unknown) =>
      app.inject({
        method: 'POST',
        url: '/dev/playground/api/preflight',
        payload: JSON.stringify(scenario),
        headers: { ...headers, 'content-type': 'application/json' },
      });
    for (const scenario of playgroundDebugScenarios())
      expect((await preflight(scenario)).json(), scenario.metadata.name).toEqual({
        valid: true,
        errors: [],
      });
    const scenario = playgroundTemplate();
    const bad = {
      ...scenario,
      initial: {
        ...scenario.initial,
        units: scenario.initial.units.map((unit, index) =>
          index === 1 ? { ...unit, position: scenario.initial.units[0]!.position } : unit,
        ),
      },
    };
    const response = await preflight(bad);
    expect(response.statusCode).toBe(400);
    expect(response.json().errors).toContainEqual(
      expect.objectContaining({ field: 'initial.units[1].position' }),
    );
    expect(
      (
        await preflight({
          ...scenario,
          resources: [{ unitId: 'missing', health: 1, armor: 0, stamina: 1, morale: 1 }],
        })
      ).statusCode,
    ).toBe(400);
    expect((await preflight({ ...scenario, rulesetId: 'future' })).json().errors).toContainEqual(
      expect.objectContaining({ field: 'rulesetId' }),
    );
    expect((await sql`select id from playground.encounters`.execute(db)).rows).toEqual(before);
  });

  it('returns accepted receipts before clock expiry checks and never recreates after TTL cleanup', async () => {
    const baseline = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(baseline);
    try {
      const create = { ...command('create'), issuedAt: new Date(baseline + 60_000).toISOString() };
      const accepted = await send(create);
      expect(accepted.statusCode).toBe(200);
      now.mockReturnValue(baseline + 24 * 60 * 60_000 + 1);
      expect((await send(create)).json()).toEqual(accepted.json());
      await sql`update playground.sandboxes set expires_at = now() - interval '1 second' where id = ${accepted.json().sandbox.id}::uuid`.execute(
        db,
      );
      await cleanupPlayground(db);
      expect((await send(create)).statusCode).toBe(409);
      expect(
        (
          await sql`select * from playground.receipts where owner_id = ${owner} and command_id = ${create.commandId}::uuid`.execute(
            db,
          )
        ).rows,
      ).toEqual([]);
    } finally {
      now.mockRestore();
    }
  });

  it('rejects unsupported revisions, expired commands, revoked sessions and production requests', async () => {
    const created = (await send(command('create'))).json<PlaygroundResult>();
    expect(
      (
        await send({
          ...command('configure', created),
          scenario: { ...playgroundTemplate(), schemaRevision: 99 },
        } as unknown as PlaygroundCommand)
      ).statusCode,
    ).toBe(400);
    expect((await send({ ...command('create'), issuedAt: '2000-01-01' })).statusCode).toBe(409);
    expect(
      (
        await send({
          ...command('create'),
          issuedAt: new Date(Date.now() - (24 * 60 * 60_000 - 30_000)).toISOString(),
        })
      ).statusCode,
    ).toBe(409);
    await sql`update identity_sessions set revoked_at = now() where account_id = ${other}`.execute(
      db,
    );
    expect(
      (
        await app.inject({
          url: '/dev/playground/api',
          headers: { ...headers, cookie: 'warwrit_session=other-token' },
        })
      ).statusCode,
    ).toBe(401);
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect((await app.inject({ url: '/dev/playground/api', headers })).statusCode).toBe(404);
      expect((await send(command('create'))).statusCode).toBe(404);
      expect(() => buildApp({ logger: false, identity, playground: settings })).toThrow(
        'explicit development/test',
      );
      const production = buildApp({ logger: false });
      try {
        expect((await production.inject('/dev/playground/api')).statusCode).toBe(404);
      } finally {
        await production.close();
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

it('requires explicit environment and complete server-side authorization configuration', () => {
  const base = {
    PLAYGROUND: '1',
    HOST: '127.0.0.1',
    DATABASE_URL: 'postgres://unused:unused@127.0.0.1:54505/test',
    OIDC_ISSUER: `${origin}/dex`,
    OIDC_CLIENT_ID: 'local',
    OIDC_CLIENT_SECRET: 'local-only',
    OIDC_REDIRECT_URI: `${origin}/auth/callback`,
    PUBLIC_ORIGIN: origin,
    PLAYGROUND_ACCOUNT_IDS: owner,
  };
  expect(loadServerConfig({ ...base, NODE_ENV: 'development' }).playground?.accountIds).toEqual([
    owner,
  ]);
  for (const NODE_ENV of ['production', 'staging', ''])
    expect(() => loadServerConfig({ ...base, NODE_ENV })).toThrow('explicit development/test');
  expect(() => loadServerConfig({ ...base, NODE_ENV: 'test', PLAYGROUND_ACCOUNT_IDS: '' })).toThrow(
    'developer allowlist',
  );
});
