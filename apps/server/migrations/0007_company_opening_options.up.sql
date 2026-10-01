create table company_opening_options (
  id uuid primary key,
  world_id text not null,
  account_id uuid not null references identity_accounts(id),
  company_id text not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_command_id text,
  consumed_request_key text,
  check ((consumed_at is null) = (consumed_command_id is null)),
  check ((consumed_at is null) = (consumed_request_key is null)),
  unique (world_id, account_id, id)
);

create index company_opening_options_account_expiry_idx
  on company_opening_options (world_id, account_id, expires_at);
