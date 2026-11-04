do $$
begin
  lock table public.company_map_grants,
    public.company_region_knowledge,
    public.company_exploration_chunks,
    public.company_place_observations,
    public.world_map_editions in access exclusive mode;

  if exists (select 1 from public.company_map_grants)
    or exists (select 1 from public.company_region_knowledge)
    or exists (select 1 from public.company_exploration_chunks)
    or exists (select 1 from public.company_place_observations)
    or exists (select 1 from public.world_map_editions)
  then
    raise exception 'Cannot roll back company cartography while map or knowledge data exists'
      using errcode = '55000';
  end if;

  drop table public.company_place_observations;
  drop table public.company_exploration_chunks;
  drop table public.company_region_knowledge;
  drop table public.company_map_grants;
  drop table public.world_map_editions;
end;
$$;
