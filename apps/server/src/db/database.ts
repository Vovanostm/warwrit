import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

interface SchemaMigrationsTable {
  readonly name: string;
  readonly applied_at: Date;
}

interface EngineeringSchemaProbeTable {
  readonly id: number;
  readonly installed_at: Date;
}

export interface DatabaseSchema {
  readonly engineering_schema_probe: EngineeringSchemaProbeTable;
  readonly schema_migrations: SchemaMigrationsTable;
}

export function createDatabase(connectionString: string): Kysely<DatabaseSchema> {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 5,
      }),
    }),
  });
}

export function createDatabaseReadinessProbe(
  database: Kysely<DatabaseSchema>,
): () => Promise<void> {
  return async () => {
    await sql`select 1`.execute(database);
  };
}
