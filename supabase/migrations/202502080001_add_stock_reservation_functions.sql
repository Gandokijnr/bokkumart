-- Create stock reservation system for cart checkout

-- Create the stock_reservations table first
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_store ON stock_reservations(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at);

-- Enable RLS on the table
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage reservations
DROP POLICY IF EXISTS "Service role can manage stock reservations" ON stock_reservations;
CREATE POLICY "Service role can manage stock reservations" ON stock_reservations
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Update reserve_stock function to work with checkout flow
-- This version creates a temporary reservation record instead of modifying store_inventory
CREATE OR REPLACE FUNCTION reserve_stock(
  p_product_id UUID,
  p_store_id UUID,
  p_quantity INTEGER,
  p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_stock INTEGER;
  v_digital_buffer INTEGER;
BEGIN
  -- Check available stock from store_inventory (available_stock - digital_buffer)
  SELECT si.available_stock, si.digital_buffer
  INTO v_available_stock, v_digital_buffer
  FROM store_inventory si
  WHERE si.product_id = p_product_id 
  AND si.store_id = p_store_id;

  -- If no inventory record exists
  IF v_available_stock IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if enough stock is available (accounting for digital buffer)
  IF (v_available_stock - v_digital_buffer) < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- Create reservation in stock_reservations table
  INSERT INTO stock_reservations (
    product_id,
    store_id,
    quantity,
    expires_at,
    created_at
  ) VALUES (
    p_product_id,
    p_store_id,
    p_quantity,
    p_expires_at,
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Update release_stock function to remove from stock_reservations
CREATE OR REPLACE FUNCTION release_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the most recent reservation for this product
  DELETE FROM stock_reservations
  WHERE id IN (
    SELECT id FROM stock_reservations
    WHERE product_id = p_product_id
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$;

-- Function to clean up expired reservations (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM stock_reservations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;
