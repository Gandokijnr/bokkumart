-- Migration: Add delivery_mode column to stores table
-- This adds the missing column that was referenced in orders.vue

-- Add the delivery_mode column to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'pickup';

-- Add a check constraint to ensure valid values
-- Valid values: 'pickup', 'delivery', 'both'
ALTER TABLE public.stores 
ADD CONSTRAINT stores_delivery_mode_check 
CHECK (delivery_mode IN ('pickup', 'delivery', 'both'));

-- Update existing stores to have a default value
UPDATE public.stores 
SET delivery_mode = 'both'
WHERE delivery_mode IS NULL;

-- Create an index for faster queries on delivery_mode
CREATE INDEX IF NOT EXISTS idx_stores_delivery_mode 
ON public.stores(delivery_mode);

-- Add comment explaining the column
COMMENT ON COLUMN public.stores.delivery_mode IS 
'Specifies how this store handles order fulfillment: pickup (in-store pickup only), delivery (delivery only), or both (both options available)';

-- ============================================
-- RLS POLICY UPDATE (if needed)
-- ============================================

-- Ensure the column is accessible through RLS policies
-- The existing RLS policies should already cover this, but verify:
-- SELECT * FROM pg_policies WHERE tablename = 'stores';

/*
NOTES:
- Valid values: 'pickup', 'delivery', 'both'
- Default is 'pickup' for stores with pickup gates
- Default is 'both' for stores without specific configuration
- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
*/
