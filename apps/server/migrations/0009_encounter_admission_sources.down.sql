do $$
begin
  if exists (
    select 1 from encounter_participants where admission_source <> 'fixture'
  ) or exists (
    select 1 from encounter_ai_controllers where admission_source <> 'fixture'
  ) then
    raise exception 'cannot roll back encounter admission sources while non-fixture rows exist';
  end if;
end;
$$;

alter table encounter_participants
  drop constraint encounter_participants_admission_source_check,
  add constraint encounter_participants_admission_source_check
    check (admission_source = 'fixture');

alter table encounter_ai_controllers
  drop constraint encounter_ai_controllers_admission_source_check,
  add constraint encounter_ai_controllers_admission_source_check
    check (admission_source = 'fixture');
