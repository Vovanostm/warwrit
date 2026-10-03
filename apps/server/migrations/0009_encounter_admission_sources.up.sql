alter table encounter_participants
  drop constraint encounter_participants_admission_source_check,
  add constraint encounter_participants_admission_source_check
    check (admission_source in ('fixture', 'company_binding'));

alter table encounter_ai_controllers
  drop constraint encounter_ai_controllers_admission_source_check,
  add constraint encounter_ai_controllers_admission_source_check
    check (admission_source in ('fixture', 'world_hostile'));
