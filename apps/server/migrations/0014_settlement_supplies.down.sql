DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM settlement_supplies) THEN
    RAISE EXCEPTION 'refusing to delete persisted settlement supplies';
  END IF;
END $$;
DROP TABLE settlement_supplies;
