do $$
begin
  if exists (select 1 from encounter_leadership_choices) then
    raise exception 'refusing to delete recorded leadership choices';
  end if;
end;
$$;

drop table encounter_leadership_choices;
