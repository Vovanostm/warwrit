-- Persistent content authoring only. No canonical game-world references or writes.
create table playground.map_documents (
  id uuid primary key,
  owner_id text not null,
  revision integer not null default 0 check (revision >= 0),
  status text not null check (status in ('Draft', 'Validated', 'Exported', 'Published')),
  content jsonb not null,
  issues jsonb not null default '[]',
  deleted boolean not null default false
);
create index map_documents_owner on playground.map_documents(owner_id);
create table playground.map_receipts (
  owner_id text not null,
  command_id uuid not null,
  document_id uuid not null references playground.map_documents(id) on delete cascade,
  request jsonb not null,
  response jsonb not null,
  primary key (owner_id, command_id)
);
