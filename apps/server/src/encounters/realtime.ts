import { matchMaker, Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { EncounterRoomTicketDto } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';

import type { DatabaseSchema } from '../db/database.js';
import { createEncounterRoomClass, refreshEncounterRoomProjections } from './room.js';
import { startEncounterAiWorker, type EncounterAiWorker } from './ai-worker.js';

export interface EncounterRealtime {
  onCommandCommitted(encounterId: string): Promise<void>;
  issueRoomTicket(
    encounterId: string,
    cookieHeader: string | undefined,
    ip: string,
  ): Promise<EncounterRoomTicketDto>;
}

export function registerEncounterRealtime(
  app: FastifyInstance,
  database: Kysely<DatabaseSchema>,
  options: { readonly host: string; readonly port: number },
): EncounterRealtime {
  const transport = new WebSocketTransport();
  const server = new Server({ transport, gracefullyShutdown: false, greet: false });
  server.define('encounter', createEncounterRoomClass(database)).filterBy(['encounterId']);
  let aiWorker: EncounterAiWorker | undefined;

  app.addHook('onReady', async () => {
    await server.listen(options.port, options.host);
    aiWorker = startEncounterAiWorker(database, {
      onCommitted: refreshEncounterRoomProjections,
      onError: (error) => {
        app.log.error({ error, event: 'encounter.ai_worker.failed' }, 'Encounter AI worker failed');
      },
    });
  });
  app.addHook('onClose', async () => {
    await aiWorker?.stop();
    await server.gracefullyShutdown(false);
  });

  return {
    onCommandCommitted: refreshEncounterRoomProjections,
    async issueRoomTicket(encounterId, cookieHeader, ip) {
      const headers = new Headers();
      if (cookieHeader !== undefined) headers.set('cookie', cookieHeader);
      const reservation = await matchMaker.joinOrCreate(
        'encounter',
        { encounterId },
        { headers, ip },
      );
      return {
        name: reservation.name,
        sessionId: reservation.sessionId,
        roomId: reservation.roomId,
        ...(reservation.processId === undefined ? {} : { processId: reservation.processId }),
        ...(reservation.publicAddress === undefined
          ? {}
          : { publicAddress: reservation.publicAddress }),
        ...(reservation.reconnectionToken === undefined
          ? {}
          : { reconnectionToken: reservation.reconnectionToken }),
        ...(reservation.devMode === undefined ? {} : { devMode: reservation.devMode }),
      };
    },
  };
}
