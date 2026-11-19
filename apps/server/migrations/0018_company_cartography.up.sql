-- Frozen region map editions are shared; grants and explored field knowledge
-- remain isolated by world and company.
create table world_map_editions (
  map_id text not null check (length(map_id) between 1 and 128),
  edition text not null check (length(edition) between 1 and 128),
  region_id text not null check (length(region_id) between 1 and 128),
  grid_edition text not null check (length(grid_edition) between 1 and 128),
  grid_columns integer not null check (grid_columns > 0),
  grid_rows integer not null check (grid_rows > 0),
  origin_x_q numeric(128, 0) not null,
  origin_z_q numeric(128, 0) not null,
  cell_size_fp numeric(128, 0) not null check (cell_size_fp > 0),
  coverage_snapshot bytea not null check (
    octet_length(coverage_snapshot) = (grid_columns::bigint * grid_rows + 7) / 8
  ),
  site_snapshot jsonb not null check (jsonb_typeof(site_snapshot) = 'array'),
  created_at timestamptz not null default now(),
  primary key (map_id, edition)
);

create table company_map_grants (
  world_id text not null,
  company_id text not null,
  source_ref text not null check (length(source_ref) between 1 and 256),
  map_id text not null,
  edition text not null,
  source_kind text not null check (source_kind in ('HOME', 'MAP_PURCHASE', 'QUEST_MARKER')),
  receipt_id text,
  granted_at timestamptz not null,
  primary key (world_id, company_id, source_ref),
  unique (world_id, company_id, receipt_id),
  foreign key (world_id, company_id)
    references company_snapshots (world_id, company_id),
  foreign key (map_id, edition)
    references world_map_editions (map_id, edition),
  foreign key (world_id, company_id, receipt_id)
    references company_receipts (world_id, company_id, receipt_id),
  check ((source_kind = 'MAP_PURCHASE') = (receipt_id is not null))
);

create table company_region_knowledge (
  world_id text not null,
  company_id text not null,
  region_id text not null check (length(region_id) between 1 and 128),
  grid_edition text not null check (length(grid_edition) between 1 and 128),
  grid_columns integer not null check (grid_columns > 0),
  grid_rows integer not null check (grid_rows > 0),
  revision numeric(128, 0) not null default 0 check (revision >= 0),
  cursor_party_id text,
  movement_epoch numeric(128, 0),
  explored_through_ms numeric(128, 0),
  last_x_q numeric(128, 0),
  last_z_q numeric(128, 0),
  primary key (world_id, company_id, region_id, grid_edition),
  foreign key (world_id, company_id)
    references company_snapshots (world_id, company_id),
  check (
    (cursor_party_id is null and movement_epoch is null and explored_through_ms is null
      and last_x_q is null and last_z_q is null)
    or
    (cursor_party_id is not null and movement_epoch is not null and movement_epoch >= 0
      and explored_through_ms is not null and explored_through_ms >= 0
      and last_x_q is not null and last_z_q is not null)
  )
);

create table company_exploration_chunks (
  world_id text not null,
  company_id text not null,
  region_id text not null,
  grid_edition text not null,
  chunk_x integer not null,
  chunk_y integer not null,
  explored_bits bytea not null check (octet_length(explored_bits) = 512),
  primary key (world_id, company_id, region_id, grid_edition, chunk_x, chunk_y),
  foreign key (world_id, company_id, region_id, grid_edition)
    references company_region_knowledge (world_id, company_id, region_id, grid_edition)
);

create table company_place_observations (
  world_id text not null,
  company_id text not null,
  site_id text not null check (length(site_id) between 1 and 128),
  region_id text not null check (length(region_id) between 1 and 128),
  grid_edition text not null check (length(grid_edition) between 1 and 128),
  first_discovered_at timestamptz not null,
  last_observed_at timestamptz not null,
  first_visited_at timestamptz,
  last_visited_at timestamptz,
  known_snapshot jsonb not null check (jsonb_typeof(known_snapshot) = 'object'),
  source_kind text not null check (source_kind in ('SIGHTING', 'VISIT')),
  source_ref text not null check (length(source_ref) between 1 and 256),
  primary key (world_id, company_id, site_id),
  foreign key (world_id, company_id)
    references company_snapshots (world_id, company_id),
  check ((first_visited_at is null) = (last_visited_at is null)),
  check (first_discovered_at <= last_observed_at),
  check (first_visited_at is null or first_visited_at <= last_visited_at),
  check (first_visited_at is null or first_discovered_at <= first_visited_at),
  check (last_visited_at is null or last_visited_at <= last_observed_at)
);
