import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import { COMBAT_LAB_SCENARIO, COMBAT_LAB_VERSION } from '@warwrit/protocol';
import type { CombatLabAcknowledgement, CombatLabAction } from '@warwrit/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { projectCombatLabView } from './projection.js';
import { createCombatLabFixture } from './scenario.js';

const CAPABILITY_HEADER = 'x-combat-lab-capability';
const MAX_SESSIONS = 8;
const MAX_BODY_BYTES = 4096;
const MAX_REPLAY_BYTES = 2 * 1024 * 1024;
const MAX_DECISIONS = 8_000;

export interface CombatLabSettings {
  readonly host: string;
  readonly port: number;
  readonly origin: string;
}

export interface CombatLabSession {
  readonly capability: Buffer;
  readonly originalSetup: combat.BattleSetup;
  readonly controlledSideId: string;
  readonly state: combat.BattleState;
  readonly journal: readonly combat.CombatEvent[];
  readonly commands: readonly combat.CombatCommand[];
  readonly replayBytes: number;
  readonly decisions: ReadonlyMap<
    string,
    { body: string; status: number; acknowledgement: CombatLabAcknowledgement }
  >;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

function isActionBody(value: unknown): value is CombatLabAction {
  if (!record(value) || Object.keys(value).length !== 8) return false;
  if (
    value['version'] !== COMBAT_LAB_VERSION ||
    !id(value['sessionId']) ||
    !id(value['battleId']) ||
    !id(value['requestId']) ||
    !Number.isSafeInteger(value['expectedViewRevision']) ||
    (value['expectedViewRevision'] as number) < 0 ||
    !id(value['activationId']) ||
    !id(value['actorId']) ||
    !record(value['intent'])
  )
    return false;
  const intent = value['intent'];
  switch (intent['type']) {
    case 'move':
      return (
        Object.keys(intent).length === 2 &&
        record(intent['to']) &&
        Object.keys(intent['to']).length === 2 &&
        Number.isSafeInteger(intent['to']['q']) &&
        Number.isSafeInteger(intent['to']['r'])
      );
    case 'attack':
      return Object.keys(intent).length === 2 && id(intent['targetId']);
    case 'defend':
    case 'wait':
    case 'retreat':
      return Object.keys(intent).length === 1;
    default:
      return false;
  }
}

function commandFor(action: CombatLabAction): combat.CombatCommand {
  const base = {
    commandId: combat.commandId(`human:${action.requestId}`),
    activationId: action.activationId,
    actorId: combat.unitId(action.actorId),
  };
  switch (action.intent.type) {
    case 'move':
      return { ...base, type: 'move', to: combat.hex(action.intent.to.q, action.intent.to.r) };
    case 'attack':
      return { ...base, type: 'attack', targetId: combat.unitId(action.intent.targetId) };
    case 'defend':
      return { ...base, type: 'defend' };
    case 'wait':
      return { ...base, type: 'wait' };
    case 'retreat':
      return { ...base, type: 'retreat' };
  }
}

function actionBody(action: CombatLabAction): string {
  const { intent } = action;
  return JSON.stringify([
    action.version,
    action.sessionId,
    action.battleId,
    action.requestId,
    action.expectedViewRevision,
    action.activationId,
    action.actorId,
    intent.type,
    intent.type === 'move'
      ? [intent.to.q, intent.to.r]
      : intent.type === 'attack'
        ? intent.targetId
        : null,
  ]);
}

export function prepareTransition(session: CombatLabSession, command: combat.CombatCommand) {
  if (
    session.commands.length >= combat.combatRules(session.state.rulesetId).limits.maximumCommands
  ) {
    return { code: 'LIMIT_REACHED' } as const;
  }
  const bytes = Buffer.byteLength(JSON.stringify(command)) + (session.commands.length > 0 ? 1 : 0);
  if (session.replayBytes + bytes > MAX_REPLAY_BYTES) return { code: 'LIMIT_REACHED' } as const;
  const result = combat.applyCombatCommand(session.state, command);
  if (!result.ok) return { code: 'INVALID_ACTION' } as const;
  return {
    session: {
      ...session,
      state: result.state,
      journal: [...session.journal, ...result.events],
      commands: [...session.commands, command],
      replayBytes: session.replayBytes + bytes,
    },
  } as const;
}

export function decideAction(session: CombatLabSession, action: CombatLabAction) {
  const body = actionBody(action);
  const prior = session.decisions.get(action.requestId);
  if (prior !== undefined) {
    if (prior.body === body) return { session, ...prior };
    return {
      session,
      status: 409,
      acknowledgement: {
        version: COMBAT_LAB_VERSION,
        requestId: action.requestId,
        status: 'rejected',
        code: 'REQUEST_CONFLICT',
      },
    } as const;
  }
  const save = (
    acknowledgement: CombatLabAcknowledgement,
    status: number,
    next: CombatLabSession = session,
  ) => ({
    session:
      session.decisions.size >= MAX_DECISIONS
        ? next
        : {
            ...next,
            decisions: new Map(session.decisions).set(action.requestId, {
              body,
              status,
              acknowledgement,
            }),
          },
    status,
    acknowledgement,
  });
  const reject = (
    code: Extract<CombatLabAcknowledgement, { status: 'rejected' }>['code'],
    status: number,
  ) =>
    save(
      { version: COMBAT_LAB_VERSION, requestId: action.requestId, status: 'rejected', code },
      status,
    );
  if (
    session.decisions.size >= MAX_DECISIONS ||
    session.commands.length >= combat.combatRules(session.state.rulesetId).limits.maximumCommands
  )
    return reject('LIMIT_REACHED', 409);
  if (action.expectedViewRevision !== session.state.revision) return reject('STALE_VIEW', 409);
  const actor = session.state.units.find(({ id }) => id === action.actorId);
  if (actor?.sideId !== session.controlledSideId) return reject('UNAUTHORIZED', 403);
  if (
    session.state.status !== 'active' ||
    session.state.activation?.id !== action.activationId ||
    session.state.activation.unitId !== action.actorId
  )
    return reject('INVALID_ACTION', 409);
  const prepared = prepareTransition(session, commandFor(action));
  if ('code' in prepared)
    return reject(prepared.code, prepared.code === 'LIMIT_REACHED' ? 409 : 400);
  return save(
    {
      version: COMBAT_LAB_VERSION,
      sessionId: action.sessionId,
      battleId: action.battleId,
      requestId: action.requestId,
      status: 'accepted',
      viewRevision: prepared.session.state.revision,
    },
    200,
    prepared.session,
  );
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

function authorized(request: FastifyRequest, session: CombatLabSession): boolean {
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
  const sessions = new Map<string, CombatLabSession>();
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
    const originalSetup = fixture.originalSetup();
    const session: CombatLabSession = {
      capability: randomBytes(32),
      originalSetup,
      controlledSideId: fixture.controlledSideId,
      state: transition.state,
      journal: transition.events,
      commands: [],
      replayBytes: Buffer.byteLength(
        JSON.stringify({ schemaVersion: 1, setup: originalSetup, commands: [] }),
      ),
      decisions: new Map(),
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

  app.post<{ Params: { sessionId: string } }>(
    '/dev/combat-lab/:sessionId/actions',
    { bodyLimit: MAX_BODY_BYTES },
    async (request, reply) => {
      if (!guard(request)) return reply.code(403).send({ code: 'FORBIDDEN_LOCAL_ORIGIN' });
      const session = readSession(request);
      if (session === undefined) return reply.code(404).send({ code: 'NOT_FOUND' });
      if (!isActionBody(request.body)) return reply.code(400).send({ code: 'INVALID_REQUEST' });
      const action = request.body;
      if (
        action.sessionId !== request.params.sessionId ||
        action.battleId !== session.state.battleId
      ) {
        return reply.code(404).send({ code: 'NOT_FOUND' });
      }
      const decided = decideAction(session, action);
      if (decided.session !== session) sessions.set(action.sessionId, decided.session);
      return reply.code(decided.status).send(decided.acknowledgement);
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
