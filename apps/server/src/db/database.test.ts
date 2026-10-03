import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  sql,
} from 'kysely';
import { describe, expect, it, vi } from 'vitest';
import { buildApp, listenOrClose } from '../app.js';
import type { DatabaseSchema } from './database.js';
import { createDatabaseReadinessProbe } from './database.js';

function createRecordingDatabase(
  queries: string[],
  lifecycle: string[] = [],
): Kysely<DatabaseSchema> {
  class RecordingDriver extends DummyDriver {
    override async acquireConnection() {
      const connection = await super.acquireConnection();
      return new Proxy(connection, {
        get(target, property, receiver) {
          if (property === 'executeQuery') {
            return async (query: { readonly sql: string }) => {
              queries.push(query.sql);
              return { rows: [] };
            };
          }
          return Reflect.get(target, property, receiver);
        },
      });
    }

    override async destroy(): Promise<void> {
      lifecycle.push('database.destroy');
      await super.destroy();
    }
  }

  return new Kysely<DatabaseSchema>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new RecordingDriver(),
      createIntrospector: (database) => new PostgresIntrospector(database),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}

describe('database readiness dependencies', () => {
  it('probes persisted encounter activation and FIRST HUNT state before reporting ready', async () => {
    const queries: string[] = [];
    const database = createRecordingDatabase(queries);
    try {
      await createDatabaseReadinessProbe(database, false, true, true, true, true)();
    } finally {
      await database.destroy();
    }

    const sql = queries.join('\n');
    for (const table of [
      'encounter_activation_policies',
      'company_receipts',
      'company_audit_events',
      'world_first_hunt_state',
      'contract_instances',
      'encounter_admissions',
      'world_proof_claims',
    ]) {
      expect(sql).toContain(table);
    }
    for (const column of [
      'resume_requested_after_epoch',
      'activation_policy_id',
      'campaign_tick',
      'effects_applied_at',
      'redemption_receipt_id',
    ]) {
      expect(sql).toContain(column);
    }
  });

  it('closes after a listen failure, keeping the database available to earlier shutdown hooks', async () => {
    const queries: string[] = [];
    const lifecycle: string[] = [];
    const database = createRecordingDatabase(queries, lifecycle);
    const app = buildApp({
      logger: false,
      closeDatabase: async () => database.destroy(),
    });
    const listenError = new Error('listen failed');
    app.addHook('onClose', async () => {
      await sql`select 1`.execute(database);
      lifecycle.push('encounter.realtime.close');
    });
    vi.spyOn(app, 'listen').mockRejectedValue(listenError);

    await expect(listenOrClose(app, { host: '127.0.0.1', port: 0 })).rejects.toBe(listenError);

    expect(lifecycle).toEqual(['encounter.realtime.close', 'database.destroy']);
    expect(queries).toEqual(['select 1']);
  });
});
