-- Same executor storage shapes, isolated data. LIKE copies no foreign keys.
-- No public fallback is permitted by the sandbox executor search_path.
create table playground.encounters (like public.encounters including all);
alter table playground.encounters drop constraint encounters_active_clock_check;
alter table playground.encounters add column sandbox_id uuid not null unique
  references playground.sandboxes(id) on delete cascade;
create table playground.encounter_participants (like public.encounter_participants including all);
create table playground.encounter_commands (like public.encounter_commands including all);
create table playground.encounter_events (like public.encounter_events including all);
create table playground.encounter_receipts (like public.encounter_receipts including all);
create table playground.encounter_ai_controllers (like public.encounter_ai_controllers including all);
alter table playground.encounter_participants add foreign key (encounter_id)
  references playground.encounters(id) on delete cascade;
alter table playground.encounter_commands add foreign key (encounter_id)
  references playground.encounters(id) on delete cascade;
alter table playground.encounter_events add foreign key (encounter_id)
  references playground.encounters(id) on delete cascade;
alter table playground.encounter_receipts add foreign key (encounter_id)
  references playground.encounters(id) on delete cascade;
alter table playground.encounter_ai_controllers add foreign key (encounter_id)
  references playground.encounters(id) on delete cascade;
create table playground.encounter_rejections (
  encounter_id uuid not null references playground.encounters(id) on delete cascade,
  command_id text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (encounter_id, command_id)
);
