-- World state of the hunts beyond FIRST HUNT (wolf trail, mill beast): one row per hunt
-- instance with its issuer wallet and persistent hostiles, like world_first_hunt_state.
create table world_hunt_states (
  world_id text not null,
  instance_id text not null,
  schema_version integer not null check (schema_version = 1),
  profile_id text not null,
  genesis_source_id text not null,
  revision bigint not null check (revision >= 0),
  seed bigint not null check (seed between 1 and 4294967295),
  issuer_id text not null,
  issuer_area_id text not null,
  wallet_id text not null,
  wallet_q numeric(30, 0) not null check (wallet_q >= 0),
  hostiles jsonb not null check (jsonb_typeof(hostiles) = 'array'),
  primary key (world_id, instance_id),
  unique (world_id, wallet_id),
  foreign key (world_id, instance_id) references contract_instances (world_id, instance_id)
);
