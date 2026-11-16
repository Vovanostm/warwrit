-- Isolated developer metadata only. No FK/ID targets canonical game entities.
create schema playground;
create table playground.sandboxes (
  id uuid primary key,
  owner_id text not null,
  revision integer not null check (revision >= 0),
  status text not null check (status in ('draft', 'validated', 'active', 'deleted')),
  scenario jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index playground_sandboxes_owner on playground.sandboxes (owner_id);
create index playground_sandboxes_expiry on playground.sandboxes (expires_at);
create table playground.receipts (
  owner_id text not null,
  command_id uuid not null,
  sandbox_id uuid not null references playground.sandboxes(id) on delete cascade,
  request jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, command_id)
);
