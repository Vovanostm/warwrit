import { PROTOCOL_VERSION, type HealthResponse } from '@warwrit/protocol';
import fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';

import { createLogger } from './logger.js';

export interface BuildAppOptions {
  readonly logger?: FastifyBaseLogger | false;
  readonly readinessProbe?: () => Promise<void>;
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
