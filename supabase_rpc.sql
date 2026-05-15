-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Creates a secure RPC that lets the frontend execute raw SQL

CREATE OR REPLACE FUNCTION execute_raw_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  start_time timestamptz;
  duration_ms float;
BEGIN
  start_time := clock_timestamp();
  
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be logged in to use the SQL engine.';
  END IF;

  -- Block dangerous statements
  IF query ~* '^\s*(DROP|TRUNCATE|DELETE\s+FROM\s+auth|ALTER\s+ROLE|CREATE\s+ROLE)' THEN
    RAISE EXCEPTION 'Forbidden: This statement type is not permitted via the SQL engine.';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;

  RETURN jsonb_build_object(
    'rows',     COALESCE(result, '[]'::jsonb),
    'row_count', jsonb_array_length(COALESCE(result, '[]'::jsonb)),
    'duration_ms', ROUND(duration_ms::numeric, 2)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error',   SQLERRM,
    'code',    SQLSTATE,
    'rows',    '[]'::jsonb,
    'row_count', 0
  );
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION execute_raw_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_raw_sql(text) TO authenticated;
