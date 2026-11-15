alter table company_return_report_cursors
  add column acknowledged_contract_outcomes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(acknowledged_contract_outcomes) = 'array'),
  add column offered_contract_outcomes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(offered_contract_outcomes) = 'array');
