alter table world_hunt_states
  add column quest_state jsonb not null
    default '{"schemaVersion":1,"companies":[],"outcome":null}'::jsonb,
  add constraint world_hunt_states_quest_state_object
    check (jsonb_typeof(quest_state) = 'object');
