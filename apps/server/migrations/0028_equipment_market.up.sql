create table settlement_equipment (
  world_id text not null,
  item_id text not null,
  site_id text not null check (site_id = 'kamenny-brod'),
  owner_kind text not null check (owner_kind = 'WORLD'),
  owner_id text not null check (owner_id = world_id),
  source_id text not null,
  acquired_by_company_id text not null,
  item jsonb not null check (
    jsonb_typeof(item) = 'object' and
    item->>'itemId' = item_id and
    item->'owner'->>'kind' = owner_kind and
    item->'owner'->>'id' = owner_id and
    item->'provenance'->>'sourceId' = source_id
  ),
  created_at timestamptz not null default now(),
  primary key (world_id, item_id)
);

create index settlement_equipment_world_source_idx
  on settlement_equipment (world_id, source_id);
