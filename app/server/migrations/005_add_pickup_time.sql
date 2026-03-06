-- Add pickup_time column to orders table
-- Required for pickup orders to store customer-selected pickup time

DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'pickup_time'
    ) THEN
        ALTER TABLE orders ADD COLUMN pickup_time TIMESTAMP WITH TIME ZONE;
        
        -- Add comment for documentation
        COMMENT ON COLUMN orders.pickup_time IS 'Scheduled pickup time for pickup orders';
    END IF;
END $$;
