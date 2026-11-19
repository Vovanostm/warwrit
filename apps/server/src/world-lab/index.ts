import { WORLD_LAB_PURSUIT_ORDER_HEADER } from '@warwrit/protocol';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
import { handleContinuousMovementPost, MovementRejection } from '../world/continuous-movement.js';
import { startWorldRouteWorker } from '../world/route-worker.js';
import { roomTicketFromReservation } from '../room-ticket.js';
import { PAINTED_ATLAS_REGION, mergeExploredBits } from '@warwrit/game-core';
import { startWorldLabNpcWorker } from './npc-worker.js';
import { readWorldLabSlotByAccount, readWorldLabState } from './state.js';
import { createWorldLabRoomClass } from './room.js';
import { WORLD_LAB_SESSION_COOKIE, type WorldLabFixture } from './model.js';

import {
  executeWorldLabGroundOrder,
  executeWorldLabPursuit,
  parseWorldLabPursuit,
  startWorldLabPursuitWorker,
} from './pursuit.js';
import { renderCartographyTile } from './cartography-raster.js';
import { recordWorldLabPlaceVisit } from './cartography-progress.js';

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
class VisitRejection extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
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
  let stopPursuit: (() => Promise<void>) | undefined;
  let stopNpc: (() => Promise<void>) | undefined;
  let stopCartography: (() => Promise<void>) | undefined;

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
    stopPursuit = startWorldLabPursuitWorker(options, (error) =>
      app.log.error({ err: error, event: 'world_lab.pursuit.failed' }),
    );
    // Progress does not depend on a connected browser. Retained plans allow catch-up after restart.
    let stopped = false;
    let active: Promise<void> | undefined;
    const run = () => {
      if (stopped || active) return;
      active = (async () => {
        for (const fixture of options.fixtures) {
          if (stopped) return;
          await readWorldLabState(
            options.database,
            options.worldId,
            options.fixtures,
            fixture.accountId,
            options.now,
            options.timeScale,
          );
        }
      })()
        .catch((error) => app.log.error({ err: error, event: 'world_lab.cartography.failed' }))
        .finally(() => {
          active = undefined;
        });
    };
    const timer = setInterval(run, 1000);
    timer.unref();
    run();
    stopCartography = async () => {
      stopped = true;
      clearInterval(timer);
      await active;
    };
    await realtime.listen(options.realtimePort, options.host);
  });
  app.addHook('onClose', async () => {
    await stopCartography?.();
    await stopPursuit?.();
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

  const readAccountState = (accountId: string) =>
    readWorldLabState(
      options.database,
      options.worldId,
      options.fixtures,
      accountId,
      options.now,
      options.timeScale,
    );

  app.get('/world-lab/state', async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options, false);
    if (!auth) return;
    const state = await readAccountState(auth.principal.accountId);
    return reply.header('Cache-Control', 'no-store').send(state);
  });

  app.get<{ Params: { tileX: string; tileY: string } }>(
    '/world-lab/map/:tileX/:tileY.png',
    async (request, reply) => {
      const auth = await requireAuthenticatedFixture(request, reply, options, false);
      if (!auth) return;
      const { tileX, tileY } = request.params;
      if (
        !/^(0|[1-9]\d?)$/u.test(tileX) ||
        !/^(0|[1-9]\d?)$/u.test(tileY) ||
        Number(tileX) >= 12 ||
        Number(tileY) >= 8
      )
        return reply.code(404).header('Cache-Control', 'no-store').send();
      const state = await readAccountState(auth.fixture.accountId);
      if (!state) return reply.code(404).send();
      const cartography = state.cartography;
      const bytes = await renderCartographyTile({
        tileX: Number(tileX),
        tileY: Number(tileY),
        tileSize: cartography.imageTileSize,
        sheet: cartography.sheet,
        grid: cartography.grid,
        knownBits: mergeExploredBits(
          Buffer.from(cartography.charted, 'base64'),
          Buffer.from(cartography.explored, 'base64'),
        ),
      });
      if (!bytes) return reply.code(404).header('Cache-Control', 'no-store').send();
      return reply
        .type('image/png')
        .header('Cache-Control', 'private, no-store')
        .header('X-Content-Type-Options', 'nosniff')
        .send(bytes);
    },
  );

  app.get<{ Params: { siteId: string } }>(
    '/world-lab/place/:siteId.png',
    async (request, reply) => {
      const auth = await requireAuthenticatedFixture(request, reply, options, false);
      if (!auth) return;
      const state = await readAccountState(auth.fixture.accountId);
      const site = state?.cartography.sites.find(
        (entry) => entry.siteId === request.params.siteId && entry.visited,
      );
      const image = site && SCENE_IMAGES[site.siteId];
      if (!image) return reply.code(404).header('Cache-Control', 'no-store').send();
      const bytes = await readFile(new URL(`../../../..${image}`, import.meta.url));
      return reply.type('image/png').header('Cache-Control', 'private, no-store').send(bytes);
    },
  );

  app.post('/world-lab/movement', { bodyLimit: 2_048 }, async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options);
    if (!auth) return;
    return handleContinuousMovementPost(request, reply, {
      database: options.database,
      worldId: options.worldId,
      region: PAINTED_ATLAS_REGION,
      sessionCookieName: WORLD_LAB_SESSION_COOKIE,
      now: options.now ?? (() => new Date()),
      execute: (input, _accountId, expectedCompanyId) =>
        executeWorldLabGroundOrder(
          options,
          auth.fixture,
          input,
          expectedCompanyId,
          request.headers[WORLD_LAB_PURSUIT_ORDER_HEADER],
        ),
    });
  });

  app.post('/world-lab/pursuit', { bodyLimit: 2_048 }, async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options);
    if (!auth) return;
    if (request.headers['x-warwrit-expected-company-id'] !== auth.fixture.companyId)
      return reply.code(403).send({ code: 'NOT_AUTHORIZED' });
    const input = parseWorldLabPursuit(request.body);
    if (!input) return reply.code(400).send({ code: 'INVALID_COMMAND' });
    try {
      const response = await executeWorldLabPursuit(
        options,
        auth.fixture,
        input,
        request.headers[WORLD_LAB_PURSUIT_ORDER_HEADER],
      );
      return reply.header('Cache-Control', 'no-store').send(response);
    } catch (error) {
      if (error instanceof RangeError) return reply.code(422).send({ code: error.message });
      if (error instanceof MovementRejection) return reply.code(409).send({ code: error.code });
      throw error;
    }
  });

  app.post('/world-lab/visit', { bodyLimit: 512 }, async (request, reply) => {
    const auth = await requireAuthenticatedFixture(request, reply, options);
    if (!auth) return;
    const body = request.body;
    if (!isRecord(body) || Object.keys(body).length !== 1 || typeof body['siteId'] !== 'string')
      return reply.code(400).send({ error: 'invalid visit request' });
    const siteId = body['siteId'];
    try {
      const result = await options.database.transaction().execute(async (transaction) => {
        const state = await readWorldLabState(
          transaction,
          options.worldId,
          options.fixtures,
          auth.principal.accountId,
          options.now,
          options.timeScale,
        );
        const image =
          state?.cartography.sites.some((site) => site.siteId === siteId) && SCENE_IMAGES[siteId];
        if (!state || !image) throw new VisitRejection(404, 'place scene unavailable');
        if (state.own.movement.mode === 'MOVING')
          throw new VisitRejection(409, 'stop before entering');
        const nearest = state.nearbySite;
        if (!nearest || nearest.siteId !== siteId)
          throw new VisitRejection(422, 'place is out of reach');
        await recordWorldLabPlaceVisit(
          transaction,
          options.worldId,
          auth.fixture,
          nearest.siteId,
          state.own.movement.serverTimeMs,
        );
        return {
          schemaVersion: 1,
          siteId: nearest.siteId,
          name: nearest.name,
          image: `/world-lab-api/world-lab/place/${nearest.siteId}.png`,
        } satisfies WorldLabVisitDto;
      });
      return reply.header('Cache-Control', 'no-store').send(result);
    } catch (error) {
      if (error instanceof VisitRejection)
        return reply.code(error.status).send({ error: error.message });
      throw error;
    }
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
