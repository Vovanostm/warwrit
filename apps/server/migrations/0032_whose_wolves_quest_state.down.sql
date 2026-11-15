do $$
begin
  if exists (
    select 1
      from world_hunt_states
     where instance_id = 'ci.m1.whose-wolves.01'
       and quest_state <> '{"schemaVersion":1,"companies":[],"outcome":null}'::jsonb
  ) then
    raise exception 'refusing to discard retained whose-wolves quest state';
  end if;
end $$;

alter table world_hunt_states
  drop constraint world_hunt_states_quest_state_object,
  drop column quest_state;
