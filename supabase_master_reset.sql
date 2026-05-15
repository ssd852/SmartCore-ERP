-- ═══════════════════════════════════════════════════════
--  Supabase RPC: master_system_reset()
--  Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION master_system_reset()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auth guard: must be logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be authenticated to perform this action.';
  END IF;

  -- Perform the ultimate wipe on all ERP tables, resetting IDs
  TRUNCATE TABLE 
    suppliers, 
    customers, 
    employees, 
    chart_of_accounts, 
    inventory, 
    fixed_assets, 
    journal_entries, 
    checks, 
    purchase_invoices, 
    sales_invoices, 
    payroll 
  RESTART IDENTITY CASCADE;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Master system reset completed successfully.',
    'wiped_at', NOW()::text
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
REVOKE ALL ON FUNCTION master_system_reset() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION master_system_reset() TO authenticated;
