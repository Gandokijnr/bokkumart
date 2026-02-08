-- Profiles table for user data synced with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    default_address JSONB,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to create a new profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- RLS Policy: Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Create orders table for RLS demonstration (if not exists)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_address JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own orders
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own pending orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
    ON public.orders
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- ============================================
-- Addresses table (from former 004 migration)
-- ============================================
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label VARCHAR(20) NOT NULL CHECK (label IN ('home', 'work', 'other')),
    street_address TEXT NOT NULL,
    area VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Lagos',
    state VARCHAR(100) NOT NULL DEFAULT 'Lagos',
    landmark TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_primary ON addresses(user_id, is_primary);

-- Partial unique index to ensure only one primary address per user
CREATE UNIQUE INDEX idx_one_primary_per_user ON addresses(user_id, is_primary) WHERE (is_primary = true);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own addresses" ON addresses;
CREATE POLICY "Users can create own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
CREATE POLICY "Users can delete own addresses"
    ON addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Function to ensure only one primary address per user
CREATE OR REPLACE FUNCTION handle_address_primary_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE addresses 
        SET is_primary = false
        WHERE user_id = NEW.user_id 
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_handle_primary_address
    BEFORE INSERT OR UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION handle_address_primary_update();

CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to sync profile's default_address when primary address changes
CREATE OR REPLACE FUNCTION sync_profile_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE profiles
        SET default_address = jsonb_build_object(
            'id', NEW.id,
            'label', NEW.label,
            'street_address', NEW.street_address,
            'area', NEW.area,
            'landmark', NEW.landmark,
            'city', NEW.city,
            'state', NEW.state
        ),
        updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_profile_address
    AFTER INSERT OR UPDATE ON addresses
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION sync_profile_default_address();

-- ============================================
-- Loyalty system (from former 004 migration)
-- ============================================
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_redeemed INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'bonus', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(user_id, created_at DESC);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Users can view own loyalty transactions"
    ON loyalty_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- View for user profile summary with loyalty calculation
CREATE VIEW user_profile_summary AS
SELECT 
    p.id,
    p.full_name,
    p.phone_number,
    p.default_address,
    p.loyalty_points,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(lt.points_earned - lt.points_redeemed), 0) as lifetime_earned,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as lifetime_spent,
    (SELECT id FROM addresses WHERE user_id = p.id AND is_primary = true LIMIT 1) as primary_address_id
FROM profiles p
LEFT JOIN loyalty_transactions lt ON p.id = lt.user_id
LEFT JOIN orders o ON p.id = o.user_id
GROUP BY p.id, p.full_name, p.phone_number, p.default_address, p.loyalty_points, p.created_at, p.updated_at;

-- Function to calculate loyalty tier based on lifetime spending
CREATE OR REPLACE FUNCTION calculate_loyalty_tier(lifetime_spent DECIMAL)
RETURNS TEXT AS $$
BEGIN
    IF lifetime_spent >= 500000 THEN
        RETURN 'platinum';
    ELSIF lifetime_spent >= 200000 THEN
        RETURN 'gold';
    ELSIF lifetime_spent >= 50000 THEN
        RETURN 'silver';
    ELSE
        RETURN 'bronze';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's loyalty progress to next tier
CREATE OR REPLACE FUNCTION get_loyalty_progress(p_user_id UUID)
RETURNS TABLE (
    current_tier TEXT,
    next_tier TEXT,
    lifetime_spent DECIMAL,
    points_to_next_tier INTEGER,
    progress_percentage INTEGER
) AS $$
DECLARE
    v_lifetime_spent DECIMAL;
    v_current_tier TEXT;
    v_next_tier TEXT;
    v_points_to_next INTEGER;
    v_progress_percentage INTEGER;
BEGIN
    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_lifetime_spent
    FROM orders o
    WHERE o.user_id = p_user_id;
    
    v_current_tier := calculate_loyalty_tier(v_lifetime_spent);
    
    IF v_lifetime_spent >= 500000 THEN
        v_next_tier := 'max';
        v_points_to_next := 0;
    ELSIF v_lifetime_spent >= 200000 THEN
        v_next_tier := 'platinum';
        v_points_to_next := (500000 - v_lifetime_spent)::INTEGER;
    ELSIF v_lifetime_spent >= 50000 THEN
        v_next_tier := 'gold';
        v_points_to_next := (200000 - v_lifetime_spent)::INTEGER;
    ELSE
        v_next_tier := 'silver';
        v_points_to_next := (50000 - v_lifetime_spent)::INTEGER;
    END IF;
    
    IF v_current_tier = 'bronze' THEN
        v_progress_percentage := ((v_lifetime_spent / 50000) * 100)::INTEGER;
    ELSIF v_current_tier = 'silver' THEN
        v_progress_percentage := (((v_lifetime_spent - 50000) / 150000) * 100)::INTEGER;
    ELSIF v_current_tier = 'gold' THEN
        v_progress_percentage := (((v_lifetime_spent - 200000) / 300000) * 100)::INTEGER;
    ELSE
        v_progress_percentage := 100;
    END IF;
    
    RETURN QUERY SELECT v_current_tier, v_next_tier, v_lifetime_spent, v_points_to_next, v_progress_percentage;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_loyalty_tier(DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_loyalty_progress(UUID) TO authenticated;
