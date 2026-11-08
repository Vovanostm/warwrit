do $$ begin
  if exists (select 1 from playground.campaign_time_receipts) then
    raise exception 'QA campaign time has advanced; retain its idempotency journal';
  end if;
end $$;
drop table playground.campaign_time_receipts;
