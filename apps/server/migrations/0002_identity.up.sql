create table identity_accounts (
  id uuid primary key,
  issuer text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (issuer, subject)
);

create table identity_sessions (
  token_digest bytea primary key check (octet_length(token_digest) = 32),
  account_id uuid not null references identity_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

create index identity_sessions_account_id_idx on identity_sessions (account_id);

create table identity_oidc_flows (
  state_digest bytea primary key check (octet_length(state_digest) = 32),
  browser_digest bytea not null check (octet_length(browser_digest) = 32),
  code_verifier text not null,
  nonce text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

create index identity_oidc_flows_expiry_idx on identity_oidc_flows (expires_at);
