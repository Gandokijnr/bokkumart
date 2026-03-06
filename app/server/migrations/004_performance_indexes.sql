-- Add critical indexes for 10K orders/week scale
-- Run this AFTER 003_add_loyalty_system.sql

-- Ensure loyalty_transactions table has type column (add if missing)
DO $$
BEGIN
    -- Check if table exists but type column is missing
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'loyalty_transactions'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' AND column_name = 'type'
    ) THEN
        ALTER TABLE loyalty_transactions ADD COLUMN type VARCHAR(20) DEFAULT 'earned';
        UPDATE loyalty_transactions SET type = 'earned' WHERE type IS NULL;
        ALTER TABLE loyalty_transactions ALTER COLUMN type SET NOT NULL;
    END IF;
    
    -- Create index only if column now exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' AND column_name = 'type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_type 
        ON loyalty_transactions(user_id, "type");
    END IF;
END $$;

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);

-- Store inventory indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_product_store ON store_inventory(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_visible_stock ON store_inventory(is_visible, available_stock) WHERE is_visible = true;

-- Add partial index for active orders (common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(user_id, status) 
WHERE status IN ('pending', 'paid', 'picked_up', 'ready_for_delivery');

-- Optimize category lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug_active ON categories(slug, is_active) WHERE is_active = true;
