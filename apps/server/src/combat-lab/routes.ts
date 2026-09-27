import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import type { BattleSetup, BattleState, CombatEvent } from '@warwrit/game-core';
import { COMBAT_LAB_SCENARIO, COMBAT_LAB_VERSION } from '@warwrit/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { projectCombatLabView } from './projection.js';
import { createCombatLabFixture } from './scenario.js';

const CAPABILITY_HEADER = 'x-combat-lab-capability';
const MAX_SESSIONS = 8;
const MAX_BODY_BYTES = 4096;

export interface CombatLabSettings {
  readonly host: string;
  readonly port: number;
  readonly origin: string;
}

interface Session {
  readonly capability: Buffer;
  readonly originalSetup: BattleSetup;
  readonly controlledSideId: string;
  readonly state: BattleState;
  readonly journal: readonly CombatEvent[];
}

function isCreateBody(value: unknown): value is {
  version: typeof COMBAT_LAB_VERSION;
  requestId: string;
  scenarioId: typeof COMBAT_LAB_SCENARIO;
} {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    Object.keys(body).length === 3 &&
    body['version'] === COMBAT_LAB_VERSION &&
    body['scenarioId'] === COMBAT_LAB_SCENARIO &&
    typeof body['requestId'] === 'string' &&
    body['requestId'].length > 0 &&
    body['requestId'].length <= 128
  );
}

function authorized(request: FastifyRequest, session: Session): boolean {
  const supplied = request.headers[CAPABILITY_HEADER];
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/u.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(supplied, 'hex'), session.capability);
}

// The store is process-local. There is no implicit replacement after a lost create response.
export function registerCombatLab(app: FastifyInstance, settings: CombatLabSettings): void {
  if (
    process.env['NODE_ENV'] === 'production' ||
    (settings.host !== '127.0.0.1' && settings.host !== '::1')
  ) {
    throw new Error('Combat lab requires a nonproduction loopback server');
  }
  const sessions = new Map<string, Session>();
  const expectedHost = `${settings.host === '::1' ? '[::1]' : settings.host}:${settings.port}`;
  const guard = (request: FastifyRequest): boolean =>
    request.headers.host === expectedHost &&
    (request.headers.origin === undefined || request.headers.origin === settings.origin);

  app.addHook('onClose', () => {
    sessions.clear();
  });

  app.post('/dev/combat-lab', { bodyLimit: MAX_BODY_BYTES }, async (request, reply) => {
    if (!guard(request)) return reply.code(403).send({ code: 'FORBIDDEN_LOCAL_ORIGIN' });
    if (!isCreateBody(request.body)) return reply.code(400).send({ code: 'INVALID_REQUEST' });
    if (sessions.size >= MAX_SESSIONS) return reply.code(409).send({ code: 'LIMIT_REACHED' });

    const sessionId = randomUUID();
    const fixture = createCombatLabFixture(sessionId);
    const transition = fixture.start();
    const session: Session = {
      capability: randomBytes(32),
      originalSetup: fixture.originalSetup(),
      controlledSideId: fixture.controlledSideId,
      state: transition.state,
      journal: transition.events,
    };
    sessions.set(sessionId, session);
    reply.header(CAPABILITY_HEADER, session.capability.toString('hex'));
    return reply
      .code(201)
      .send(
        projectCombatLabView(sessionId, session.controlledSideId, session.state, session.journal),
      );
  });

  const readSession = (request: FastifyRequest<{ Params: { sessionId: string } }>) => {
    const session = sessions.get(request.params.sessionId);
    return session !== undefined && authorized(request, session) ? session : undefined;
  };

  app.get<{ Params: { sessionId: string } }>(
    '/dev/combat-lab/:sessionId',
    async (request, reply) => {
      if (!guard(request)) return reply.code(403).send({ code: 'FORBIDDEN_LOCAL_ORIGIN' });
      const session = readSession(request);
      if (session === undefined) return reply.code(404).send({ code: 'NOT_FOUND' });
      return projectCombatLabView(
        request.params.sessionId,
        session.controlledSideId,
        session.state,
        session.journal,
      );
    },
  );

  app.delete<{ Params: { sessionId: string } }>(
    '/dev/combat-lab/:sessionId',
    { bodyLimit: MAX_BODY_BYTES },
    async (request, reply) => {
      if (!guard(request)) return reply.code(403).send({ code: 'FORBIDDEN_LOCAL_ORIGIN' });
      if (request.body !== undefined) return reply.code(400).send({ code: 'INVALID_REQUEST' });
      if (readSession(request) === undefined) return reply.code(404).send({ code: 'NOT_FOUND' });
      sessions.delete(request.params.sessionId);
      return reply.code(204).send();
    },
  );
}
