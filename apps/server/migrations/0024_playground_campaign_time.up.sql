-- Opt-in QA campaign-time receipts; ordinary Playground remains sandbox-only.
create table playground.campaign_time_receipts (
  owner_id text not null,
  command_id uuid not null,
  world_id text not null,
  ticks integer not null check (ticks in (1, 10, 100, 1000)),
  response jsonb not null,
  primary key (owner_id, command_id)
);
