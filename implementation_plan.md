# Supplier Management Module Implementation

This plan outlines the architecture for the premium, commercial-grade Supplier Management module and ledger integration.

## Open Questions

1. **Database Multi-tenancy**: I noticed some older modules use `user_id` for scoping, while the new HR module uses `tenant_id`. I will provision the new `suppliers` table with `tenant_id` to align with modern best practices for this ERP. Is that acceptable?
2. **SQL Execution**: Because I cannot run DDL (Data Definition Language) queries like `CREATE TABLE` directly from the frontend React code securely, I will provide the raw SQL in this plan. You will need to run this SQL in your Supabase SQL Editor to create the table and RPC functions before the frontend will work. Is this workflow okay?

## User Review Required

> [!WARNING]
> **Database Changes Required**: You must execute the SQL script below in your Supabase project to create the `suppliers` table and the RPC ledger functions before we can test the frontend.

## Proposed Changes

### Database Schema (Supabase SQL)

We will execute this via the Supabase SQL Editor. It creates the `suppliers` table and a secure `increment_supplier_balance` function to handle concurrent ledger updates safely.

```sql
-- 1. Create the suppliers table
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

-- 2. Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for tenant isolation
CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers FOR SELECT 
USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert their own suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own suppliers" 
ON public.suppliers FOR UPDATE 
USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete their own suppliers" 
ON public.suppliers FOR DELETE 
USING (auth.uid() = tenant_id);

-- 4. Create an RPC function to safely increment/decrement balances concurrently
CREATE OR REPLACE FUNCTION increment_supplier_balance(p_supplier_id BIGINT, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.suppliers
  SET current_balance = current_balance + p_amount
  WHERE id = p_supplier_id AND tenant_id = auth.uid();
END;
$$;
```

---

### Frontend Implementation

#### [MODIFY] [Suppliers.jsx](file:///c:/Users/moham/Desktop/-ERP/src/pages/supply/Suppliers.jsx)
- **Rewrite entirely** to use a premium Glassmorphic UI tailored specifically for Suppliers (moving away from the generic `CrudTable` wrapper, or highly customizing it).
- **New Form**: "إضافة مورد جديد" with fields: Name, Company, Phone, Tax Number, Initial Balance.
- **Dynamic Ledger Table**: Display suppliers with an amber warning badge `bg-amber-500/20 text-amber-400` if `current_balance > 0`.
- **Fast Search**: Implement instant client-side filtering by name or phone.
- **Payment Modal**: Add a "تسجيل دفعة للمورد" action that opens a modal, accepts a payment amount, and safely decrements the `current_balance` using the Supabase RPC.

#### [MODIFY] [PurchaseInvoices.jsx](file:///c:/Users/moham/Desktop/-ERP/src/pages/supply/PurchaseInvoices.jsx)
- **Ledger Integration**: In the `handleSave` function, intercept the insertion of a new Purchase Invoice.
- When an invoice is saved successfully, call `supabase.rpc('increment_supplier_balance', { p_supplier_id: form.supplier_id, p_amount: form.total_amount })` to instantly add the total to the supplier's ledger balance.

## Verification Plan

### Manual Verification
1. Open the **Supabase SQL Editor** and run the provided schema migration.
2. Navigate to the **الموردين (Suppliers)** page.
3. Create a new supplier (e.g., "Tech Corp") with an initial balance of 0.
4. Navigate to **المشتريات (Purchase Invoices)**.
5. Create an invoice for "Tech Corp" for 5,000.
6. Return to the Suppliers page and verify the balance shows 5,000 highlighted in amber.
7. Click "تسجيل دفعة" (Pay) and pay 2,000. Verify the balance immediately drops to 3,000.
