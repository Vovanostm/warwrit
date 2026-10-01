do $$
begin
  lock table public.world_campaign_clocks,
    public.world_party_routes,
    public.world_route_receipts in access exclusive mode;

  if exists (select 1 from public.world_party_routes)
    or exists (select 1 from public.world_route_receipts)
  then
    raise exception 'Cannot roll back world travel while route data or receipts exist'
      using errcode = '55000';
  end if;

  if to_regclass('public.world_campaign_clocks_0008_backup') is not null then
    raise exception 'Cannot roll back world travel while its clock backup exists'
      using errcode = '55000';
  end if;

  drop table public.world_route_receipts;
  drop table public.world_party_routes;
  alter table public.world_campaign_clocks rename to world_campaign_clocks_0008_backup;
end;
$$;
