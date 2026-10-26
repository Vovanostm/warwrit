import { createHash, randomBytes } from 'node:crypto';
import { matchMaker, Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { fastifyCookie } from '@fastify/cookie';
import type {
  WorldLabRoomTicketDto,
  WorldLabSessionDto,
  WorldLabVisitDto,
} from '@warwrit/protocol';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sql, type Kysely } from 'kysely';

import { isSessionTokenActive, resolveSessionPrincipalFromCookieHeader } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  handleContinuousMovementPost,
  readContinuousMovementSnapshot,
} from '../world/continuous-movement.js';
import { startWorldRouteWorker } from '../world/route-worker.js';
import { roomTicketFromReservation } from '../room-ticket.js';
import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  paintedAtlasNearbySite,
} from '@warwrit/game-core';
import { startWorldLabNpcWorker } from './npc-worker.js';
import { readWorldLabSlotByAccount, readWorldLabState } from './state.js';
import { createWorldLabRoomClass } from './room.js';
import { WORLD_LAB_SESSION_COOKIE, type WorldLabFixture } from './model.js';

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const navigationField = buildNavigationField(PAINTED_ATLAS_REGION);
const SCENE_IMAGES: Readonly<Record<string, string>> = {
  bereznyak: '/assets/art/m1/places/settlements-v2/bereznyak-painting.png',
  'kamenny-brod': '/assets/art/m1/places/settlements-v2/kamenny-brod-painting.png',
};

export interface WorldLabOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
  readonly host: string;
  /** API port, checked here to keep the lab composition's loopback contract explicit. */
  readonly port: number;
  readonly realtimePort: number;
  readonly publicOrigin: string;
  readonly fixtures: readonly WorldLabFixture[];
  readonly now?: () => Date;
  readonly timeScale?: number;
}

function digest(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isLoopbackHost(host: string): boolean {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host.toLowerCase());
}

function isLoopbackPeer(address: string | undefined): boolean {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1' ||
    address === 'localhost'
  );
}

function requestAllowed(request: FastifyRequest, publicOrigin: string, requireOrigin: boolean) {
  const origin = request.headers.origin;
  if (
    (requireOrigin && origin !== publicOrigin) ||
    (origin !== undefined && origin !== publicOrigin)
  )
    return false;
  const peer = request.raw.socket.remoteAddress;
  if (!isLoopbackPeer(peer)) return false;
  const hostHeader = request.headers.host;
  if (!hostHeader) return false;
  try {
    const host = new URL(`http://${hostHeader}`).hostname;
    const expected = new URL(publicOrigin).hostname;
    return isLoopbackHost(host) && host === expected;
  } catch {
    return false;
  }
}

function fixtureMatches(a: WorldLabFixture | undefined, b: WorldLabFixture | undefined) {
  return (
    a !== undefined &&
    b !== undefined &&
    a.slot === b.slot &&
    a.accountId === b.accountId &&
    a.companyId === b.companyId &&
    a.partyId === b.partyId
  );
}

async function authenticatedFixture(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  fixtures: readonly WorldLabFixture[],
  cookieHeader: string | undefined,
) {
  const principal = await resolveSessionPrincipalFromCookieHeader(
    cookieHeader,
    database,
    WORLD_LAB_SESSION_COOKIE,
  );
  if (principal === undefined || !(await isSessionTokenActive(database, principal)))
    return undefined;
  const fixture = await readWorldLabSlotByAccount(database, worldId, principal.accountId);
  const expected = fixtures.find((entry) => entry.accountId === principal.accountId);
  return fixtureMatches(fixture, expected) ? { principal, fixture: expected! } : undefined;
}

async function requireAuthenticatedFixture(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WorldLabOptions,
  requireOrigin = true,
) {
  if (!requestAllowed(request, options.publicOrigin, requireOrigin)) {
    reply.code(404).send();
    return undefined;
  }
  const auth = await authenticatedFixture(
    options.database,
    options.worldId,
    options.fixtures,
    request.headers.cookie,
  );
  if (!auth) reply.code(401).send({ error: 'authentication required' });
  return auth;
}

export function registerWorldLab(app: FastifyInstance, options: WorldLabOptions): void {
  const origin = new URL(options.publicOrigin);
  if (
    process.env['NODE_ENV'] === 'production' ||
    process.env['WORLD_LAB'] !== '1' ||
    !isLoopbackHost(options.host) ||
    !isLoopbackHost(origin.hostname) ||
    !Number.isSafeInteger(options.port) ||
    !Number.isSafeInteger(options.realtimePort) ||
    options.port < 1 ||
    options.port > 65535 ||
    options.realtimePort < 1 ||
    options.realtimePort > 65535 ||
    options.fixtures.length !== 2
  )
    throw new Error('World lab requires its explicitly enabled loopback-only development runtime');

  app.register(fastifyCookie);
  const transport = new WebSocketTransport();
  const realtime = new Server({ transport, gracefullyShutdown: false, greet: false });
  realtime
    .define(
      'world-lab',
      createWorldLabRoomClass(
        options.database,
        options.worldId,
        options.fixtures,
        options.publicOrigin,
        options.now,
        options.timeScale,
        (error) => app.log.error({ err: error, event: 'world_lab.projection.failed' }),
      ),
    )
    .filterBy(['worldId']);
  let stopRoutes: (() => Promise<void>) | undefined;
  let stopNpc: (() => Promise<void>) | undefined;

  app.addHook('onReady', async () => {
    stopRoutes = startWorldRouteWorker(
      options.database,
      options.worldId,
      (error) => app.log.error({ err: error, event: 'world_lab.route_worker.failed' }),
      1_000,
      PAINTED_ATLAS_REGION,
      options.now,
    );
    stopNpc = startWorldLabNpcWorker(
      options.database,
      options.worldId,
      (error) => app.log.error({ err: error, event: 'world_lab.npc_worker.failed' }),
      options.now,
    );
    await realtime.listen(options.realtimePort, options.host);
  });
  app.addHook('onClose', async () => {
    await stopRoutes?.();
    await stopNpc?.();
    await realtime.gracefullyShutdown(false);
  });

  app.post('/world-lab/session', { bodyLimit: 512 }, async (request, reply) => {
    if (!requestAllowed(request, options.publicOrigin, true)) return reply.code(404).send();
    const body = request.body;
    if (
      !isRecord(body) ||
      Object.keys(body).length !== 1 ||
      !['company-a', 'company-b'].includes(String(body['slot']))
    )
      return reply.code(400).send({ error: 'invalid lab slot' });
    const slot = body['slot'] as WorldLabFixture['slot'];
    const fixture = options.fixtures.find((entry) => entry.slot === slot);
    if (!fixture) return reply.code(404).send();
    const selected = await sql<{
      readonly account_id: string;
      readonly company_id: string;
      readonly party_id: string;
      readonly display_name: string;
    }>`
      select account_id, company_id, party_id, display_name
        from world_lab_slots
       where world_id = ${options.worldId} and slot = ${slot}
    `.execute(options.database);
    const row = selected.rows[0];
    if (
      row?.account_id !== fixture.accountId ||
      row.company_id !== fixture.companyId ||
      row.party_id !== fixture.partyId
    )
      return reply.code(404).send();
    const token = randomBytes(32).toString('base64url');
    await options.database
      .insertInto('identity_sessions')
      .values({
        token_digest: digest(token),
        account_id: fixture.accountId,
        expires_at: new Date(Date.now() + SESSION_LIFETIME_MS),
      })
      .execute();
    const response: WorldLabSessionDto = {
      schemaVersion: 1,
      slot: fixture.slot,
      companyId: fixture.companyId,
      name: fixture.name,
    };
    reply.header(
      'Set-Cookie',
      `${WORLD_LAB_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_LIFETIME_MS / 1000}`,
    );
    return reply.header('Cache-Control', 'no-store').send(response);
  });

  app.get('/world-lab/state', async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options, false);
    if (!auth) return;
    const state = await readWorldLabState(
      options.database,
      options.worldId,
      options.fixtures,
      auth.principal.accountId,
      options.now ?? (() => new Date()),
      options.timeScale ?? 1,
    );
    return reply.header('Cache-Control', 'no-store').send(state);
  });

  app.post('/world-lab/movement', { bodyLimit: 2_048 }, async (request, reply) => {
    if (!requestAllowed(request, options.publicOrigin, true)) return reply.code(404).send();
    return handleContinuousMovementPost(request, reply, {
      database: options.database,
      worldId: options.worldId,
      region: PAINTED_ATLAS_REGION,
      sessionCookieName: WORLD_LAB_SESSION_COOKIE,
      now: options.now ?? (() => new Date()),
    });
  });

  app.post('/world-lab/visit', { bodyLimit: 512 }, async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options);
    if (!auth) return;
    const body = request.body;
    if (!isRecord(body) || Object.keys(body).length !== 1 || typeof body['siteId'] !== 'string')
      return reply.code(400).send({ error: 'invalid visit request' });
    const image = SCENE_IMAGES[body['siteId']];
    if (!image) return reply.code(404).send({ error: 'place scene unavailable' });
    const movement = await readContinuousMovementSnapshot(
      options.database,
      options.worldId,
      auth.principal.accountId,
      PAINTED_ATLAS_REGION,
      options.now ?? (() => new Date()),
      auth.fixture.companyId,
    );
    if (movement.mode === 'MOVING') return reply.code(409).send({ error: 'stop before entering' });
    const nearest = paintedAtlasNearbySite(navigationField, movement.point);
    if (nearest?.siteId !== body['siteId'])
      return reply.code(422).send({ error: 'place is out of reach' });
    const result: WorldLabVisitDto = {
      schemaVersion: 1,
      siteId: nearest.siteId,
      name: nearest.name,
      image,
    };
    return reply.header('Cache-Control', 'no-store').send(result);
  });

  app.post('/world-lab/room-ticket', { bodyLimit: 512 }, async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options);
    if (!auth) return;
    const headers = new Headers();
    if (request.headers.cookie !== undefined) headers.set('cookie', request.headers.cookie);
    headers.set('origin', options.publicOrigin);
    const reservation = await matchMaker.joinOrCreate(
      'world-lab',
      { worldId: options.worldId },
      { headers, ip: request.ip },
    );
    const ticket: WorldLabRoomTicketDto = roomTicketFromReservation(reservation);
    return reply.header('Cache-Control', 'no-store').send(ticket);
  });
}
