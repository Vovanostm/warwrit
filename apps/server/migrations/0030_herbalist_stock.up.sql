ALTER TABLE settlement_supplies
  ADD COLUMN herbalist_medical_units integer NOT NULL DEFAULT 0
  CHECK (herbalist_medical_units >= 0),
  ADD COLUMN chapel_cash_q numeric(128,0) NOT NULL DEFAULT 0
  CHECK (chapel_cash_q >= 0);

UPDATE settlement_supplies
SET herbalist_medical_units = 12
WHERE site_id = 'bereznyak';
