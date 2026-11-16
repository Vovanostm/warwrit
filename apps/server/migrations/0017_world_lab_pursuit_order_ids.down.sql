do $$
begin
  if exists (select 1 from world_lab_pursuits) then
    raise exception 'refusing to delete persisted world lab pursuits';
  end if;
end $$;
alter table world_lab_pursuits drop column order_id;
