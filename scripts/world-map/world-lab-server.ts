import { Client } from 'pg';
import { buildApp, listenOrClose } from '../../apps/server/src/app.js';
import { createDatabase } from '../../apps/server/src/db/database.js';
import { runMigrations } from '../../apps/server/src/db/migrator.js';
import { registerWorldLab } from '../../apps/server/src/world-lab/index.js';
import { ensureWorldLabSeed } from './world-lab-seed.js';

// Development composition only: fixtures, isolated database and no production routes.
if (process.env['WORLD_LAB'] !== '1' || process.env['NODE_ENV'] === 'production') {
  throw new Error('The shared-world lab requires explicit local development mode');
}
const databaseUrl = process.env['WORLD_LAB_DATABASE_URL'];
if (!databaseUrl) throw new Error('WORLD_LAB_DATABASE_URL is required');
const parsedUrl = new URL(databaseUrl);
if (parsedUrl.hostname !== '127.0.0.1' || parsedUrl.pathname !== '/warwrit_world_lab') {
  throw new Error('World lab requires its own loopback warwrit_world_lab database');
}
const migrations = new Client({ connectionString: databaseUrl });
await migrations.connect();
try {
  await runMigrations(migrations, 'up');
} finally {
  await migrations.end();
}
const database = createDatabase(databaseUrl);
const worldId = 'world.painted-atlas.lab-v1';
const app = buildApp({ closeDatabase: () => database.destroy() });
try {
  const fixtures = await ensureWorldLabSeed(database, worldId);
  const clock = await database
    .selectFrom('world_campaign_clocks')
    .select('epoch_ms')
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  // The lab starts at night; one immutable epoch drives the shared test clock.
  // All observers, movement and NPC decisions use the same eightfold time.
  const realOrigin = Number(clock.epoch_ms) + 600_000;
  const now = () => new Date(realOrigin + Math.max(0, Date.now() - realOrigin) * 8);
  registerWorldLab(app, {
    database,
    worldId,
    host: '127.0.0.1',
    port: 3038,
    realtimePort: 3039,
    publicOrigin: 'http://127.0.0.1:5338',
    fixtures,
    now,
    timeScale: 8,
  });
  await listenOrClose(app, { host: '127.0.0.1', port: 3038 });
} catch (error) {
  await app.close();
  throw error;
}
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    void app.close().catch((error: unknown) => {
      app.log.error({ err: error }, 'Shared-world lab shutdown failed');
      process.exitCode = 1;
    });
  });
}
