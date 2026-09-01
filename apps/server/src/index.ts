import { MAIN_WORLD_ID } from '@warwrit/protocol';

import { buildApp } from './app.js';
import { loadServerConfig } from './config.js';
import { createDatabase, createDatabaseReadinessProbe } from './db/database.js';

const config = loadServerConfig();
const database = config.databaseUrl === undefined ? undefined : createDatabase(config.databaseUrl);
const app =
  database === undefined
    ? buildApp()
    : buildApp({
        readinessProbe: createDatabaseReadinessProbe(database),
      });

if (database !== undefined) {
  app.addHook('onClose', async () => {
    await database.destroy();
  });
}

const address = await app.listen({
  host: config.host,
  port: config.port,
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
  await app.close();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}
