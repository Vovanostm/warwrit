do $$
begin
  if exists (select 1 from ordinary_contract_receipts) then
    raise exception 'refusing to delete recorded ordinary contract receipts';
  end if;
end;
$$;

drop table ordinary_contract_receipts;
drop table ordinary_contracts;
