import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  canonicalJson,
  companySourceKey,
  parseCompanyCommand,
  prepareConsumeCombatAggregate,
} from '@warwrit/game-core';
import { command } from '../packages/testkit/src/company-economy-fixture.js';
import { createCompanyCombatAggregateFixture } from '../packages/testkit/src/company-combat-aggregate-fixture.js';
import {
  listCompanyAuditEvents,
  loadCompanyAggregate,
  readCompanyReceipt,
  saveCompanyAggregate,
} from '../apps/server/src/company/repository.js';
import { createDatabase } from '../apps/server/src/db/database.js';

import { runMigrations } from '../apps/server/src/db/migrator.js';

const connectionString =
  process.env['DATABASE_URL'] ?? 'postgres://warwrit:warwrit@localhost:5432/warwrit';
const client = new Client({ connectionString });

await client.connect();
try {
  const initial = await runMigrations(client, 'status');
  assert.deepEqual(initial.applied, []);
  assert.deepEqual(initial.pending, [
    '0001_foundation',
    '0002_identity',
    '0003_encounters',
    '0004_encounter_runtime',
    '0005_company_domain',
  ]);

  const firstUp = await runMigrations(client, 'up');
  assert.deepEqual(firstUp.applied, [
    '0001_foundation',
    '0002_identity',
    '0003_encounters',
    '0004_encounter_runtime',
    '0005_company_domain',
  ]);

  const secondUp = await runMigrations(client, 'up');
  assert.deepEqual(secondUp.applied, []);

  const afterUp = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterUp.rows[0]?.table_name, 'engineering_schema_probe');

  const companyTables = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('company_snapshots', 'company_receipts', 'company_audit_events') order by table_name",
  );
  assert.deepEqual(
    companyTables.rows.map(({ table_name }) => table_name),
    ['company_audit_events', 'company_receipts', 'company_snapshots'],
  );

  const aggregateFixture = createCompanyCombatAggregateFixture();
  const active = prepareConsumeCombatAggregate(aggregateFixture.begun.next, {
    journal: aggregateFixture.journal,
    applications: aggregateFixture.applications,
    practiceProfile: aggregateFixture.practiceProfile,
  });
  if (active.kind !== 'PREPARED') throw new Error(active.error);
  const company = active.next;
  const commandValue = command(
    company.economy,
    'AdvanceCampaign',
    { toTick: company.economy.lifecycle.campaignTick, authoritativeInputs: [] },
    'company-storage-roundtrip-command',
    'SYSTEM',
  );
  const parsed = parseCompanyCommand(commandValue);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('Expected a valid storage roundtrip command');
  const requestKey = canonicalJson(parsed.command);
  const receiptId = 'company-storage-roundtrip-receipt';
  const database = createDatabase(connectionString);
  try {
    await database.transaction().execute(async (transaction) => {
      const foreignCommand = { ...parsed.command, companyId: 'foreign-company' };
      await assert.rejects(
        saveCompanyAggregate(transaction, company, {
          receipt: {
            receiptId,
            commandId: foreignCommand.commandId,
            sourceKey: companySourceKey(foreignCommand),
            requestKey: canonicalJson(foreignCommand),
            response: { kind: 'PREPARED' },
            resultingRevision: company.economy.lifecycle.revision,
          },
          command: foreignCommand,
          auditEvents: [],
        }),
        TypeError,
      );

      const saved = await saveCompanyAggregate(transaction, company, {
        receipt: {
          receiptId,
          commandId: parsed.command.commandId,
          sourceKey: companySourceKey(parsed.command),
          requestKey,
          response: { kind: 'PREPARED', resultingRevision: company.economy.lifecycle.revision },
          resultingRevision: company.economy.lifecycle.revision,
        },
        command: parsed.command,
        auditEvents: [
          {
            eventId: 'company-storage-roundtrip-event-0',
            revision: company.economy.lifecycle.revision,
            event: { type: 'company.snapshot.saved' },
          },
          {
            eventId: 'company-storage-roundtrip-event-1',
            revision: company.economy.lifecycle.revision,
            event: { type: 'company.snapshot.saved' },
          },
        ],
      });
      assert.deepEqual(saved, company);
    });
  } finally {
    await database.destroy();
  }

  // Read committed storage through a new pool so this proves cross-connection durability.
  const readbackDatabase = createDatabase(connectionString);
  try {
    await readbackDatabase.transaction().execute(async (transaction) => {
      assert.deepEqual(
        await loadCompanyAggregate(
          transaction,
          company.economy.lifecycle.worldId,
          company.economy.lifecycle.companyId,
        ),
        company,
      );
      assert.deepEqual(
        await readCompanyReceipt(
          transaction,
          company.economy.lifecycle.worldId,
          company.economy.lifecycle.companyId,
          receiptId,
        ),
        {
          receiptId,
          commandId: parsed.command.commandId,
          sourceKey: companySourceKey(parsed.command),
          requestKey,
          response: { kind: 'PREPARED', resultingRevision: company.economy.lifecycle.revision },
          resultingRevision: company.economy.lifecycle.revision,
        },
      );
      assert.deepEqual(
        await listCompanyAuditEvents(
          transaction,
          company.economy.lifecycle.worldId,
          company.economy.lifecycle.companyId,
        ),
        [
          {
            eventId: 'company-storage-roundtrip-event-0',
            revision: company.economy.lifecycle.revision,
            event: { type: 'company.snapshot.saved' },
          },
          {
            eventId: 'company-storage-roundtrip-event-1',
            revision: company.economy.lifecycle.revision,
            event: { type: 'company.snapshot.saved' },
          },
        ],
      );
    });

    const originalWorldId = company.economy.lifecycle.worldId;
    const originalCompanyId = company.economy.lifecycle.companyId;
    const original = await client.query<{
      state: unknown;
      ruleset_id: string;
      public_revision: string;
      canonical_revision: string;
    }>(
      'select state, ruleset_id, public_revision, canonical_revision from company_snapshots where world_id = $1 and company_id = $2',
      [originalWorldId, originalCompanyId],
    );
    const originalRow = original.rows[0];
    assert.ok(originalRow);
    const corruptedRows = [
      {
        name: 'unsupported ruleset version',
        sql: 'update company_snapshots set ruleset_id = $1 where world_id = $2 and company_id = $3',
        values: ['future-ruleset', originalWorldId, originalCompanyId],
      },
      {
        name: 'public revision cursor mismatch',
        sql: 'update company_snapshots set public_revision = $1 where world_id = $2 and company_id = $3',
        values: ['999999', originalWorldId, originalCompanyId],
      },
      {
        name: 'canonical revision cursor mismatch',
        sql: 'update company_snapshots set canonical_revision = $1 where world_id = $2 and company_id = $3',
        values: ['999999', originalWorldId, originalCompanyId],
      },
    ] as const;
    for (const row of corruptedRows) {
      await client.query(row.sql, [...row.values]);
      const beforeRead = await client.query(
        'select * from company_snapshots where world_id = $1 and company_id = $2',
        [originalWorldId, originalCompanyId],
      );
      await assert.rejects(
        readbackDatabase
          .transaction()
          .execute((transaction) =>
            loadCompanyAggregate(transaction, originalWorldId, originalCompanyId),
          ),
        TypeError,
        `loader must reject ${row.name}`,
      );
      const afterRead = await client.query(
        'select * from company_snapshots where world_id = $1 and company_id = $2',
        [originalWorldId, originalCompanyId],
      );
      assert.deepEqual(
        afterRead.rows,
        beforeRead.rows,
        `${row.name} read must not rewrite the row`,
      );
      await client.query(
        'update company_snapshots set state = $1::jsonb, ruleset_id = $2, public_revision = $3, canonical_revision = $4 where world_id = $5 and company_id = $6',
        [
          JSON.stringify(originalRow.state),
          originalRow.ruleset_id,
          originalRow.public_revision,
          originalRow.canonical_revision,
          originalWorldId,
          originalCompanyId,
        ],
      );
    }

    const foreignWorldId = 'foreign-world';
    await client.query(
      `insert into company_snapshots
        (world_id, company_id, schema_version, ruleset_id, catalogue_version,
         command_schema_version, public_revision, canonical_revision, state)
       select $1, company_id, schema_version, ruleset_id, catalogue_version,
              command_schema_version, public_revision, canonical_revision, state
       from company_snapshots where world_id = $2 and company_id = $3`,
      [foreignWorldId, originalWorldId, originalCompanyId],
    );
    const foreignScopeBeforeRead = await client.query(
      'select * from company_snapshots where world_id = $1 and company_id = $2',
      [foreignWorldId, originalCompanyId],
    );
    await assert.rejects(
      readbackDatabase
        .transaction()
        .execute((transaction) =>
          loadCompanyAggregate(transaction, foreignWorldId, originalCompanyId),
        ),
      {
        name: 'TypeError',
        message: 'Company snapshot scope does not match its root',
      },
    );
    const foreignScopeAfterRead = await client.query(
      'select * from company_snapshots where world_id = $1 and company_id = $2',
      [foreignWorldId, originalCompanyId],
    );
    assert.deepEqual(foreignScopeAfterRead.rows, foreignScopeBeforeRead.rows);
    await client.query('delete from company_snapshots where world_id = $1 and company_id = $2', [
      foreignWorldId,
      originalCompanyId,
    ]);
  } finally {
    await readbackDatabase.destroy();
  }

  const companyDown = await runMigrations(client, 'down');
  assert.deepEqual(companyDown.applied, ['0005_company_domain']);
  const preservedEncounterTable = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.encounters')::text as table_name",
  );
  assert.equal(preservedEncounterTable.rows[0]?.table_name, 'encounters');

  const runtimeDown = await runMigrations(client, 'down');
  assert.deepEqual(runtimeDown.applied, ['0004_encounter_runtime']);
  const legacyEncounterId = '00000000-0000-4000-8000-000000000004';
  await client.query(
    `insert into encounters
      (id, world_id, schema_version, setup, state, revision, status,
       activation_id, activation_epoch, deadline_at)
     values ($1, 'migration-smoke', 1, '{}'::json, '{}'::json, 0, 'resolved', null, 0, now())`,
    [legacyEncounterId],
  );
  const upgradeWithResolvedEncounter = await runMigrations(client, 'up');
  assert.deepEqual(upgradeWithResolvedEncounter.applied, [
    '0004_encounter_runtime',
    '0005_company_domain',
  ]);
  const preservedLegacyEncounter = await client.query<{
    readonly status: string;
    readonly deadline_at: Date;
    readonly ai_wake_at: Date | null;
  }>('select status, deadline_at, ai_wake_at from encounters where id = $1', [legacyEncounterId]);
  const legacyEncounter = preservedLegacyEncounter.rows[0];
  assert.ok(legacyEncounter !== undefined);
  assert.equal(legacyEncounter.status, 'resolved');
  assert.ok(legacyEncounter.deadline_at instanceof Date);
  assert.equal(legacyEncounter.ai_wake_at, null);

  const identityTables = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('identity_accounts', 'identity_sessions', 'identity_oidc_flows') order by table_name",
  );
  assert.deepEqual(
    identityTables.rows.map(({ table_name }) => table_name),
    ['identity_accounts', 'identity_oidc_flows', 'identity_sessions'],
  );

  const encounterTables = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('encounters', 'encounter_ai_controllers', 'encounter_participants', 'encounter_commands', 'encounter_events', 'encounter_receipts') order by table_name",
  );
  assert.deepEqual(
    encounterTables.rows.map(({ table_name }) => table_name),
    [
      'encounter_ai_controllers',
      'encounter_commands',
      'encounter_events',
      'encounter_participants',
      'encounter_receipts',
      'encounters',
    ],
  );

  const firstDown = await runMigrations(client, 'down');
  assert.deepEqual(firstDown.applied, ['0005_company_domain']);
  const afterCompanyDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.encounters')::text as table_name",
  );
  assert.equal(afterCompanyDown.rows[0]?.table_name, 'encounters');
  const secondDown = await runMigrations(client, 'down');
  assert.deepEqual(secondDown.applied, ['0004_encounter_runtime']);
  const afterRuntimeDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.encounters')::text as table_name",
  );
  assert.equal(afterRuntimeDown.rows[0]?.table_name, 'encounters');
  const thirdDown = await runMigrations(client, 'down');
  assert.deepEqual(thirdDown.applied, ['0003_encounters']);
  const afterEncounterDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.encounters')::text as table_name",
  );
  assert.equal(afterEncounterDown.rows[0]?.table_name, null);
  const fourthDown = await runMigrations(client, 'down');
  assert.deepEqual(fourthDown.applied, ['0002_identity']);
  const afterIdentityDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.identity_accounts')::text as table_name",
  );
  assert.equal(afterIdentityDown.rows[0]?.table_name, null);

  const fifthDown = await runMigrations(client, 'down');
  assert.deepEqual(fifthDown.applied, ['0001_foundation']);

  const sixthDown = await runMigrations(client, 'down');
  assert.deepEqual(sixthDown.applied, []);

  const afterDown = await client.query<{ table_name: string | null }>(
    "select to_regclass('public.engineering_schema_probe')::text as table_name",
  );
  assert.equal(afterDown.rows[0]?.table_name, null);

  process.stdout.write(`${JSON.stringify({ event: 'migration.smoke', status: 'ok' })}\n`);
} finally {
  await client.end();
}
