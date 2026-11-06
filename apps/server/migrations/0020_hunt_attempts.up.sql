alter table encounter_admissions
  add column attempt_no integer not null default 1 check (attempt_no > 0),
  add column is_current boolean not null default true,
  drop constraint encounter_admissions_world_id_instance_id_key,
  add unique (world_id, instance_id, attempt_no);

create unique index encounter_admissions_current_idx
  on encounter_admissions (world_id, instance_id) where is_current;

alter table contract_instances
  add column owner_join_attempt_no integer,
  add column helper_join_attempt_no integer;

update contract_instances set
  owner_join_attempt_no = case when owner_join is not null then 1 end,
  helper_join_attempt_no = case when helper_join is not null then 1 end;

alter table contract_instances
  add constraint contract_owner_join_attempt_check check (
    (owner_join is null and owner_join_attempt_no is null) or
    (owner_join is not null and owner_join_attempt_no is not null and owner_join_attempt_no > 0)
  ),
  add constraint contract_helper_join_attempt_check check (
    (helper_join is null and helper_join_attempt_no is null) or
    (helper_join is not null and helper_join_attempt_no is not null and helper_join_attempt_no > 0)
  );
