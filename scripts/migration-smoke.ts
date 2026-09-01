import assert from 'node:assert/strict';
import { Client } from 'pg';

import { runMigrations } from '../apps/server/src/db/migrator.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://warwrit:warwrit@localhost:5432/warwrit';
const client = new Client({ connectionString });

await client.connect();
try {
  const initial = await runMigrations(client, 'status');
  assert.deepEqual(initial.applied, []);
  assert.deepEqual(initial.pending, ['0001_foundation']);

  const firstUp = await runMigrations(client, 'up');
  assert.deepEqual(firstUp.applied, ['0001_foundation']);

  const secondUp = await runMigrations(client, 'up');
  assert.deepEqual(secondUp.applied, []);

  const afterUp = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterUp.rows[0]?.table_name, 'engineering_schema_probe');

  const firstDown = await runMigrations(client, 'down');
  assert.deepEqual(firstDown.applied, ['0001_foundation']);

  const secondDown = await runMigrations(client, 'down');
  assert.deepEqual(secondDown.applied, []);

  const afterDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterDown.rows[0]?.table_name, null);

  process.stdout.write(`${JSON.stringify({ event: 'migration.smoke', status: 'ok' })}\n`);
} finally {
  await client.end();
}
