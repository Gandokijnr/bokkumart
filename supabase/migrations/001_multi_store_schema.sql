-- ============================================
-- Multi-Store Location & Inventory System
-- HomeAffairs Lagos Branch Schema
-- ============================================

-- Enable PostGIS extension for geolocation queries (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Stores table: Lagos branch locations
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, -- e.g., 'HomeAffairs Ogudu'
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'OGD', 'GBG', 'OSH', 'VI'
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Lagos',
    state VARCHAR(100) NOT NULL DEFAULT 'Lagos',
    latitude DECIMAL(10, 8) NOT NULL, -- e.g., 6.6018
    longitude DECIMAL(11, 8) NOT NULL, -- e.g., 3.3515
    phone VARCHAR(20),
    email VARCHAR(255),
    operating_hours JSONB NOT NULL DEFAULT '{
        "monday": {"open": "08:00", "close": "21:00", "isOpen": true},
        "tuesday": {"open": "08:00", "close": "21:00", "isOpen": true},
        "wednesday": {"open": "08:00", "close": "21:00", "isOpen": true},
        "thursday": {"open": "08:00", "close": "21:00", "isOpen": true},
        "friday": {"open": "08:00", "close": "22:00", "isOpen": true},
        "saturday": {"open": "08:00", "close": "22:00", "isOpen": true},
        "sunday": {"open": "10:00", "close": "20:00", "isOpen": true}
    }'::jsonb,
    pickup_instructions TEXT, -- e.g., 'Pickup at the Gbagada Mall entrance'
    delivery_radius_km DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    base_delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
    per_km_delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_flagship BOOLEAN NOT NULL DEFAULT false, -- Main branch
    features JSONB DEFAULT '[]'::jsonb, -- e.g., ['bakery', 'pharmacy', 'wine_cellar']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Categories table (for product organization)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Products table (referenced by store_inventory)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10, 2),
    unit VARCHAR(50) DEFAULT 'piece', -- e.g., 'kg', 'liter', 'pack'
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store inventory: Many-to-many relationship between stores and products
CREATE TABLE IF NOT EXISTS store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_level INTEGER NOT NULL DEFAULT 0, -- Physical stock count
    reserved_stock INTEGER NOT NULL DEFAULT 0, -- Reserved for pending orders
    available_stock INTEGER GENERATED ALWAYS AS (stock_level - reserved_stock) STORED,
    digital_buffer INTEGER NOT NULL DEFAULT 2, -- Stock buffer: show as OOS if stock <= buffer
    is_visible BOOLEAN NOT NULL DEFAULT true,
    store_price DECIMAL(10, 2), -- Optional store-specific pricing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(store_id, product_id)
);

-- Index for efficient inventory queries
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_id ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_product_id ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_available ON store_inventory(store_id, available_stock) WHERE available_stock > 0;

-- Store-specific promotions/pricing
CREATE TABLE IF NOT EXISTS store_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    promotional_price DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(store_id, product_id, start_date)
);

-- User store preferences (if user is logged in)
CREATE TABLE IF NOT EXISTS user_store_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    last_selected_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    preferred_delivery_address JSONB, -- Saved delivery address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Store zones for delivery pricing (Lagos-specific)
CREATE TABLE IF NOT EXISTS store_delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL, -- e.g., 'Zone 1', 'Island', 'Mainland'
    min_distance_km DECIMAL(5, 2) NOT NULL DEFAULT 0,
    max_distance_km DECIMAL(5, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    estimated_delivery_mins INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for Lagos HomeAffairs branches (idempotent)
INSERT INTO stores (name, code, address, latitude, longitude, phone, pickup_instructions, is_flagship, base_delivery_fee) VALUES
('HomeAffairs Ogudu', 'OGD', 'Ogudu Mall, Ogudu Road, Lagos', 6.6018, 3.3515, '+234 1 234 5670', 'Pickup at the main entrance near the parking lot', false, 1500.00),
('HomeAffairs Gbagada', 'GBG', 'Gbagada Shopping Complex, Gbagada Expressway, Lagos', 6.5538, 3.3869, '+234 1 234 5671', 'Pickup at the Gbagada Mall entrance, ground floor', false, 1500.00),
('HomeAffairs Oshodi', 'OSH', 'Oshodi Market Plaza, Oshodi-Isolo Expressway, Lagos', 6.5578, 3.3436, '+234 1 234 5672', 'Pickup at Gate 3, near the food court', false, 1500.00),
('HomeAffairs Victoria Island', 'VI', 'The Palms Shopping Mall, Lekki-Epe Expressway, Victoria Island, Lagos', 6.4355, 3.4550, '+234 1 234 5673', 'Pickup at The Palms main entrance, VIP parking area', true, 2000.00)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS (Row Level Security) for all tables
DO $$ BEGIN
    ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE store_promotions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE user_store_preferences ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE store_delivery_zones ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON stores;
CREATE POLICY "Stores are viewable by everyone" ON stores FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Store inventory is viewable by everyone" ON store_inventory;
CREATE POLICY "Store inventory is viewable by everyone" ON store_inventory FOR SELECT USING (is_visible = true);
DROP POLICY IF EXISTS "User preferences are viewable by owner" ON user_store_preferences;
CREATE POLICY "User preferences are viewable by owner" ON user_store_preferences FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User preferences are editable by owner" ON user_store_preferences;
CREATE POLICY "User preferences are editable by owner" ON user_store_preferences FOR ALL USING (auth.uid() = user_id);

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_store_inventory_updated_at ON store_inventory;
CREATE TRIGGER update_store_inventory_updated_at BEFORE UPDATE ON store_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_store_promotions_updated_at ON store_promotions;
CREATE TRIGGER update_store_promotions_updated_at BEFORE UPDATE ON store_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_store_preferences_updated_at ON user_store_preferences;
CREATE TRIGGER update_user_store_preferences_updated_at BEFORE UPDATE ON user_store_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for available products at each store (with digital buffer applied)
CREATE OR REPLACE VIEW available_store_products AS
SELECT 
    si.store_id,
    s.name as store_name,
    si.product_id,
    p.name as product_name,
    CASE 
        WHEN si.available_stock > si.digital_buffer THEN si.available_stock - si.digital_buffer
        ELSE 0
    END as display_stock,
    si.available_stock > si.digital_buffer as is_available,
    si.digital_buffer,
    si.store_price,
    COALESCE(sp.promotional_price, si.store_price, p.price) as final_price
FROM store_inventory si
JOIN stores s ON si.store_id = s.id
JOIN products p ON si.product_id = p.id
LEFT JOIN store_promotions sp ON sp.store_id = si.store_id 
    AND sp.product_id = si.product_id 
    AND sp.is_active = true 
    AND sp.start_date <= NOW() 
    AND sp.end_date >= NOW()
WHERE si.is_visible = true AND s.is_active = true;

-- ============================================
-- RPC Functions for Stock Management
-- ============================================

-- Reserve stock atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION reserve_stock(
    p_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_available INTEGER;
    v_buffer INTEGER;
BEGIN
    -- Lock the row and get current values
    SELECT available_stock, digital_buffer 
    INTO v_available, v_buffer
    FROM store_inventory
    WHERE store_id = p_store_id AND product_id = p_product_id
    FOR UPDATE;
    
    -- Check if enough stock available (accounting for buffer)
    IF v_available IS NULL OR (v_available - v_buffer) < p_quantity THEN
        RETURN false;
    END IF;
    
    -- Reserve the stock
    UPDATE store_inventory
    SET reserved_stock = reserved_stock + p_quantity,
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = p_product_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Release reserved stock (when order is cancelled)
CREATE OR REPLACE FUNCTION release_stock(
    p_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE store_inventory
    SET reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = p_product_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Confirm stock (move from reserved to actual deduction)
CREATE OR REPLACE FUNCTION confirm_stock_deduction(
    p_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE store_inventory
    SET stock_level = stock_level - p_quantity,
        reserved_stock = GREATEST(0, reserved_stock - p_quantity),
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = p_product_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;
