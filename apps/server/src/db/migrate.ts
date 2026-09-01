import { Client } from 'pg';

import { runMigrations, type MigrationDirection } from './migrator.js';

function parseDirection(value: string | undefined): MigrationDirection {
  if (value === 'up' || value === 'down' || value === 'status') {
    return value;
  }
  throw new Error('Usage: migrate.ts <up|down|status>');
}

const direction = parseDirection(process.argv[2]);
const connectionString =
  process.env['DATABASE_URL'] ?? 'postgres://warwrit:warwrit@localhost:5432/warwrit';
const client = new Client({ connectionString });

await client.connect();
try {
  const result = await runMigrations(client, direction);
  process.stdout.write(
    `${JSON.stringify({ event: 'database.migration', status: 'ok', ...result })}\n`,
  );
} finally {
  await client.end();
}
