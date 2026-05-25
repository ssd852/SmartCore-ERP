-- =============================================================================
--  SaaS Multi-Tenancy & Licensing Architecture Update
-- =============================================================================

-- 1. Create the tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  tenant_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'Yearly',
  subscription_expiry_date DATE NOT NULL,
  ai_credits_remaining INT NOT NULL DEFAULT 0,
  company_name VARCHAR(255) DEFAULT 'SmartCore ERP',
  company_logo_url VARCHAR(500) DEFAULT '',
  company_address VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant profile" 
ON public.tenants FOR SELECT 
USING (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own tenant profile" 
ON public.tenants FOR UPDATE 
USING (auth.uid() = tenant_id);

-- 2. Trigger to automatically create a tenant profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenants (tenant_id, plan_type, subscription_expiry_date, ai_credits_remaining)
  VALUES (
    NEW.id, 
    'Lifetime', -- Defaulting to Lifetime for simplicity, or can be Yearly
    '2099-12-31'::DATE, 
    5000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on multiple runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Recharge Tenant Credits RPC
CREATE OR REPLACE FUNCTION recharge_tenant_credits(p_tenant_id UUID, p_amount INT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We assume admin checks are done at the app layer or we can add them here.
  -- For now, allow refilling the specified tenant.
  UPDATE public.tenants
  SET ai_credits_remaining = ai_credits_remaining + p_amount,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Credits recharged successfully');
END;
$$;

-- 4. Consume AI Credits RPC
CREATE OR REPLACE FUNCTION consume_ai_credits(p_cost INT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INT;
BEGIN
  -- Get current credits
  SELECT ai_credits_remaining INTO v_current_credits
  FROM public.tenants
  WHERE tenant_id = auth.uid();

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant profile not found');
  END IF;

  IF v_current_credits < p_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient credits');
  END IF;

  -- Deduct credits
  UPDATE public.tenants
  SET ai_credits_remaining = ai_credits_remaining - p_cost,
      updated_at = NOW()
  WHERE tenant_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'remaining', v_current_credits - p_cost);
END;
$$;
