import { Kysely, PostgresDialect, sql, type Generated } from 'kysely';
import { Pool } from 'pg';

interface SchemaMigrationsTable {
  readonly name: string;
  readonly applied_at: Date;
}

interface EngineeringSchemaProbeTable {
  readonly id: number;
  readonly installed_at: Date;
}

interface IdentityAccountTable {
  readonly id: string;
  readonly issuer: string;
  readonly subject: string;
  readonly created_at: Generated<Date>;
}

interface IdentitySessionTable {
  readonly token_digest: Buffer;
  readonly account_id: string;
  readonly created_at: Generated<Date>;
  readonly expires_at: Date;
  readonly revoked_at: Generated<Date | null>;
}

interface IdentityOidcFlowTable {
  readonly state_digest: Buffer;
  readonly browser_digest: Buffer;
  readonly code_verifier: string;
  readonly nonce: string;
  readonly created_at: Generated<Date>;
  readonly expires_at: Date;
}

export interface DatabaseSchema {
  readonly engineering_schema_probe: EngineeringSchemaProbeTable;
  readonly schema_migrations: SchemaMigrationsTable;
  readonly identity_accounts: IdentityAccountTable;
  readonly identity_sessions: IdentitySessionTable;
  readonly identity_oidc_flows: IdentityOidcFlowTable;
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
