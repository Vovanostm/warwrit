import type {
  EncounterCommandResponse,
  EncounterFixtureCreateDto,
  EncounterRoomTicketDto,
} from '@warwrit/protocol';
import { isEncounterCommandDto, isEncounterId, isEncounterResumeDto } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  InconsistentActiveEncounterError,
  readActiveEncounter,
  readEncounterAccess,
} from './access.js';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  requestEncounterResume,
} from './executor.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the encounter session hook; only encounter routes read it. */
    encounterAccountId: string;
  }
}

export interface EncounterRoutesOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly fixtureAdmission?: true;
  readonly onCommandCommitted?: (encounterId: string) => Promise<void>;
  readonly roomTicketIssuer?: (
    encounterId: string,
    cookieHeader: string | undefined,
    ip: string,
  ) => Promise<EncounterRoomTicketDto>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function isFixtureCreate(value: unknown): value is EncounterFixtureCreateDto {
  return isRecord(value) && Object.keys(value).length === 1 && value['version'] === 1;
}

function isRoomTicketRequest(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 1 && value['version'] === 1;
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
  // Encapsulated: the session hook and decorator apply only to encounter routes.
  app.register(async (scope) => registerAuthenticatedRoutes(scope, options));
}

function registerAuthenticatedRoutes(app: FastifyInstance, options: EncounterRoutesOptions): void {
  const { database } = options;
  app.decorateRequest('encounterAccountId', '');
  // preValidation runs after body parsing, so 413 and malformed JSON keep precedence over 401.
  app.addHook('preValidation', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    request.encounterAccountId = accountId;
  });
  if (options.fixtureAdmission === true) {
    app.post('/encounters/fixtures', { bodyLimit: 256 }, async (request, reply) => {
      const accountId = request.encounterAccountId;
      if (!isFixtureCreate(request.body)) return reply.code(400).send({ error: 'invalid request' });
      const created = await createFixtureEncounter(database, accountId);
      return reply.code(201).send(created);
    });
  }

  app.get('/encounters/active', async (request, reply) => {
    try {
      return await readActiveEncounter(database, request.encounterAccountId);
    } catch (error) {
      if (!(error instanceof InconsistentActiveEncounterError)) throw error;
      return reply.code(409).send({ error: 'encounter unavailable' });
    }
  });

  app.post<{ Params: { encounterId: string }; Body: unknown }>(
    '/encounters/:encounterId/resume',
    { bodyLimit: 256 },
    async (request, reply) => {
      const { encounterId } = request.params;
      if (
        !isEncounterId(encounterId) ||
        !isEncounterResumeDto(request.body) ||
        request.body.encounterId !== encounterId
      )
        return reply.code(400).send({ error: 'invalid request' });
      const access = await readEncounterAccess(
        database,
        request.encounterAccountId,
        encounterId,
        options.fixtureAdmission === true,
      );
      if (access === undefined) return reply.code(404).send({ error: 'encounter unavailable' });
      const resumed = await requestEncounterResume(
        database,
        request.encounterAccountId,
        encounterId,
      );
      if (resumed === undefined) return reply.code(409).send({ error: 'resume unavailable' });
      return resumed;
    },
  );

  app.get<{ Params: { encounterId: string } }>(
    '/encounters/:encounterId',
    async (request, reply) => {
      const accountId = request.encounterAccountId;
      if (!isEncounterId(request.params.encounterId)) {
        return reply.code(400).send({ error: 'invalid encounter id' });
      }
      const access = await readEncounterAccess(
        database,
        accountId,
        request.params.encounterId,
        options.fixtureAdmission === true,
      );
      if (access === undefined) return reply.code(404).send({ error: 'encounter unavailable' });
      return {
        version: 1,
        encounterId: request.params.encounterId,
        revision: access.projection.revision,
        status: access.projection.status,
      };
    },
  );

  app.get<{ Params: { encounterId: string } }>(
    '/encounters/:encounterId/projection',
    async (request, reply) => {
      if (!isEncounterId(request.params.encounterId)) {
        return reply.code(400).send({ error: 'invalid encounter id' });
      }
      const access = await readEncounterAccess(
        database,
        request.encounterAccountId,
        request.params.encounterId,
        options.fixtureAdmission === true,
      );
      if (access === undefined) return reply.code(404).send({ error: 'encounter unavailable' });
      reply.header('cache-control', 'no-store');
      return access.projection;
    },
  );

  if (options.roomTicketIssuer !== undefined) {
    const issueRoomTicket = options.roomTicketIssuer;
    app.post<{ Params: { encounterId: string }; Body: unknown }>(
      '/encounters/:encounterId/room-ticket',
      { bodyLimit: 256 },
      async (request, reply) => {
        const accountId = request.encounterAccountId;
        if (!isEncounterId(request.params.encounterId) || !isRoomTicketRequest(request.body)) {
          return reply.code(400).send({ error: 'invalid request' });
        }
        const access = await readEncounterAccess(
          database,
          accountId,
          request.params.encounterId,
          options.fixtureAdmission === true,
        );
        if (access === undefined) return reply.code(404).send({ error: 'encounter unavailable' });
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
      const accountId = request.encounterAccountId;
      if (!isEncounterCommandDto(request.body))
        return reply.code(400).send({ error: 'invalid request' });
      const access = await readEncounterAccess(
        database,
        accountId,
        request.body.encounterId,
        options.fixtureAdmission === true,
      );
      const result = await executeEncounterCommand(
        database,
        accountId,
        request.body,
        access !== undefined,
      );
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
