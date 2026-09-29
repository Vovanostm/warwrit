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

interface EncounterTable {
  readonly id: string;
  readonly world_id: string;
  readonly schema_version: number;
  readonly setup: unknown;
  readonly state: unknown;
  readonly revision: number;
  readonly status: 'active' | 'resolved';
  readonly activation_id: string | null;
  readonly activation_epoch: number;
  readonly deadline_at: Generated<Date | null>;
  readonly ai_wake_at: Generated<Date | null>;
  readonly created_at: Generated<Date>;
}

interface EncounterParticipantTable {
  readonly encounter_id: string;
  readonly account_id: string;
  readonly side_id: string;
  readonly unit_ids: unknown;
  readonly admission_source: 'fixture';
}

interface EncounterCommandTable {
  readonly encounter_id: string;
  readonly revision: number;
  readonly command_id: string;
  readonly account_id: string | null;
  readonly source_kind: Generated<'account' | 'system_ai'>;
  readonly body_digest: Buffer;
  readonly command: unknown;
  readonly accepted_at: Generated<Date>;
}

interface EncounterEventTable {
  readonly encounter_id: string;
  readonly revision: number;
  readonly ordinal: number;
  readonly event_id: string;
  readonly event: unknown;
}

interface EncounterReceiptTable {
  readonly encounter_id: string;
  readonly command_id: string;
  readonly receipt_id: string;
  readonly account_id: string | null;
  readonly source_kind: Generated<'account' | 'system_ai'>;
  readonly body_digest: Buffer;
  readonly response: unknown;
  readonly resulting_revision: number;
}

export interface DatabaseSchema {
  readonly engineering_schema_probe: EngineeringSchemaProbeTable;
  readonly schema_migrations: SchemaMigrationsTable;
  readonly identity_accounts: IdentityAccountTable;
  readonly identity_sessions: IdentitySessionTable;
  readonly identity_oidc_flows: IdentityOidcFlowTable;
  readonly encounters: EncounterTable;
  readonly encounter_participants: EncounterParticipantTable;
  readonly encounter_commands: EncounterCommandTable;
  readonly encounter_events: EncounterEventTable;
  readonly encounter_receipts: EncounterReceiptTable;
  readonly encounter_ai_controllers: {
    readonly encounter_id: string;
    readonly unit_id: string;
    readonly doctrine: 'aggressive' | 'survivor';
    readonly admission_source: 'fixture';
    readonly assigned_at: Generated<Date>;
  };
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
  identityEnabled = false,
  encounterFixturesEnabled = false,
): () => Promise<void> {
  return async () => {
    if (!identityEnabled) {
      await sql`select 1`.execute(database);
    } else {
      await sql`
        select
          accounts.id,
          accounts.issuer,
          accounts.subject,
          accounts.created_at,
          sessions.token_digest,
          sessions.account_id,
          sessions.created_at,
          sessions.expires_at,
          sessions.revoked_at,
          flows.state_digest,
          flows.browser_digest,
          flows.code_verifier,
          flows.nonce,
          flows.created_at,
          flows.expires_at
        from identity_accounts as accounts
        cross join identity_sessions as sessions
        cross join identity_oidc_flows as flows
        limit 0
      `.execute(database);
    }
    if (encounterFixturesEnabled) {
      await sql`
        select
          e.id, e.world_id, e.schema_version, e.setup, e.state, e.revision, e.status,
          e.activation_id, e.activation_epoch, e.deadline_at,
          e.ai_wake_at,
          p.encounter_id, p.account_id, p.side_id, p.unit_ids, p.admission_source,
          c.revision, c.command_id, c.account_id, c.source_kind, c.body_digest, c.command,
          v.revision, v.ordinal, v.event_id, v.event,
          r.command_id, r.receipt_id, r.account_id, r.source_kind, r.body_digest, r.response,
          r.resulting_revision,
          a.encounter_id, a.unit_id, a.doctrine, a.admission_source, a.assigned_at
        from encounters as e
        cross join encounter_participants as p
        cross join encounter_commands as c
        cross join encounter_events as v
        cross join encounter_receipts as r
        cross join encounter_ai_controllers as a
        limit 0
      `.execute(database);
    }
  };
}
