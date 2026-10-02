do $$
begin
  if exists (select 1 from world_hunt_states where revision > 0) then
    raise exception 'refusing to delete hunt world state that has changed since genesis';
  end if;
end;
$$;

drop table world_hunt_states;
