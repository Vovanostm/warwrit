do $$ begin
  if exists (select 1 from world_campaign_clocks where qa_offset_ms > 0) then
    raise exception 'QA world time has advanced; retain the simulation clock schema';
  end if;
end $$;
alter table world_campaign_clocks drop column qa_offset_ms;
