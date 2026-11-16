create table world_lab_npc_groups (
  world_id text not null,
  group_id text not null,
  kind text not null check (kind in ('PATROL', 'BANDITS', 'WILDLIFE', 'CREATURE')),
  profile_id text not null check (length(profile_id) > 0),
  map_edition text not null check (length(map_edition) > 0),
  home jsonb not null check (jsonb_typeof(home) = 'object'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision numeric(128,0) not null check (revision >= 0),
  next_decision_ms numeric(128,0) not null check (next_decision_ms >= 0),
  updated_at timestamptz not null default now(),
  primary key (world_id, group_id)
);

create index world_lab_npc_groups_due_idx
  on world_lab_npc_groups (world_id, next_decision_ms, group_id);

create table world_lab_slots (
  world_id text not null,
  slot text not null check (slot in ('company-a', 'company-b')),
  account_id uuid not null references identity_accounts(id),
  company_id text not null,
  party_id text not null,
  display_name text not null check (length(display_name) > 0),
  primary key (world_id, slot),
  unique (world_id, account_id),
  unique (world_id, company_id),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);
