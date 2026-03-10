-- Migration: Add platform revenue tracking system
-- This migration adds the channel field to orders and creates the platform_revenue table

-- Step 1: Add channel field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'platform' CHECK (channel IN ('platform', 'in_store'));

-- Update existing orders to have channel = 'platform' for online payments
UPDATE orders SET channel = 'platform' WHERE payment_method = 'online' AND channel IS NULL;

-- Step 2: Add payment_status field for clearer tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded'));

-- Update existing orders based on their current status
UPDATE orders SET payment_status = 'paid' 
  WHERE status IN ('confirmed', 'processing', 'ready_for_pos', 'completed_in_pos', 'assigned', 'picked_up', 'arrived', 'delivered');

UPDATE orders SET payment_status = 'pending' 
  WHERE status = 'pending' AND payment_method = 'online';

UPDATE orders SET payment_status = 'cancelled' 
  WHERE status = 'cancelled';

UPDATE orders SET payment_status = 'refunded' 
  WHERE status = 'refunded';

-- Step 3: Create platform_revenue table
CREATE TABLE IF NOT EXISTS platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_percentage DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_fees_excluded DECIMAL(12,2) DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'paid', 'disputed')),
  invoice_number VARCHAR(50) UNIQUE,
  invoice_generated_at TIMESTAMP WITH TIME ZONE,
  invoice_pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries for the same month/year
  CONSTRAINT unique_month_year UNIQUE (month, year)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_platform_revenue_month_year ON platform_revenue(month, year);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_status ON platform_revenue(status);

-- Step 4: Create platform_revenue_breakdown table for store-level details
CREATE TABLE IF NOT EXISTS platform_revenue_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_revenue_id UUID NOT NULL REFERENCES platform_revenue(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id),
  store_name VARCHAR(255),
  order_count INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_fees DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate store entries for same revenue period
  CONSTRAINT unique_revenue_store UNIQUE (platform_revenue_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_breakdown_platform_id ON platform_revenue_breakdown(platform_revenue_id);
CREATE INDEX IF NOT EXISTS idx_revenue_breakdown_store_id ON platform_revenue_breakdown(store_id);

-- Step 4b: Drop view first, then rename columns, then recreate view
DROP VIEW IF EXISTS v_platform_revenue_summary;

ALTER TABLE platform_revenue RENAME COLUMN gross_sales TO subtotal;
ALTER TABLE platform_revenue_breakdown RENAME COLUMN gross_sales TO subtotal;

-- Step 5: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_platform_revenue_updated_at ON platform_revenue;
CREATE TRIGGER update_platform_revenue_updated_at
  BEFORE UPDATE ON platform_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_revenue_breakdown_updated_at ON platform_revenue_breakdown;
CREATE TRIGGER update_platform_revenue_breakdown_updated_at
  BEFORE UPDATE ON platform_revenue_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create view for easier revenue reporting
CREATE OR REPLACE VIEW v_platform_revenue_summary AS
SELECT 
  pr.id,
  pr.month,
  pr.year,
  TO_CHAR(TO_DATE(pr.month::TEXT, 'MM'), 'Month') AS month_name,
  pr.total_orders,
  pr.subtotal,
  pr.platform_percentage,
  pr.platform_fee,
  pr.delivery_fees_excluded,
  pr.status,
  pr.invoice_number,
  prb.store_count,
  prb.top_store_name,
  prb.top_store_sales
FROM platform_revenue pr
LEFT JOIN (
  SELECT 
    platform_revenue_id,
    COUNT(DISTINCT store_id) AS store_count,
    MAX(store_name) FILTER (WHERE subtotal = max_sales) AS top_store_name,
    MAX(subtotal) AS top_store_sales
  FROM (
    SELECT 
      platform_revenue_id,
      store_id,
      store_name,
      subtotal,
      MAX(subtotal) OVER (PARTITION BY platform_revenue_id) AS max_sales
    FROM platform_revenue_breakdown
  ) ranked
  GROUP BY platform_revenue_id
) prb ON pr.id = prb.platform_revenue_id
ORDER BY pr.year DESC, pr.month DESC;

-- Step 7: Add comments for documentation
COMMENT ON TABLE platform_revenue IS 'Monthly platform revenue tracking for 8% service fee model';
COMMENT ON TABLE platform_revenue_breakdown IS 'Store-level breakdown of platform revenue';
COMMENT ON COLUMN orders.channel IS 'Order channel: platform (digital) or in_store (POS)';
COMMENT ON COLUMN orders.payment_status IS 'Normalized payment status for revenue calculations';

-- Step 8: Create function to calculate monthly revenue
DROP FUNCTION IF EXISTS calculate_monthly_revenue(INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION calculate_monthly_revenue(
  p_month INTEGER,
  p_year INTEGER,
  p_exclude_delivery_fees BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  total_orders BIGINT,
  subtotal DECIMAL,
  platform_fee DECIMAL,
  delivery_fees DECIMAL
) AS $$
DECLARE
  v_total_orders BIGINT;
  v_subtotal DECIMAL(12,2);
  v_delivery_fees DECIMAL(12,2);
  v_platform_base DECIMAL(12,2);
  v_platform_fee DECIMAL(12,2);
BEGIN
  -- Count orders and sum amounts
  SELECT 
    COUNT(*),
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(delivery_fee), 0)
  INTO v_total_orders, v_subtotal, v_delivery_fees
  FROM orders
  WHERE channel = 'platform'
    AND payment_status = 'paid'
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year;

  -- Calculate platform fee base (exclude delivery fees if requested)
  IF p_exclude_delivery_fees THEN
    v_platform_base := v_subtotal - v_delivery_fees;
  ELSE
    v_platform_base := v_subtotal;
  END IF;

  -- Calculate 8% platform fee
  v_platform_fee := ROUND(v_platform_base * 0.08, 2);

  RETURN QUERY SELECT v_total_orders, v_subtotal, v_platform_fee, v_delivery_fees;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_monthly_revenue IS 'Calculates platform revenue for a given month/year';

-- Step 9: Ensure branch total sales RPC matches platform revenue definition
DROP FUNCTION IF EXISTS public.get_all_time_branch_total_sales(uuid, text[]);
 
CREATE OR REPLACE FUNCTION public.get_all_time_branch_total_sales(
   p_store_id uuid DEFAULT NULL::uuid,
   p_statuses text[] DEFAULT ARRAY[
     'paid'::text,
     'confirmed'::text,
     'ready_for_pos'::text,
     'completed_in_pos'::text,
     'assigned'::text,
     'picked_up'::text,
     'arrived'::text,
     'delivered'::text
   ]
)
RETURNS TABLE(
   store_id uuid,
   store_name text,
   order_count bigint,
   total_sales numeric
)
LANGUAGE sql
STABLE
AS $function$
   SELECT
     o.store_id,
     COALESCE(s.name, 'Unknown') AS store_name,
     COUNT(o.id)::bigint AS order_count,
     COALESCE(SUM(o.subtotal), 0)::numeric AS total_sales
   FROM public.orders o
   LEFT JOIN public.stores s ON s.id = o.store_id
   WHERE
     (p_store_id IS NULL OR o.store_id = p_store_id)
     AND (p_statuses IS NULL OR o.status = ANY(p_statuses))
     AND o.channel = 'platform'
     AND o.payment_status = 'paid'
   GROUP BY o.store_id, s.name
   ORDER BY COALESCE(s.name, 'Unknown') ASC;
$function$;
