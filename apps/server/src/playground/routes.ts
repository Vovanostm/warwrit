import { registerCampaignTime } from './campaign-time.js';
import { registerMapEditor } from '../map-editor/routes.js';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import {
  PLAYGROUND_CONTENT_REVISION,
  isEncounterCommandDto,
  type PlaygroundCommand,
} from '@warwrit/protocol';
import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { sql } from 'kysely';
import { executeEncounterCommand } from '../encounters/executor.js';
import { sandboxReplay } from './combat.js';
import {
  preflightPlayground,
  playgroundCatalog,
  playgroundDebugScenarios,
  isPlaygroundScenario,
  playgroundTemplate,
} from './scenario.js';
import {
  cleanupPlayground,
  executePlayground,
  listPlayground,
  PlaygroundRefusal,
  readPlayground,
} from './store.js';

export interface PlaygroundSettings {
  readonly campaignTimeWorldId?: string;
  readonly environment: 'development' | 'test';
  readonly host: string;
  readonly origin: string;
  readonly accountIds: readonly string[];
  readonly database: Kysely<DatabaseSchema>;
}

const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value);

function isCommand(value: unknown): value is PlaygroundCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const operation = row['operation'];
  const allowed = [
    'commandId',
    'issuedAt',
    'operation',
    ...(operation === 'create' ? [] : ['sandboxId', 'expectedRevision']),
    ...(operation === 'configure' ? ['scenario'] : []),
  ];
  return (
    Object.keys(row).length === allowed.length &&
    allowed.every((key) => Object.hasOwn(row, key)) &&
    uuid(row['commandId']) &&
    typeof row['issuedAt'] === 'string' &&
    Number.isFinite(Date.parse(row['issuedAt'])) &&
    ['create', 'configure', 'validate', 'activate', 'clone', 'reset', 'delete'].includes(
      String(operation),
    ) &&
    (operation === 'create' ||
      (uuid(row['sandboxId']) &&
        Number.isSafeInteger(row['expectedRevision']) &&
        Number(row['expectedRevision']) >= 0)) &&
    (operation !== 'configure' || isPlaygroundScenario(row['scenario']))
  );
}

export function registerPlayground(app: FastifyInstance, settings: PlaygroundSettings): void {
  if (
    !['development', 'test'].includes(process.env['NODE_ENV'] ?? '') ||
    !['development', 'test'].includes(settings.environment) ||
    !['127.0.0.1', '::1'].includes(settings.host) ||
    settings.accountIds.length === 0
  ) {
    throw new Error(
      'Playground requires explicit development/test, loopback and developer allowlist',
    );
  }
  app.register(async (scope) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cleaning: Promise<void> | undefined;
    scope.addHook('onReady', async () => {
      await cleanupPlayground(settings.database);
      timer = setInterval(() => {
        if (cleaning) return;
        cleaning = cleanupPlayground(settings.database)
          .catch(() => {
            scope.log.warn({ event: 'playground.cleanup.failed' }, 'Playground cleanup failed');
          })
          .finally(() => {
            cleaning = undefined;
          });
      }, 60_000);
      timer.unref();
    });
    scope.addHook('onClose', async () => {
      if (timer) clearInterval(timer);
      await cleaning;
    });
    scope.decorateRequest('playgroundAccountId', '');
    scope.addHook('preValidation', async (request, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      if (!['development', 'test'].includes(process.env['NODE_ENV'] ?? ''))
        return reply.code(404).send({ code: 'NOT_FOUND' });
      const origin = request.headers.origin;
      if (
        (request.method !== 'GET' && origin !== settings.origin) ||
        (origin !== undefined && origin !== settings.origin)
      )
        return reply.code(403).send({ code: 'ORIGIN_FORBIDDEN' });
      const accountId = await resolveSessionAccount(request, settings.database);
      if (!accountId) return reply.code(401).send({ code: 'AUTHENTICATION_REQUIRED' });
      if (!settings.accountIds.includes(accountId))
        return reply.code(403).send({ code: 'DEVELOPER_REQUIRED' });
      request.playgroundAccountId = accountId;
    });
    scope.setErrorHandler((error, request, reply) => {
      if (error instanceof PlaygroundRefusal)
        return reply.code(error.status).send({ code: error.code });
      const status =
        error instanceof Error && 'statusCode' in error ? Number(error.statusCode) : 500;
      if (status >= 400 && status < 500)
        return reply.code(status).send({ code: 'INVALID_REQUEST' });
      request.log.error({ event: 'playground.request.failed' }, 'Playground request failed');
      return reply.code(503).send({ code: 'PLAYGROUND_UNAVAILABLE' });
    });
    registerMapEditor(scope, settings.database);
    if (settings.campaignTimeWorldId)
      registerCampaignTime(scope, settings.database, settings.campaignTimeWorldId);
    scope.get('/dev/playground/api', async (request) => ({
      environment: settings.environment,
      ...(settings.campaignTimeWorldId
        ? { campaignTimeWorldId: settings.campaignTimeWorldId }
        : {}),
      accountId: request.playgroundAccountId,
      contentRevision: PLAYGROUND_CONTENT_REVISION,
      template: playgroundTemplate(),
      catalog: playgroundCatalog(),
      debugScenarios: playgroundDebugScenarios(),
      sandboxes: await listPlayground(settings.database, request.playgroundAccountId),
    }));
    scope.get<{ Params: { id: string } }>('/dev/playground/api/:id', async (request, reply) => {
      if (!uuid(request.params.id)) return reply.code(404).send({ code: 'NOT_FOUND' });
      return readPlayground(settings.database, request.playgroundAccountId, request.params.id);
    });
    scope.get<{ Params: { id: string } }>(
      '/dev/playground/api/:id/replay',
      async (request, reply) => {
        if (!uuid(request.params.id)) return reply.code(404).send({ code: 'NOT_FOUND' });
        const inspected = await readPlayground(
          settings.database,
          request.playgroundAccountId,
          request.params.id,
        );
        if (inspected.validationError)
          return reply.code(409).send({ code: inspected.validationError });
        if (inspected.sandbox.status !== 'active')
          return reply.code(409).send({ code: 'SANDBOX_NOT_ACTIVE' });
        return sandboxReplay(settings.database, inspected.sandbox.id, inspected.sandbox.scenario);
      },
    );
    scope.post(
      '/dev/playground/api/preflight',
      { bodyLimit: 64 * 1024 },
      async (request, reply) => {
        const errors = preflightPlayground(request.body);
        return reply.code(errors.length ? 400 : 200).send({ valid: errors.length === 0, errors });
      },
    );
    scope.post(
      '/dev/playground/api/combat/commands',
      { bodyLimit: 4096 },
      async (request, reply) => {
        if (!isEncounterCommandDto(request.body))
          return reply.code(400).send({ code: 'INVALID_COMMAND' });
        const dto = request.body;
        const response = await executeEncounterCommand(
          settings.database,
          request.playgroundAccountId,
          dto,
          false,
          'playground',
        );
        if (response.status === 'rejected' && response.code !== 'NOT_FOUND') {
          // Bounded diagnostics only, never a game mutation or an alternate receipt.
          await sql`insert into playground.encounter_rejections (encounter_id, command_id, response)
          select ${dto.encounterId}::uuid, ${dto.commandId}, ${JSON.stringify(response)}::jsonb
          from playground.encounters as encounter join playground.sandboxes as sandbox on sandbox.id = encounter.sandbox_id
          where encounter.id = ${dto.encounterId}::uuid and sandbox.owner_id = ${request.playgroundAccountId}
          and sandbox.status = 'active' and sandbox.expires_at > now()
          and (select count(*) from playground.encounter_rejections where encounter_id = ${dto.encounterId}::uuid) < 256
          on conflict do nothing`.execute(settings.database);
        }
        return reply
          .code(response.status === 'accepted' ? 200 : response.code === 'NOT_FOUND' ? 404 : 409)
          .send(response);
      },
    );
    scope.post('/dev/playground/api/commands', { bodyLimit: 64 * 1024 }, async (request, reply) => {
      if (!isCommand(request.body))
        return reply.code(400).send({
          code: 'SCENARIO_OR_COMMAND_INVALID',
          errors:
            request.body && typeof request.body === 'object' && 'scenario' in request.body
              ? preflightPlayground(request.body.scenario)
              : [],
        });
      return executePlayground(settings.database, request.playgroundAccountId, request.body);
    });
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    playgroundAccountId: string;
  }
}
