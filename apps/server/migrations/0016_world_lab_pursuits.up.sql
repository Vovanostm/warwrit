create table world_lab_pursuits (
  world_id text not null,
  company_id text not null,
  target_id text not null check (length(target_id) between 1 and 128),
  target_name text not null,
  last_point jsonb not null check (jsonb_typeof(last_point) = 'object'),
  status text not null check (status in ('CHASING', 'LAST_SEEN', 'REACHED', 'BLOCKED')),
  movement_epoch numeric(128,0) not null check (movement_epoch >= 0),
  primary key (world_id, company_id),
  foreign key (world_id, company_id) references world_lab_slots(world_id, company_id)
);
