import type {
  EncounterCommandResponse,
  EncounterFixtureCreateDto,
  EncounterRoomTicketDto,
} from '@warwrit/protocol';
import { isEncounterCommandDto } from '@warwrit/protocol';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  readEncounterMetadata,
  readEncounterProjection,
} from './executor.js';

export interface EncounterRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly fixtureAdmission: true;
  readonly onCommandCommitted?: (encounterId: string) => Promise<void>;
  readonly roomTicketIssuer?: (
    encounterId: string,
    cookieHeader: string | undefined,
    ip: string,
  ) => Promise<EncounterRoomTicketDto>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isEncounterId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);

function isFixtureCreate(value: unknown): value is EncounterFixtureCreateDto {
  return isRecord(value) && Object.keys(value).length === 1 && value['version'] === 1;
}

function isRoomTicketRequest(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 1 && value['version'] === 1;
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

  if (options.roomTicketIssuer !== undefined) {
    const issueRoomTicket = options.roomTicketIssuer;
    app.post<{ Params: { encounterId: string }; Body: unknown }>(
      '/encounters/:encounterId/room-ticket',
      { bodyLimit: 256 },
      async (request, reply) => {
        const accountId = await authenticatedAccount(request, database);
        if (accountId === undefined)
          return reply.code(401).send({ error: 'authentication required' });
        if (!isEncounterId(request.params.encounterId) || !isRoomTicketRequest(request.body)) {
          return reply.code(400).send({ error: 'invalid request' });
        }
        const projection = await readEncounterProjection(
          database,
          accountId,
          request.params.encounterId,
        );
        if (projection === undefined)
          return reply.code(404).send({ error: 'encounter unavailable' });
        const cookieHeader = request.headers.cookie;
        if (cookieHeader !== undefined && typeof cookieHeader !== 'string') {
          return reply.code(400).send({ error: 'invalid request' });
        }
        const ticket = await issueRoomTicket(request.params.encounterId, cookieHeader, request.ip);
        reply.header('cache-control', 'no-store');
        return ticket;
      },
    );
  }

  app.post<{ Body: unknown }>(
    '/encounters/commands',
    { bodyLimit: 4096 },
    async (request, reply) => {
      const accountId = await authenticatedAccount(request, database);
      if (accountId === undefined)
        return reply.code(401).send({ error: 'authentication required' });
      if (!isEncounterCommandDto(request.body))
        return reply.code(400).send({ error: 'invalid request' });
      const result = await executeEncounterCommand(database, accountId, request.body);
      if (result.status === 'accepted') {
        try {
          await options.onCommandCommitted?.(request.body.encounterId);
        } catch (error) {
          request.log.error(
            {
              event: 'encounter.projection_refresh.failed',
              errorKind: error instanceof Error ? 'error' : typeof error,
            },
            'Encounter projection refresh failed after command commit',
          );
        }
      }
      return reply.code(responseStatus(result)).send(result);
    },
  );
}
