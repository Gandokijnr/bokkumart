-- ============================================
-- Sample Grocery Store Products Seed Data
-- 20 items for HomeAffairs Lagos
-- Note: Run this AFTER running the migrations
-- ============================================
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Dairy & Eggs', 'dairy-eggs', 'Milk, yogurt, cheese and eggs', 1),
  ('550e8400-e29b-41d4-a716-446655440001', 'Grains & Rice', 'grains-rice', 'Rice, pasta, noodles and grains', 2),
  ('550e8400-e29b-41d4-a716-446655440002', 'Beverages', 'beverages', 'Juices, sodas and drinks', 3),
  ('550e8400-e29b-41d4-a716-446655440003', 'Electronics', 'electronics', 'TVs and home appliances', 4),
  ('550e8400-e29b-41d4-a716-446655440004', 'Fresh Produce', 'fresh-produce', 'Fruits and vegetables', 5),
  ('550e8400-e29b-41d4-a716-446655440005', 'Meat & Seafood', 'meat-seafood', 'Fresh meat and fish', 6),
  ('550e8400-e29b-41d4-a716-446655440006', 'Cooking Oil', 'cooking-oil', 'Vegetable and groundnut oils', 7),
  ('550e8400-e29b-41d4-a716-446655440007', 'Bakery', 'bakery', 'Bread and baked goods', 8),
  ('550e8400-e29b-41d4-a716-446655440008', 'Condiments', 'condiments', 'Salt, sugar and seasonings', 9),
  ('550e8400-e29b-41d4-a716-446655440009', 'Kitchen Appliances', 'kitchen-appliances', 'Blenders, kettles and more', 10)
ON CONFLICT (id) DO NOTHING;

-- Insert sample products with category references
INSERT INTO products (id, name, description, sku, category_id, price, cost_price, unit, image_url, is_active, metadata) VALUES
  (gen_random_uuid(), 'Fresh Cow Milk', 'Premium fresh pasteurized milk, 1 liter carton', 'DAIRY-001', '550e8400-e29b-41d4-a716-446655440000', 850.00, 600.00, 'liter', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Milk', true, '{"brand": "Peak", "expiry_days": 14, "storage": "refrigerated"}'),
  
  (gen_random_uuid(), 'Basmati Rice', 'Long grain aromatic basmati rice, 5kg bag', 'GRAIN-001', '550e8400-e29b-41d4-a716-446655440001', 7500.00, 5500.00, '5kg bag', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Basmati+Rice', true, '{"origin": "India", "grade": "Premium"}'),
  
  (gen_random_uuid(), 'Nigerian Parboiled Rice', 'Local parboiled rice, 50kg bag', 'GRAIN-002', '550e8400-e29b-41d4-a716-446655440001', 65000.00, 52000.00, '50kg bag', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Local+Rice', true, '{"origin": "Nigeria", "region": "Kebbi"}'),
  
  (gen_random_uuid(), 'Orange Juice', '100% pure squeezed orange juice, no preservatives', 'BEV-001', '550e8400-e29b-41d4-a716-446655440002', 1200.00, 800.00, '1 liter', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Orange+Juice', true, '{"type": "fresh", "vitamin_c": "high"}'),
  
  (gen_random_uuid(), 'Samsung 43" Smart TV', 'Crystal UHD 4K Smart TV with built-in apps', 'ELEC-001', '550e8400-e29b-41d4-a716-446655440003', 245000.00, 195000.00, 'piece', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Smart+TV', true, '{"brand": "Samsung", "warranty_months": 24, "resolution": "4K"}'),
  
  (gen_random_uuid(), 'Yogurt Parfait', 'Layered Greek yogurt with granola and berries', 'DAIRY-002', '550e8400-e29b-41d4-a716-446655440000', 1800.00, 1100.00, 'cup', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Yogurt+Parfait', true, '{"flavor": "mixed berry", "protein": "high"}'),
  
  (gen_random_uuid(), 'Chicken Breast', 'Boneless skinless chicken breast, fresh', 'MEAT-001', '550e8400-e29b-41d4-a716-446655440005', 4500.00, 3200.00, 'kg', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Chicken+Breast', true, '{"type": "fresh", "halal": true}'),
  
  (gen_random_uuid(), 'Vegetable Oil', 'Pure vegetable cooking oil, 5 liters', 'OIL-001', '550e8400-e29b-41d4-a716-446655440006', 9500.00, 7200.00, '5 liters', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Vegetable+Oil', true, '{"brand": "Golden Penny", "cholesterol_free": true}'),
  
  (gen_random_uuid(), 'Spaghetti Pasta', 'Italian durum wheat spaghetti, 500g pack', 'PASTA-001', '550e8400-e29b-41d4-a716-446655440001', 650.00, 450.00, '500g pack', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Spaghetti', true, '{"brand": "Dangote", "cooking_time": "8-10 min"}'),
  
  (gen_random_uuid(), 'Fresh Tomatoes', 'Ripe red tomatoes, freshly harvested', 'PRODUCE-001', '550e8400-e29b-41d4-a716-446655440004', 800.00, 500.00, 'kg', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Tomatoes', true, '{"origin": "Jos", "organic": false}'),
  
  (gen_random_uuid(), 'Yellow Plantain', 'Ripe plantain for frying or roasting', 'PRODUCE-002', '550e8400-e29b-41d4-a716-446655440004', 600.00, 380.00, 'kg', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Plantain', true, '{"ripeness": "ripe", "cooking_methods": ["fry", "roast"]}'),
  
  (gen_random_uuid(), 'Blender 1.5L', 'Multi-function kitchen blender with grinder', 'APPL-001', '550e8400-e29b-41d4-a716-446655440009', 28500.00, 19500.00, 'piece', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Blender', true, '{"brand": "Binatone", "warranty_months": 12, "power": "500W"}'),
  
  (gen_random_uuid(), 'Coca-Cola', 'Classic Coca-Cola soda, 1.5 liter bottle', 'BEV-002', '550e8400-e29b-41d4-a716-446655440002', 600.00, 400.00, '1.5 liter', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Coca+Cola', true, '{"sugar_content": "high", "carbonated": true}'),
  
  (gen_random_uuid(), 'Whole Wheat Bread', 'Freshly baked whole wheat sliced bread', 'BAKERY-001', '550e8400-e29b-41d4-a716-446655440007', 800.00, 520.00, 'loaf', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Bread', true, '{"slices": 12, "fiber": "high", "baked_today": true}'),
  
  (gen_random_uuid(), 'Instant Noodles', 'Indomie noodles chicken flavor, pack of 5', 'NOODLE-001', '550e8400-e29b-41d4-a716-446655440001', 550.00, 380.00, 'pack', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Noodles', true, '{"brand": "Indomie", "flavor": "chicken", "cooking_time": "3 min"}'),
  
  (gen_random_uuid(), 'Groundnut Oil', 'Pure groundnut oil for cooking, 3 liters', 'OIL-002', '550e8400-e29b-41d4-a716-446655440006', 6800.00, 5100.00, '3 liters', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Groundnut+Oil', true, '{"cold_pressed": true, "smoke_point": "high"}'),
  
  (gen_random_uuid(), 'Tilapia Fish', 'Fresh whole tilapia fish, cleaned and gutted', 'SEAFOOD-001', '550e8400-e29b-41d4-a716-446655440005', 3500.00, 2500.00, 'kg', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Tilapia', true, '{"source": "farm raised", "fresh": true}'),
  
  (gen_random_uuid(), 'Sugar 1kg', 'Refined white granulated sugar', 'COND-001', '550e8400-e29b-41d4-a716-446655440008', 900.00, 650.00, 'kg', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Sugar', true, '{"type": "refined", "grade": "A"}'),
  
  (gen_random_uuid(), 'Salt 500g', 'Iodized table salt, 500g pack', 'COND-002', '550e8400-e29b-41d4-a716-446655440008', 250.00, 150.00, '500g pack', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Salt', true, '{"iodized": true, "type": "fine"}'),
  
  (gen_random_uuid(), 'Electric Kettle', 'Stainless steel electric kettle, 1.7L', 'APPL-002', '550e8400-e29b-41d4-a716-446655440009', 12500.00, 8500.00, 'piece', 'https://placehold.co/300x300/f5f5f5/dc2626?text=Kettle', true, '{"brand": "Polystar", "power": "1500W", "auto_shutoff": true}');

-- ============================================
-- Seed Store Inventory (add products to stores with stock levels)
-- ============================================

-- Insert inventory for all 4 stores
INSERT INTO store_inventory (store_id, product_id, stock_level, reserved_stock, digital_buffer, is_visible, store_price)
SELECT 
  s.id as store_id,
  p.id as product_id,
  CASE 
    WHEN p.category_id = '550e8400-e29b-41d4-a716-446655440004' THEN floor(random() * 50 + 20)::int  -- Fresh Produce: 20-70
    WHEN p.category_id = '550e8400-e29b-41d4-a716-446655440005' THEN floor(random() * 30 + 10)::int  -- Meat: 10-40
    WHEN p.category_id = '550e8400-e29b-41d4-a716-446655440007' THEN floor(random() * 20 + 5)::int   -- Bakery: 5-25
    ELSE floor(random() * 100 + 50)::int  -- Others: 50-150
  END as stock_level,
  0 as reserved_stock,
  2 as digital_buffer,
  true as is_visible,
  NULL as store_price  -- Use default product price
FROM stores s
CROSS JOIN products p
WHERE p.is_active = true
ON CONFLICT (store_id, product_id) DO NOTHING;
