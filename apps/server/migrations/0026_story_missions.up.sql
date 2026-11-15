alter table ordinary_contract_receipts
  add column simulation_at_ms bigint check (simulation_at_ms >= 0);

create table story_world_states (
  world_id text not null,
  mission_id text not null check (mission_id = 'sm.m1.cache-disclosure.01'),
  definition_version integer not null check (definition_version = 1),
  revision bigint not null check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, mission_id)
);

create table story_company_states (
  world_id text not null,
  mission_id text not null,
  company_id text not null,
  definition_version integer not null check (definition_version = 1),
  revision bigint not null check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, mission_id, company_id),
  foreign key (world_id, mission_id) references story_world_states (world_id, mission_id),
  foreign key (world_id, company_id) references company_snapshots (world_id, company_id)
);

create table story_command_receipts (
  world_id text not null,
  mission_id text not null,
  company_id text not null,
  command_id uuid not null,
  account_id text not null references identity_accounts (id),
  request_key text not null,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  primary key (world_id, mission_id, company_id, command_id),
  foreign key (world_id, mission_id, company_id)
    references story_company_states (world_id, mission_id, company_id)
);
