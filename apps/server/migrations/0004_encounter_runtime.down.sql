do $$
begin
  if exists (select 1 from encounters where deadline_at is null)
     or exists (select 1 from encounter_commands where source_kind = 'system_ai')
     or exists (select 1 from encounter_receipts where source_kind = 'system_ai')
     or exists (select 1 from encounter_ai_controllers)
  then
    raise exception 'cannot roll back encounter runtime data to 0003 without losing deadline or AI authority state';
  end if;
end
$$;

drop index encounters_due_ai_wakes_idx;
drop table encounter_ai_controllers;

alter table encounter_receipts
  drop constraint encounter_receipts_source_account_check,
  alter column account_id set not null,
  drop column source_kind;

alter table encounter_commands
  drop constraint encounter_commands_source_account_check,
  alter column account_id set not null,
  drop column source_kind;

alter table encounters
  drop constraint encounters_active_clock_check,
  drop column ai_wake_at,
  alter column deadline_at set not null;
