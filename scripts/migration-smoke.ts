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
  assert.deepEqual(initial.pending, ['0001_foundation', '0002_identity', '0003_encounters']);

  const firstUp = await runMigrations(client, 'up');
  assert.deepEqual(firstUp.applied, ['0001_foundation', '0002_identity', '0003_encounters']);

  const secondUp = await runMigrations(client, 'up');
  assert.deepEqual(secondUp.applied, []);

  const afterUp = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterUp.rows[0]?.table_name, 'engineering_schema_probe');

  const identityTables = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('identity_accounts', 'identity_sessions', 'identity_oidc_flows') order by table_name",
  );
  assert.deepEqual(
    identityTables.rows.map(({ table_name }) => table_name),
    ['identity_accounts', 'identity_oidc_flows', 'identity_sessions'],
  );

  const encounterTables = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('encounters', 'encounter_participants', 'encounter_commands', 'encounter_events', 'encounter_receipts') order by table_name",
  );
  assert.deepEqual(
    encounterTables.rows.map(({ table_name }) => table_name),
    [
      'encounter_commands',
      'encounter_events',
      'encounter_participants',
      'encounter_receipts',
      'encounters',
    ],
  );

  const firstDown = await runMigrations(client, 'down');
  assert.deepEqual(firstDown.applied, ['0003_encounters']);
  const afterEncounterDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.encounters')::text as table_name",
  );
  assert.equal(afterEncounterDown.rows[0]?.table_name, null);
  const secondDown = await runMigrations(client, 'down');
  assert.deepEqual(secondDown.applied, ['0002_identity']);
  const afterIdentityDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.identity_accounts')::text as table_name",
  );
  assert.equal(afterIdentityDown.rows[0]?.table_name, null);

  const thirdDown = await runMigrations(client, 'down');
  assert.deepEqual(thirdDown.applied, ['0001_foundation']);

  const fourthDown = await runMigrations(client, 'down');
  assert.deepEqual(fourthDown.applied, []);

  const afterDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterDown.rows[0]?.table_name, null);

  process.stdout.write(`${JSON.stringify({ event: 'migration.smoke', status: 'ok' })}\n`);
} finally {
  await client.end();
}
