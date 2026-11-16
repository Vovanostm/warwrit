-- A world's finite recruit offers own genesis facts until one company hires them.
-- Reads never materialize these people into a company snapshot.
create table world_recruit_offers (
  world_id text not null check (length(world_id) between 1 and 128),
  offer_id text not null check (length(offer_id) between 1 and 128),
  offer_revision numeric(128, 0) not null check (offer_revision >= 0),
  site_id text not null check (length(site_id) between 1 and 128),
  area_id text not null check (length(area_id) between 1 and 128),
  character_id text not null check (length(character_id) between 1 and 128),
  candidate jsonb not null check (jsonb_typeof(candidate) = 'object'),
  vitals jsonb not null check (jsonb_typeof(vitals) = 'object'),
  wallet jsonb not null check (jsonb_typeof(wallet) = 'object'),
  consumed_company_id text,
  consumed_command_id text,
  consumed_at timestamptz,
  primary key (world_id, offer_id),
  unique (world_id, character_id),
  unique (world_id, consumed_company_id, consumed_command_id),
  check ((consumed_company_id is null) = (consumed_command_id is null)),
  check ((consumed_company_id is null) = (consumed_at is null))
);
