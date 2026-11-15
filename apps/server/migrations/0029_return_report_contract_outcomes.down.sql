do $$
begin
  if exists (
    select 1
    from company_return_report_cursors
    where acknowledged_contract_outcomes <> '[]'::jsonb
       or offered_contract_outcomes <> '[]'::jsonb
  ) then
    raise exception 'Refusing to drop retained return-report contract outcomes';
  end if;
end $$;

alter table company_return_report_cursors
  drop column acknowledged_contract_outcomes,
  drop column offered_contract_outcomes;
