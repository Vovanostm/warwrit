do $$ begin
  if exists (select 1 from encounter_admissions where attempt_no > 1) or
     exists (select 1 from contract_instances where owner_join_attempt_no > 1 or helper_join_attempt_no > 1) then
    raise exception 'Repeated hunt participation exists; retain the hunt-attempt-aware schema and application';
  end if;
end $$;

alter table contract_instances
  drop constraint contract_owner_join_attempt_check,
  drop constraint contract_helper_join_attempt_check,
  drop column owner_join_attempt_no,
  drop column helper_join_attempt_no;

drop index encounter_admissions_current_idx;
alter table encounter_admissions
  drop constraint encounter_admissions_world_id_instance_id_attempt_no_key,
  drop column attempt_no,
  drop column is_current,
  add unique (world_id, instance_id);
