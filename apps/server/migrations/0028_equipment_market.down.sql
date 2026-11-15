do $$
begin
  if exists (select 1 from settlement_equipment) then
    raise exception 'Refusing to drop retained settlement equipment';
  end if;
end $$;

drop table settlement_equipment;
