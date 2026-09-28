create table encounters (
  id uuid primary key,
  world_id text not null,
  schema_version integer not null check (schema_version > 0),
  setup json not null,
  state json not null,
  revision integer not null check (revision >= 0),
  status text not null check (status in ('active', 'resolved')),
  activation_id text,
  activation_epoch integer not null check (activation_epoch >= 0),
  deadline_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table encounter_participants (
  encounter_id uuid not null references encounters(id),
  account_id uuid not null references identity_accounts(id),
  side_id text not null,
  unit_ids jsonb not null,
  admission_source text not null check (admission_source = 'fixture'),
  primary key (encounter_id, account_id)
);

create table encounter_commands (
  encounter_id uuid not null references encounters(id),
  revision integer not null,
  command_id text not null,
  account_id uuid not null references identity_accounts(id),
  body_digest bytea not null check (octet_length(body_digest) = 32),
  command json not null,
  accepted_at timestamptz not null default now(),
  primary key (encounter_id, revision),
  unique (encounter_id, command_id)
);

create table encounter_events (
  encounter_id uuid not null references encounters(id),
  revision integer not null,
  ordinal integer not null check (ordinal >= 0),
  event_id text not null,
  event json not null,
  primary key (encounter_id, revision, ordinal),
  unique (event_id)
);

create table encounter_receipts (
  encounter_id uuid not null references encounters(id),
  command_id text not null,
  receipt_id text not null,
  account_id uuid not null references identity_accounts(id),
  body_digest bytea not null check (octet_length(body_digest) = 32),
  response jsonb not null,
  resulting_revision integer not null,
  primary key (encounter_id, command_id),
  unique (encounter_id, receipt_id)
);
