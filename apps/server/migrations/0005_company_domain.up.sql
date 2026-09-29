create table company_snapshots (
  world_id text not null,
  company_id text not null,
  schema_version integer not null check (schema_version = 1),
  ruleset_id text not null,
  catalogue_version text not null,
  command_schema_version integer not null check (command_schema_version = 2),
  public_revision text not null check (public_revision ~ '^(0|[1-9][0-9]*)$'),
  canonical_revision text not null check (canonical_revision ~ '^(0|[1-9][0-9]*)$'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (world_id, company_id)
);

create table company_receipts (
  world_id text not null,
  company_id text not null,
  receipt_id text not null,
  command_id text not null,
  source_key text,
  request_key text not null,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  resulting_revision text not null check (resulting_revision ~ '^(0|[1-9][0-9]*)$'),
  created_at timestamptz not null default now(),
  primary key (world_id, company_id, receipt_id),
  unique (world_id, company_id, command_id),
  unique (world_id, company_id, source_key),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);

create table company_audit_events (
  sequence bigserial primary key,
  world_id text not null,
  company_id text not null,
  revision text not null check (revision ~ '^(0|[1-9][0-9]*)$'),
  event_id text not null,
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  created_at timestamptz not null default now(),
  unique (world_id, company_id, event_id),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);

create index company_audit_events_scope_order_idx
  on company_audit_events (world_id, company_id, sequence);
