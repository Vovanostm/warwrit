do $$
begin
  if exists (select 1 from story_command_receipts)
     or exists (select 1 from story_company_states)
     or exists (select 1 from story_world_states)
     or exists (select 1 from ordinary_contract_receipts where simulation_at_ms is not null) then
    raise exception 'retain story mission states and delivery clock provenance';
  end if;
end;
$$;

drop table story_command_receipts;
drop table story_company_states;
drop table story_world_states;
alter table ordinary_contract_receipts drop column simulation_at_ms;
