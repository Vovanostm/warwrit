alter table world_campaign_clocks
  add column qa_offset_ms bigint not null default 0 check (qa_offset_ms >= 0);
-- Convert only the opt-in 0024 journal's tick advances, preserving the campaign
-- tick. That migration used the retained 1 tick / 21600 ms clock profile.
update world_campaign_clocks as clock
set qa_offset_ms = advances.ticks * 21600,
    starting_tick = (clock.starting_tick::numeric - advances.ticks)::text
from (
  select world_id, sum(ticks)::bigint as ticks
  from playground.campaign_time_receipts group by world_id
) as advances
where advances.world_id = clock.world_id;
