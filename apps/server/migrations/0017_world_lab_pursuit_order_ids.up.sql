-- Existing local pursuits keep their intent and gain a stable server-issued identity.
alter table world_lab_pursuits
  add column order_id uuid not null default gen_random_uuid();
