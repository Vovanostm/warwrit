-- The owner's successor choice for a company whose leader died in an encounter while
-- someone can still lead. Terminal consequences wait for it; nothing is chosen for
-- the player. One choice per company and encounter, replaceable until applied.
create table encounter_leadership_choices (
  world_id text not null,
  encounter_id uuid not null references encounters (id),
  company_id text not null,
  account_id uuid not null references identity_accounts (id),
  command_id uuid not null,
  candidate_id text not null check (char_length(candidate_id) between 1 and 128),
  mode text not null check (mode in ('PERMANENT', 'ACTING', 'REGENCY')),
  chosen_at timestamptz not null default now(),
  primary key (encounter_id, company_id),
  foreign key (world_id, company_id) references company_snapshots (world_id, company_id)
);
