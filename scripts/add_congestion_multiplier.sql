-- Migration: Add congestion_multiplier to stores table for Lagos traffic surcharge
-- This allows PMs to set dynamic multipliers (e.g., 1.2x during rainy season or December traffic)

-- Add congestion_multiplier column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS congestion_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Add comment explaining the column
COMMENT ON COLUMN stores.congestion_multiplier IS 'Dynamic multiplier for delivery fees during high traffic (e.g., 1.2 = 20% surcharge). Default 1.0 = no surcharge.';

-- Create index for quick lookups if needed for large store lists
CREATE INDEX IF NOT EXISTS idx_stores_congestion_multiplier ON stores(congestion_multiplier) WHERE congestion_multiplier != 1.00;

-- Update existing stores to have default value
UPDATE stores
SET congestion_multiplier = 1.00
WHERE congestion_multiplier IS NULL;

-- Set specific values for known Lagos branches based on typical traffic patterns
-- These can be adjusted by PMs via admin dashboard
UPDATE stores
SET congestion_multiplier = 1.20
WHERE code IN ('lekki', 'gbagada') AND city ILIKE '%lagos%';

-- Verify the migration
SELECT 
    name,
    code,
    city,
    congestion_multiplier,
    base_delivery_fee,
    ROUND(base_delivery_fee * congestion_multiplier) as adjusted_fee
FROM stores
WHERE city ILIKE '%lagos%'
ORDER BY congestion_multiplier DESC, name;
