-- Migration: Add tenant-isolated employee IDs

-- 1. Add the column
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_emp_id INTEGER;

-- 2. Create a sequence-like function to auto-assign tenant_emp_id for new inserts
CREATE OR REPLACE FUNCTION set_tenant_emp_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_emp_id IS NULL THEN
    SELECT COALESCE(MAX(tenant_emp_id), 0) + 1
    INTO NEW.tenant_emp_id
    FROM public.employees
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger
DROP TRIGGER IF EXISTS trg_set_tenant_emp_id ON public.employees;
CREATE TRIGGER trg_set_tenant_emp_id
BEFORE INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION set_tenant_emp_id();

-- 4. Backfill existing records (Assign incremental IDs per tenant)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  current_user UUID := NULL;
BEGIN
  FOR rec IN 
    SELECT emp_id, user_id 
    FROM public.employees 
    ORDER BY user_id, emp_id 
  LOOP
    IF current_user IS DISTINCT FROM rec.user_id THEN
      current_user := rec.user_id;
      counter := 1;
    ELSE
      counter := counter + 1;
    END IF;

    UPDATE public.employees 
    SET tenant_emp_id = counter 
    WHERE emp_id = rec.emp_id AND tenant_emp_id IS NULL;
  END LOOP;
END;
$$;
