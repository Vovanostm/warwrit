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
  readonly admission_source: 'fixture' | 'company_binding';
  readonly afk: Generated<boolean>;
  readonly resume_requested_after_epoch: Generated<number | null>;
}

interface EncounterCommandTable {
  readonly encounter_id: string;
  readonly revision: number;
  readonly command_id: string;
  readonly account_id: string | null;
  readonly source_kind: Generated<'account' | 'system_ai'>;
  readonly activation_policy_id: Generated<string | null>;
  readonly campaign_tick: Generated<string | null>;
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
  readonly activation_policy_id: Generated<string | null>;
  readonly body_digest: Buffer;
  readonly response: unknown;
  readonly resulting_revision: number;
}

interface CompanySnapshotTable {
  readonly world_id: string;
  readonly company_id: string;
  readonly schema_version: number;
  readonly ruleset_id: string;
  readonly catalogue_version: string;
  readonly command_schema_version: number;
  readonly public_revision: string;
  readonly canonical_revision: string;
  readonly state: unknown;
  readonly updated_at: Generated<Date>;
}

interface CompanyReceiptTable {
  readonly world_id: string;
  readonly company_id: string;
  readonly receipt_id: string;
  readonly command_id: string;
  readonly source_key: string | null;
  readonly request_key: string;
  readonly response: unknown;
  readonly resulting_revision: string;
  readonly created_at: Generated<Date>;
}

interface CompanyAuditEventTable {
  readonly sequence: Generated<number>;
  readonly world_id: string;
  readonly company_id: string;
  readonly revision: string;
  readonly event_id: string;
  readonly event: unknown;
  readonly created_at: Generated<Date>;
}

interface CompanyAccountOwnerTable {
  readonly world_id: string;
  readonly account_id: string;
  readonly company_id: string;
  readonly created_at: Generated<Date>;
}

interface CompanyOpeningOptionTable {
  readonly id: string;
  readonly world_id: string;
  readonly account_id: string;
  readonly company_id: string;
  readonly evidence: unknown;
  readonly created_at: Generated<Date>;
  readonly expires_at: Date;
  readonly consumed_at: Generated<Date | null>;
  readonly consumed_command_id: Generated<string | null>;
  readonly consumed_request_key: Generated<string | null>;
}

interface WorldCampaignClockTable {
  readonly world_id: string;
  readonly epoch_ms: string;
  readonly starting_tick: string;
  readonly updated_at: Generated<Date>;
}

interface WorldPartyRouteTable {
  readonly world_id: string;
  readonly company_id: string;
  readonly party_id: string;
  readonly route_epoch: string;
  readonly segment_id: string;
  readonly profile_id: string;
  readonly region_version: string;
  readonly status: 'IN_TRANSIT' | 'ARRIVED';
  readonly accepted_route: unknown;
  readonly updated_at: Generated<Date>;
}

interface WorldRouteReceiptTable {
  readonly world_id: string;
  readonly company_id: string;
  readonly command_id: string;
  readonly account_id: string;
  readonly request_key: string;
  readonly response: unknown;
  readonly resulting_public_revision: string;
  readonly created_at: Generated<Date>;
}

interface WorldFirstHuntStateTable {
  readonly world_id: string;
  readonly schema_version: number;
  readonly profile_id: string;
  readonly genesis_source_id: string;
  readonly revision: string;
  readonly seed: string;
  readonly issuer_id: string;
  readonly issuer_area_id: string;
  readonly wallet_id: string;
  readonly wallet_q: string;
  readonly hostiles: unknown;
}

interface ContractInstanceTable {
  readonly world_id: string;
  readonly instance_id: string;
  readonly profile_id: string;
  readonly terms: unknown;
  readonly terms_digest: Buffer;
  readonly revision: string;
  readonly owner_company_id: string | null;
  readonly helper_company_id: string | null;
  readonly owner_join: unknown | null;
  readonly helper_join: unknown | null;
}

interface EncounterAdmissionTable {
  readonly encounter_id: string;
  readonly world_id: string;
  readonly instance_id: string;
  readonly binding_version: number;
  readonly binding: unknown;
  readonly terminal_revision: number | null;
  readonly effects_source_id: string | null;
  readonly effects_applied_at: Generated<Date | null>;
}

interface WorldProofClaimTable {
  readonly world_id: string;
  readonly item_id: string;
  readonly source_id: string;
  readonly encounter_id: string;
  readonly terminal_revision: number;
  readonly ground_item: unknown | null;
  readonly custodian_company_id: string | null;
  readonly redeemed_company_id: string | null;
  readonly redemption_receipt_id: string | null;
}

interface EncounterActivationPolicyTable {
  readonly encounter_id: string;
  readonly activation_id: string;
  readonly activation_epoch: number;
  readonly account_id: string;
  readonly unit_id: string;
  readonly policy_version: string;
  readonly mode: 'HUMAN' | 'AFK';
  readonly started_at: Date;
  readonly deadline_at: Date;
  readonly campaign_tick: string;
  readonly timeout_command_id: string;
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
    readonly admission_source: 'fixture' | 'world_hostile';
    readonly assigned_at: Generated<Date>;
  };
  readonly company_snapshots: CompanySnapshotTable;
  readonly company_receipts: CompanyReceiptTable;
  readonly company_audit_events: CompanyAuditEventTable;
  readonly company_account_owners: CompanyAccountOwnerTable;
  readonly company_opening_options: CompanyOpeningOptionTable;
  readonly world_campaign_clocks: WorldCampaignClockTable;
  readonly world_party_routes: WorldPartyRouteTable;
  readonly world_route_receipts: WorldRouteReceiptTable;
  readonly world_first_hunt_state: WorldFirstHuntStateTable;
  readonly contract_instances: ContractInstanceTable;
  readonly encounter_admissions: EncounterAdmissionTable;
  readonly world_proof_claims: WorldProofClaimTable;
  readonly encounter_activation_policies: EncounterActivationPolicyTable;
  readonly encounter_leadership_choices: {
    readonly world_id: string;
    readonly encounter_id: string;
    readonly company_id: string;
    readonly account_id: string;
    readonly command_id: string;
    readonly candidate_id: string;
    readonly mode: 'PERMANENT' | 'ACTING' | 'REGENCY';
    readonly chosen_at: Generated<Date>;
  };
  readonly ordinary_contracts: {
    readonly world_id: string;
    readonly instance_id: string;
    readonly profile_id: string;
    readonly revision: string;
    readonly wallet_id: string;
    readonly wallet_q: string;
    readonly state: unknown;
  };
  readonly ordinary_contract_receipts: {
    readonly world_id: string;
    readonly company_id: string;
    readonly command_id: string;
    readonly instance_id: string;
    readonly request_key: string;
    readonly response: unknown;
    readonly created_at: Generated<Date>;
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
  companyStorageEnabled = false,
  worldStorageEnabled = false,
  firstHuntStorageEnabled = false,
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
          p.afk, p.resume_requested_after_epoch,
          c.revision, c.command_id, c.account_id, c.source_kind, c.body_digest, c.command,
          c.activation_policy_id, c.campaign_tick,
          v.revision, v.ordinal, v.event_id, v.event,
          r.command_id, r.receipt_id, r.account_id, r.source_kind, r.body_digest, r.response,
          r.resulting_revision, r.activation_policy_id,
          a.encounter_id, a.unit_id, a.doctrine, a.admission_source, a.assigned_at,
          policies.encounter_id, policies.activation_id, policies.activation_epoch,
          policies.account_id, policies.unit_id, policies.policy_version, policies.mode,
          policies.started_at, policies.deadline_at, policies.campaign_tick,
          policies.timeout_command_id
        from encounters as e
        cross join encounter_participants as p
        cross join encounter_commands as c
        cross join encounter_events as v
        cross join encounter_receipts as r
        cross join encounter_ai_controllers as a
        cross join encounter_activation_policies as policies
        limit 0
      `.execute(database);
    }
    if (companyStorageEnabled) {
      await sql`
        select owners.world_id, owners.account_id, owners.company_id,
          snapshots.schema_version, snapshots.ruleset_id, snapshots.catalogue_version,
          snapshots.command_schema_version, snapshots.public_revision,
          snapshots.canonical_revision, snapshots.state
        from company_account_owners as owners
        join company_snapshots as snapshots
          on snapshots.world_id = owners.world_id and snapshots.company_id = owners.company_id
        limit 0
      `.execute(database);
      await sql`
        select id, world_id, account_id, company_id, evidence, created_at, expires_at,
          consumed_at, consumed_command_id, consumed_request_key
        from company_opening_options
        limit 0
      `.execute(database);
      await sql`
        select
          r.world_id, r.company_id, r.receipt_id, r.command_id, r.source_key,
          r.request_key, r.response, r.resulting_revision,
          e.sequence, e.revision, e.event_id, e.event
        from company_receipts as r
        cross join company_audit_events as e
        limit 0
      `.execute(database);
    }
    if (worldStorageEnabled) {
      await sql`
        select world_id, epoch_ms, starting_tick from world_campaign_clocks limit 0
      `.execute(database);
      await sql`
        select world_id, company_id, party_id, route_epoch, segment_id, profile_id,
          region_version, status, accepted_route from world_party_routes limit 0
      `.execute(database);
      await sql`
        select world_id, company_id, command_id, account_id, request_key, response,
          resulting_public_revision from world_route_receipts limit 0
      `.execute(database);
    }
    if (firstHuntStorageEnabled) {
      await sql`
        select
          w.world_id, w.schema_version, w.profile_id, w.genesis_source_id, w.revision,
          w.seed, w.issuer_id, w.issuer_area_id, w.wallet_id, w.wallet_q, w.hostiles,
          c.world_id, c.instance_id, c.profile_id, c.terms, c.terms_digest, c.revision,
          c.owner_company_id, c.helper_company_id, c.owner_join, c.helper_join,
          a.encounter_id, a.world_id, a.instance_id, a.binding_version, a.binding,
          a.terminal_revision, a.effects_source_id, a.effects_applied_at,
          p.world_id, p.item_id, p.source_id, p.encounter_id, p.terminal_revision,
          p.ground_item, p.custodian_company_id, p.redeemed_company_id,
          p.redemption_receipt_id
        from world_first_hunt_state as w
        cross join contract_instances as c
        cross join encounter_admissions as a
        cross join world_proof_claims as p
        limit 0
      `.execute(database);
    }
  };
}
