-- ==========================================
-- 1. Suppliers Table & Ledger RPC
-- ==========================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT auth.uid(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    current_balance NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert their own suppliers" 
ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own suppliers" 
ON public.suppliers FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete their own suppliers" 
ON public.suppliers FOR DELETE USING (auth.uid() = tenant_id);

-- RPC for incrementing/decrementing balances safely
CREATE OR REPLACE FUNCTION increment_supplier_balance(p_supplier_id BIGINT, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.suppliers
  SET current_balance = COALESCE(current_balance, 0) + p_amount
  WHERE id = p_supplier_id AND tenant_id = auth.uid();
END;
$$;

-- ==========================================
-- 2. Notifications Table & Realtime Setup
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT auth.uid(),
    title TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert their own notifications" 
ON public.notifications FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE USING (auth.uid() = tenant_id);

-- Enable Supabase Realtime for the notifications table
alter publication supabase_realtime add table public.notifications;
