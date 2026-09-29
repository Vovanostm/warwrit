alter table encounters
  alter column deadline_at drop not null,
  add column ai_wake_at timestamptz,
  add constraint encounters_active_clock_check check (
    (status = 'active' and ((deadline_at is not null) <> (ai_wake_at is not null))) or
    (status = 'resolved' and ai_wake_at is null)
  );

alter table encounter_commands
  add column source_kind text not null default 'account'
    check (source_kind in ('account', 'system_ai')),
  alter column account_id drop not null,
  add constraint encounter_commands_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind = 'system_ai' and account_id is null)
  );

alter table encounter_receipts
  add column source_kind text not null default 'account'
    check (source_kind in ('account', 'system_ai')),
  alter column account_id drop not null,
  add constraint encounter_receipts_source_account_check check (
    (source_kind = 'account' and account_id is not null) or
    (source_kind = 'system_ai' and account_id is null)
  );

create table encounter_ai_controllers (
  encounter_id uuid not null references encounters(id),
  unit_id text not null,
  doctrine text not null check (doctrine in ('aggressive', 'survivor')),
  admission_source text not null check (admission_source = 'fixture'),
  assigned_at timestamptz not null default now(),
  primary key (encounter_id, unit_id)
);

create index encounters_due_ai_wakes_idx
  on encounters (ai_wake_at)
  where status = 'active' and ai_wake_at is not null;
