-- Fix for customer visibility of store_inventory and stores
-- Run this in your Supabase SQL Editor

-- 1. Check current RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('store_inventory', 'stores', 'products');

-- 2. Enable RLS on store_inventory if not already enabled
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;

-- 3. Create policy for public access to view visible inventory (no auth required)
DROP POLICY IF EXISTS "Customers can view visible inventory" ON store_inventory;
DROP POLICY IF EXISTS "Allow public read access to visible inventory" ON store_inventory;

CREATE POLICY "Allow public read access to visible inventory"
ON store_inventory FOR SELECT
TO PUBLIC
USING (is_visible = true);

-- 4. Enable RLS on stores and allow public read access to active stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active stores" ON stores;

CREATE POLICY "Allow public read access to active stores"
ON stores FOR SELECT
TO PUBLIC
USING (is_active = true);

-- 5. Enable RLS on products and allow public read access to active products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active products" ON products;

CREATE POLICY "Allow public read access to active products"
ON products FOR SELECT
TO PUBLIC
USING (is_active = true);

-- 6. Verify the inventory record exists and check visibility
-- Run this to diagnose why products aren't showing:

-- Check store_inventory records for Victoria Island store
SELECT 
    si.id,
    si.store_id,
    si.product_id,
    si.stock_level,
    si.available_stock,
    si.digital_buffer,
    si.is_visible,
    si.store_price,
    p.name as product_name,
    p.is_active,
    p.price as base_price
FROM store_inventory si
JOIN products p ON si.product_id = p.id
WHERE si.store_id = '0c6f4030-584b-4385-a21e-21ea6aad0bf8'  -- Replace with actual Victoria Island store ID
ORDER BY si.created_at DESC
LIMIT 20;

-- Check if products have is_active = true
SELECT 
    p.id,
    p.name,
    p.is_active,
    p.price,
    si.store_id,
    si.is_visible,
    si.stock_level
FROM products p
LEFT JOIN store_inventory si ON si.product_id = p.id
WHERE p.name ILIKE '%Hollandia%'  -- Search for your test product
   OR p.created_at > NOW() - INTERVAL '1 hour';  -- Recently created products

-- Fix: If is_visible is false, update it:
-- UPDATE store_inventory 
-- SET is_visible = true 
-- WHERE store_id = 'STORE_ID_HERE';

-- Fix: If is_active is false on products:
-- UPDATE products
-- SET is_active = true
-- WHERE id IN (SELECT product_id FROM store_inventory WHERE store_id = 'STORE_ID_HERE');
