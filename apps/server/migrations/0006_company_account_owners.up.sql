create table company_account_owners (
  world_id text not null,
  account_id uuid not null references identity_accounts(id),
  company_id text not null,
  created_at timestamptz not null default now(),
  primary key (world_id, account_id),
  unique (world_id, company_id),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);
