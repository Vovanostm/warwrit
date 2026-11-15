DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM settlement_supplies
    WHERE chapel_cash_q <> 0 OR herbalist_medical_units <> 0
  ) THEN
    RAISE EXCEPTION 'Refusing to drop retained chapel funds or herbalist stock';
  END IF;
END $$;

ALTER TABLE settlement_supplies
  DROP COLUMN chapel_cash_q,
  DROP COLUMN herbalist_medical_units;
