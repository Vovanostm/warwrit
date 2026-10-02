-- Ordinary M1 contracts (investigations and rescues): one row per instance with its
-- issuer wallet and pure-domain state, plus one idempotent receipt per company command.
create table ordinary_contracts (
  world_id text not null,
  instance_id text not null,
  profile_id text not null,
  revision bigint not null check (revision >= 0),
  wallet_id text not null,
  wallet_q numeric(30, 0) not null check (wallet_q >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  primary key (world_id, instance_id),
  unique (world_id, wallet_id)
);

create table ordinary_contract_receipts (
  world_id text not null,
  company_id text not null,
  command_id uuid not null,
  instance_id text not null,
  request_key text not null,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  primary key (world_id, company_id, command_id),
  foreign key (world_id, instance_id) references ordinary_contracts (world_id, instance_id),
  foreign key (world_id, company_id) references company_snapshots (world_id, company_id)
);
