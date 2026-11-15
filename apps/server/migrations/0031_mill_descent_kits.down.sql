DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM mill_descent_kit_stock
    WHERE revision <> 0
       OR quantity <> 2
       OR price_q <> 15000000
       OR cash_q <> 0
  ) THEN
    RAISE EXCEPTION 'refusing to delete retained mill descent kit stock or cash';
  END IF;
END $$;

drop table mill_descent_kit_stock;
