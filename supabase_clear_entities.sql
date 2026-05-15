-- ═══════════════════════════════════════════════════════
--  Supabase RPC: clear_entities_data()
--  Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION clear_entities_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_counts jsonb;
  sup_count  int;
  cust_count int;
  emp_count  int;
BEGIN
  -- Auth guard: must be logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be authenticated to perform this action.';
  END IF;

  -- Capture counts before wipe for the response
  SELECT COUNT(*) INTO sup_count  FROM suppliers;
  SELECT COUNT(*) INTO cust_count FROM customers;
  SELECT COUNT(*) INTO emp_count  FROM employees;

  -- Perform the wipe (CASCADE removes linked invoices, payroll, etc.)
  TRUNCATE TABLE suppliers, customers, employees RESTART IDENTITY CASCADE;

  deleted_counts := jsonb_build_object(
    'suppliers_removed',  sup_count,
    'customers_removed',  cust_count,
    'employees_removed',  emp_count,
    'total_removed',      sup_count + cust_count + emp_count,
    'wiped_at',           NOW()::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entity data cleared successfully.',
    'details', deleted_counts
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'code',    SQLSTATE
  );
END;
$$;

-- Only authenticated users may call this
REVOKE ALL ON FUNCTION clear_entities_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clear_entities_data() TO authenticated;
