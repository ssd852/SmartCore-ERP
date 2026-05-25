-- Add barcode and min_stock_level columns to inventory
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS barcode VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC DEFAULT 5;

-- Create RPC function to atomic increment/decrement stock by barcode
CREATE OR REPLACE FUNCTION increment_stock_by_barcode(target_barcode VARCHAR, count_change NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity + count_change
  WHERE barcode = target_barcode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
