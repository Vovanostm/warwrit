create table mill_descent_kit_stock (
  world_id text primary key,
  revision numeric(128, 0) not null check (revision >= 0),
  quantity integer not null check (quantity >= 0),
  price_q numeric(128, 0) not null check (price_q > 0),
  cash_q numeric(128, 0) not null check (cash_q >= 0)
);
