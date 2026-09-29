import { PROTOCOL_VERSION, type HealthResponse } from '@warwrit/protocol';
import fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';

import { registerIdentityRoutes, type IdentityRoutesOptions } from './auth/routes.js';
import { createLogger } from './logger.js';
import { registerCombatLab, type CombatLabSettings } from './combat-lab/routes.js';
import { registerEncounterRoutes, type EncounterRoutesOptions } from './encounters/routes.js';
import { registerEncounterRealtime } from './encounters/realtime.js';

export interface BuildAppOptions {
  readonly logger?: FastifyBaseLogger | false;
  readonly readinessProbe?: () => Promise<void>;
  readonly combatLab?: CombatLabSettings;
  readonly identity?: IdentityRoutesOptions;
  readonly encounters?: EncounterRoutesOptions;
  readonly encounterRealtime?: { readonly host: string; readonly port: number };
}

const liveResponse: HealthResponse = {
  protocolVersion: PROTOCOL_VERSION,
  service: 'warwrit-server',
  status: 'ok',
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const logger = options.logger ?? createLogger();
  const app =
    logger === false
      ? fastify({ logger: false })
      : fastify({
          loggerInstance: logger,
        });

  app.get('/health/live', async () => liveResponse);
  if (options.identity !== undefined) {
    registerIdentityRoutes(app, options.identity);
  }
  if (options.encounters !== undefined) {
    const realtime =
      options.encounterRealtime !== undefined
        ? registerEncounterRealtime(app, options.encounters.database, options.encounterRealtime)
        : undefined;
    registerEncounterRoutes(app, {
      ...options.encounters,
      ...(realtime === undefined ? {} : { roomTicketIssuer: realtime.issueRoomTicket }),
    });
  }
  if (options.combatLab !== undefined) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Combat lab is unavailable in production');
    }
    registerCombatLab(app, options.combatLab);
  }
  app.get('/health/ready', async (request, reply) => {
    try {
      await options.readinessProbe?.();
      return liveResponse;
    } catch (error) {
      request.log.warn(
        {
          error,
          event: 'health.readiness.failed',
        },
        'Readiness dependency check failed',
      );
      const response: HealthResponse = {
        protocolVersion: PROTOCOL_VERSION,
        service: 'warwrit-server',
        status: 'unavailable',
      };
      return reply.code(503).send(response);
    }
  });

  app.addHook('onReady', async () => {
    app.log.info(
      {
        event: 'server.ready',
        protocolVersion: PROTOCOL_VERSION,
      },
      'Warwrit server is ready',
    );
  });

  return app;
}
