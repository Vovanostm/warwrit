create table engineering_schema_probe (
  id smallint primary key check (id = 1),
  installed_at timestamptz not null default now()
);

insert into engineering_schema_probe (id) values (1);
