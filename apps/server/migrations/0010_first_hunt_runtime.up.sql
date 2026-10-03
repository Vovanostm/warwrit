create table world_first_hunt_state (
  world_id text primary key,
  schema_version integer not null check (schema_version = 1),
  profile_id text not null,
  genesis_source_id text not null,
  revision bigint not null check (revision >= 0),
  seed bigint not null check (seed between 1 and 4294967295),
  issuer_id text not null,
  issuer_area_id text not null,
  wallet_id text not null,
  wallet_q numeric(30, 0) not null check (wallet_q >= 0),
  hostiles jsonb not null check (jsonb_typeof(hostiles) = 'array'),
  unique (world_id, genesis_source_id),
  unique (world_id, wallet_id)
);

create table contract_instances (
  world_id text not null,
  instance_id text not null,
  profile_id text not null,
  terms jsonb not null check (jsonb_typeof(terms) = 'object'),
  terms_digest bytea not null check (octet_length(terms_digest) = 32),
  revision bigint not null check (revision >= 0),
  owner_company_id text,
  helper_company_id text,
  owner_join jsonb check (owner_join is null or jsonb_typeof(owner_join) = 'object'),
  helper_join jsonb check (helper_join is null or jsonb_typeof(helper_join) = 'object'),
  primary key (world_id, instance_id),
  foreign key (world_id) references world_first_hunt_state(world_id),
  foreign key (world_id, owner_company_id) references company_snapshots(world_id, company_id),
  foreign key (world_id, helper_company_id) references company_snapshots(world_id, company_id),
  check (helper_company_id is null or owner_company_id is not null),
  check (helper_company_id is null or helper_company_id <> owner_company_id),
  check (owner_join is null or owner_company_id is not null),
  check (helper_join is null or helper_company_id is not null)
);

create table encounter_admissions (
  encounter_id uuid primary key references encounters(id),
  world_id text not null,
  instance_id text not null,
  binding_version integer not null check (binding_version = 2),
  binding jsonb not null check (jsonb_typeof(binding) = 'object'),
  terminal_revision integer check (terminal_revision is null or terminal_revision >= 0),
  effects_source_id text,
  effects_applied_at timestamptz,
  unique (world_id, instance_id),
  unique (world_id, encounter_id),
  foreign key (world_id, instance_id) references contract_instances(world_id, instance_id),
  check (
    (terminal_revision is null and effects_source_id is null and effects_applied_at is null) or
    (
      terminal_revision is not null and
      ((effects_source_id is null and effects_applied_at is null) or
       (effects_source_id is not null and effects_applied_at is not null))
    )
  )
);

create index encounter_admissions_unapplied_terminal_idx
  on encounter_admissions (encounter_id, terminal_revision)
  where terminal_revision is not null and effects_applied_at is null;

create table world_proof_claims (
  world_id text not null,
  item_id text not null,
  source_id text not null,
  encounter_id uuid not null,
  terminal_revision integer not null check (terminal_revision >= 0),
  ground_item jsonb check (ground_item is null or jsonb_typeof(ground_item) = 'object'),
  custodian_company_id text,
  redeemed_company_id text,
  redemption_receipt_id text,
  primary key (world_id, item_id),
  unique (world_id, source_id),
  foreign key (world_id, encounter_id) references encounter_admissions(world_id, encounter_id),
  foreign key (encounter_id, terminal_revision)
    references encounter_commands(encounter_id, revision),
  foreign key (world_id, custodian_company_id)
    references company_snapshots(world_id, company_id),
  foreign key (world_id, redeemed_company_id, redemption_receipt_id)
    references company_receipts(world_id, company_id, receipt_id),
  check ((ground_item is null) <> (custodian_company_id is null)),
  check ((redeemed_company_id is null) = (redemption_receipt_id is null))
);

create table encounter_activation_policies (
  encounter_id uuid not null,
  activation_id text not null,
  activation_epoch integer not null check (activation_epoch >= 0),
  account_id uuid not null,
  unit_id text not null,
  policy_version text not null,
  mode text not null check (mode in ('HUMAN', 'AFK')),
  started_at timestamptz not null,
  deadline_at timestamptz not null check (deadline_at > started_at),
  campaign_tick text not null check (campaign_tick ~ '^(0|[1-9][0-9]*)$'),
  timeout_command_id text not null,
  primary key (encounter_id, activation_id),
  unique (encounter_id, activation_epoch),
  unique (encounter_id, timeout_command_id),
  foreign key (encounter_id, account_id) references encounter_participants(encounter_id, account_id)
);

alter table encounter_participants
  add column afk boolean not null default false,
  add column resume_requested_after_epoch integer check (
    resume_requested_after_epoch is null or resume_requested_after_epoch >= 0
  );

alter table encounter_commands
  drop constraint encounter_commands_source_kind_check,
  add constraint encounter_commands_source_kind_check
    check (source_kind in ('account', 'system_ai', 'system_timeout')),
  drop constraint encounter_commands_source_account_check,
  add constraint encounter_commands_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind in ('system_ai', 'system_timeout') and account_id is null)
  ),
  add column activation_policy_id text,
  add column campaign_tick text check (
    campaign_tick is null or campaign_tick ~ '^(0|[1-9][0-9]*)$'
  );

alter table encounter_receipts
  drop constraint encounter_receipts_source_kind_check,
  add constraint encounter_receipts_source_kind_check
    check (source_kind in ('account', 'system_ai', 'system_timeout')),
  drop constraint encounter_receipts_source_account_check,
  add constraint encounter_receipts_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind in ('system_ai', 'system_timeout') and account_id is null)
  ),
  add column activation_policy_id text;

alter table encounter_commands
  add constraint encounter_commands_activation_policy_fk
    foreign key (encounter_id, activation_policy_id)
    references encounter_activation_policies(encounter_id, activation_id),
  add constraint encounter_commands_timeout_policy_check
    check (source_kind <> 'system_timeout' or activation_policy_id is not null);

alter table encounter_receipts
  add constraint encounter_receipts_activation_policy_fk
    foreign key (encounter_id, activation_policy_id)
    references encounter_activation_policies(encounter_id, activation_id),
  add constraint encounter_receipts_timeout_policy_check
    check (source_kind <> 'system_timeout' or activation_policy_id is not null);
