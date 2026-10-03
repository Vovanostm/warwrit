do $$
begin
  if to_regclass('public.world_campaign_clocks_0008_backup') is not null then
    alter table public.world_campaign_clocks_0008_backup rename to world_campaign_clocks;
  else
    create table public.world_campaign_clocks (
      world_id text primary key,
      epoch_ms text not null check (epoch_ms ~ '^(0|[1-9][0-9]*)$'),
      starting_tick text not null check (starting_tick ~ '^(0|[1-9][0-9]*)$'),
      updated_at timestamptz not null default now()
    );

    insert into public.world_campaign_clocks (world_id, epoch_ms, starting_tick)
    values (
      'main',
      floor(extract(epoch from clock_timestamp()) * 1000)::numeric(40, 0)::text,
      '0'
    );
  end if;
end;
$$;

create table world_party_routes (
  world_id text not null,
  company_id text not null,
  party_id text not null,
  route_epoch text not null check (route_epoch ~ '^(0|[1-9][0-9]*)$'),
  segment_id text not null,
  profile_id text not null,
  region_version text not null,
  status text not null check (status in ('IN_TRANSIT', 'ARRIVED')),
  accepted_route jsonb not null check (jsonb_typeof(accepted_route) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (world_id, company_id, party_id),
  unique (world_id, company_id, segment_id),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);

create table world_route_receipts (
  world_id text not null,
  company_id text not null,
  command_id text not null,
  account_id uuid not null references identity_accounts(id),
  request_key text not null,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  resulting_public_revision text not null check (resulting_public_revision ~ '^(0|[1-9][0-9]*)$'),
  created_at timestamptz not null default now(),
  primary key (world_id, company_id, command_id),
  foreign key (world_id, company_id) references company_snapshots(world_id, company_id)
);
