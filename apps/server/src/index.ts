import { MAIN_WORLD_ID } from '@warwrit/protocol';

import { buildApp, listenOrClose } from './app.js';
import { loadServerConfig } from './config.js';
import { createDatabase, createDatabaseReadinessProbe } from './db/database.js';
import { startWorldRouteWorker } from './world/route-worker.js';
import { ensureFirstHuntGenesis } from './contracts/first-hunt-runtime.js';

const config = loadServerConfig();
const database = config.databaseUrl === undefined ? undefined : createDatabase(config.databaseUrl);
let databaseClosePromise: Promise<void> | undefined;
const closeDatabase =
  database === undefined
    ? undefined
    : (): Promise<void> => (databaseClosePromise ??= database.destroy());
const app = buildApp({
  ...(closeDatabase === undefined ? {} : { closeDatabase }),
  ...(database === undefined
    ? {}
    : {
        readinessProbe: createDatabaseReadinessProbe(
          database,
          config.identity !== undefined,
          config.identity !== undefined,
          config.identity !== undefined,
          config.identity !== undefined,
          config.identity !== undefined,
        ),
      }),
  ...(config.identity === undefined || database === undefined
    ? {}
    : { identity: { config: config.identity, database } }),
  ...(config.identity === undefined || database === undefined
    ? {}
    : { company: { database, worldId: MAIN_WORLD_ID } }),
  ...(config.combatLabOrigin === undefined
    ? {}
    : {
        combatLab: {
          host: config.host,
          port: config.port,
          origin: config.combatLabOrigin,
        },
      }),
  ...(database === undefined || config.identity === undefined
    ? {}
    : {
        encounters: {
          database,
          ...(config.fixtureEncountersEnabled === true ? { fixtureAdmission: true as const } : {}),
        },
        encounterRealtime: { host: config.host, port: config.encounterRealtimePort },
      }),
});

if (database !== undefined && config.identity !== undefined) {
  try {
    await ensureFirstHuntGenesis(database, MAIN_WORLD_ID);
  } catch (error) {
    await closeDatabase?.();
    throw error;
  }
}

const address = await listenOrClose(app, {
  host: config.host,
  port: config.port,
});
const stopWorldRouteWorker =
  database === undefined || config.identity === undefined
    ? undefined
    : startWorldRouteWorker(database, MAIN_WORLD_ID, (error) => {
        app.log.error({ error, event: 'world.route_worker.failed' }, 'World route worker failed');
      });
app.log.info(
  {
    address,
    event: 'server.listening',
    worldId: MAIN_WORLD_ID,
  },
  'Warwrit server is listening',
);

let closing = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (closing) {
    return;
  }
  closing = true;
  app.log.info({ event: 'server.shutdown', signal }, 'Stopping Warwrit server');
  await stopWorldRouteWorker?.();
  await app.close();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}
