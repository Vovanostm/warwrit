create table company_return_report_cursors (
  world_id text not null,
  company_id text not null,
  acknowledged_tick text not null check (acknowledged_tick ~ '^(0|[1-9][0-9]*)$'),
  acknowledged_event_sequence bigint not null check (acknowledged_event_sequence >= 0),
  acknowledged_movement_count bigint not null check (acknowledged_movement_count >= 0),
  acknowledged_food jsonb not null check (jsonb_typeof(acknowledged_food) = 'array'),
  acknowledged_owed_q text not null check (acknowledged_owed_q ~ '^(0|[1-9][0-9]*)$'),
  acknowledged_debt_q text not null check (acknowledged_debt_q ~ '^(0|[1-9][0-9]*)$'),
  last_acknowledged_report_id uuid,
  offered_report_id uuid,
  offered_tick text check (offered_tick is null or offered_tick ~ '^(0|[1-9][0-9]*)$'),
  offered_event_sequence bigint check (offered_event_sequence is null or offered_event_sequence >= 0),
  offered_movement_count bigint check (offered_movement_count is null or offered_movement_count >= 0),
  offered_food jsonb check (offered_food is null or jsonb_typeof(offered_food) = 'array'),
  offered_owed_q text check (offered_owed_q is null or offered_owed_q ~ '^(0|[1-9][0-9]*)$'),
  offered_debt_q text check (offered_debt_q is null or offered_debt_q ~ '^(0|[1-9][0-9]*)$'),
  offered_report jsonb check (offered_report is null or jsonb_typeof(offered_report) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (world_id, company_id),
  foreign key (world_id, company_id) references company_snapshots (world_id, company_id),
  check (
    (offered_report_id is null and offered_tick is null and offered_event_sequence is null and
      offered_movement_count is null and offered_food is null and offered_owed_q is null and
      offered_debt_q is null and offered_report is null) or
    (offered_report_id is not null and offered_tick is not null and offered_event_sequence is not null and
      offered_movement_count is not null and offered_food is not null and offered_owed_q is not null and
      offered_debt_q is not null and offered_report is not null)
  )
);
