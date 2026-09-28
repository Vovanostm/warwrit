import type {
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterFixtureCreateDto,
} from '@warwrit/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  readEncounterMetadata,
} from './executor.js';

export interface EncounterRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly fixtureAdmission: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
const isEncounterId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);

function isFixtureCreate(value: unknown): value is EncounterFixtureCreateDto {
  return isRecord(value) && Object.keys(value).length === 1 && value['version'] === 1;
}

function isCommand(value: unknown): value is EncounterCommandDto {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 7 ||
    value['version'] !== 1 ||
    !isEncounterId(value['encounterId']) ||
    !isId(value['commandId']) ||
    !Number.isSafeInteger(value['expectedRevision']) ||
    (value['expectedRevision'] as number) < 0 ||
    !isId(value['activationId']) ||
    !isId(value['actorId']) ||
    !isRecord(value['intent'])
  )
    return false;
  const intent = value['intent'];
  switch (intent['type']) {
    case 'move':
      return (
        Object.keys(intent).length === 2 &&
        isRecord(intent['to']) &&
        Object.keys(intent['to']).length === 2 &&
        Number.isSafeInteger(intent['to']['q']) &&
        Number.isSafeInteger(intent['to']['r'])
      );
    case 'attack':
      return Object.keys(intent).length === 2 && isId(intent['targetId']);
    case 'defend':
    case 'wait':
    case 'retreat':
      return Object.keys(intent).length === 1;
    default:
      return false;
  }
}

async function authenticatedAccount(
  request: FastifyRequest,
  database: Kysely<DatabaseSchema>,
): Promise<string | undefined> {
  return resolveSessionAccount(request, database);
}

function responseStatus(response: EncounterCommandResponse): number {
  if (response.status === 'accepted') return 200;
  switch (response.code) {
    case 'NOT_FOUND':
      return 404;
    case 'UNAUTHORIZED':
      return 403;
    case 'CONFLICT':
      return 409;
    case 'INVALID_COMMAND':
      return 400;
  }
}

export function registerEncounterRoutes(
  app: FastifyInstance,
  options: EncounterRoutesOptions,
): void {
  const { database } = options;
  app.post('/encounters/fixtures', { bodyLimit: 256 }, async (request, reply) => {
    const accountId = await authenticatedAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    if (!isFixtureCreate(request.body)) return reply.code(400).send({ error: 'invalid request' });
    const created = await createFixtureEncounter(database, accountId);
    return reply.code(201).send(created);
  });

  app.get<{ Params: { encounterId: string } }>(
    '/encounters/:encounterId',
    async (request, reply) => {
      const accountId = await authenticatedAccount(request, database);
      if (accountId === undefined)
        return reply.code(401).send({ error: 'authentication required' });
      if (!isEncounterId(request.params.encounterId)) {
        return reply.code(400).send({ error: 'invalid encounter id' });
      }
      const metadata = await readEncounterMetadata(database, accountId, request.params.encounterId);
      if (metadata === undefined) return reply.code(404).send({ error: 'encounter unavailable' });
      return { version: 1, encounterId: request.params.encounterId, ...metadata };
    },
  );

  app.post<{ Body: unknown }>(
    '/encounters/commands',
    { bodyLimit: 4096 },
    async (request, reply) => {
      const accountId = await authenticatedAccount(request, database);
      if (accountId === undefined)
        return reply.code(401).send({ error: 'authentication required' });
      if (!isCommand(request.body)) return reply.code(400).send({ error: 'invalid request' });
      const result = await executeEncounterCommand(database, accountId, request.body);
      return reply.code(responseStatus(result)).send(result);
    },
  );
}
