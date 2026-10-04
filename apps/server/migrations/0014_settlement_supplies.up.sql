CREATE TABLE settlement_supplies (
 world_id text NOT NULL,
 site_id text NOT NULL,
 revision numeric(128,0) NOT NULL CHECK (revision >= 0),
 rations integer NOT NULL CHECK (rations >= 0),
 cash_q numeric(128,0) NOT NULL CHECK (cash_q >= 0),
 PRIMARY KEY (world_id, site_id)
);
