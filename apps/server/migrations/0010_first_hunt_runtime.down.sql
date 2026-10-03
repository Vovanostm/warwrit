do $$
begin
  if exists (select 1 from world_first_hunt_state) or
     exists (select 1 from contract_instances) or
     exists (select 1 from encounter_admissions) or
     exists (select 1 from world_proof_claims) or
     exists (select 1 from encounter_activation_policies) or
     exists (select 1 from encounter_commands where source_kind = 'system_timeout') or
     exists (select 1 from encounter_receipts where source_kind = 'system_timeout') or
     exists (select 1 from encounter_participants where afk or resume_requested_after_epoch is not null) then
    raise exception 'refusing to delete persisted FIRST HUNT runtime state';
  end if;
end;
$$;

alter table encounter_receipts
  drop constraint encounter_receipts_timeout_policy_check,
  drop constraint encounter_receipts_activation_policy_fk,
  drop column activation_policy_id,
  drop constraint encounter_receipts_source_account_check,
  drop constraint encounter_receipts_source_kind_check,
  add constraint encounter_receipts_source_kind_check
    check (source_kind in ('account', 'system_ai')),
  add constraint encounter_receipts_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind = 'system_ai' and account_id is null)
  );

alter table encounter_commands
  drop constraint encounter_commands_timeout_policy_check,
  drop constraint encounter_commands_activation_policy_fk,
  drop column campaign_tick,
  drop column activation_policy_id,
  drop constraint encounter_commands_source_account_check,
  drop constraint encounter_commands_source_kind_check,
  add constraint encounter_commands_source_kind_check
    check (source_kind in ('account', 'system_ai')),
  add constraint encounter_commands_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind = 'system_ai' and account_id is null)
  );

alter table encounter_participants
  drop column resume_requested_after_epoch,
  drop column afk;

drop table encounter_activation_policies;
drop table world_proof_claims;
drop table encounter_admissions;
drop table contract_instances;
drop table world_first_hunt_state;
