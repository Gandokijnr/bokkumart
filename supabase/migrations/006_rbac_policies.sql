-- ============================================
-- RBAC Row Level Security Policies
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is staff or manager
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'manager', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORDERS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- Policy 1: Admins can SELECT all orders
CREATE POLICY "Admins can view all orders"
    ON orders
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Policy 2: Staff/Manager can SELECT all orders (for operations)
CREATE POLICY "Staff can view all orders"
    ON orders
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

-- Policy 3: Customers can only SELECT their own orders
CREATE POLICY "Customers can view own orders"
    ON orders
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        AND NOT public.is_staff()  -- Staff should use the staff policy above
    );

-- Policy 4: Staff can UPDATE orders (for status changes)
CREATE POLICY "Staff can update orders"
    ON orders
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Policy 5: Admins can UPDATE all orders (full control)
CREATE POLICY "Admins can update all orders"
    ON orders
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy 6: Allow INSERT for authenticated users (creating orders)
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
    ON orders
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- PROFILES TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Policy: Admins can update all profiles (for role management)
CREATE POLICY "Admins can update all profiles"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Policy: Users can update own profile (except role)
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Prevent users from changing their own role
        AND (
            SELECT role FROM profiles WHERE id = auth.uid()
        ) = role
    );

-- ============================================
-- PRODUCTS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;

-- Policy: Anyone can view products
CREATE POLICY "Anyone can view products"
    ON products
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Admins can manage products
CREATE POLICY "Admins can manage products"
    ON products
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy: Managers can update products
CREATE POLICY "Managers can update products"
    ON products
    FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_admin())
    WITH CHECK (public.is_manager_or_admin());

-- ============================================
-- STORES TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;

-- Policy: Anyone can view active stores
CREATE POLICY "Anyone can view stores"
    ON stores
    FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Policy: Admins can manage stores
CREATE POLICY "Admins can manage stores"
    ON stores
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- STORE_INVENTORY TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view store inventory" ON store_inventory;
DROP POLICY IF EXISTS "Staff can update inventory" ON store_inventory;
DROP POLICY IF EXISTS "Admins can manage store inventory" ON store_inventory;

-- Policy: Staff can view all store inventory (for inventory management)
DROP POLICY IF EXISTS "Staff can view store inventory" ON store_inventory;
CREATE POLICY "Staff can view store inventory"
    ON store_inventory
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

-- Policy: Anyone can view store inventory
CREATE POLICY "Anyone can view store inventory"
    ON store_inventory
    FOR SELECT
    TO authenticated
    USING (is_visible = true);

-- Policy: Staff can update inventory (for inventory kill switch)
CREATE POLICY "Staff can update inventory"
    ON store_inventory
    FOR UPDATE
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- Policy: Admins can manage store inventory
CREATE POLICY "Admins can manage store inventory"
    ON store_inventory
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- ORDER_LOGS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can view order logs" ON order_logs;
DROP POLICY IF EXISTS "Staff can create order logs" ON order_logs;

-- Policy: Staff can view order logs for orders they have access to
CREATE POLICY "Staff can view order logs"
    ON order_logs
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

-- Policy: Staff can create order logs
CREATE POLICY "Staff can create order logs"
    ON order_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND public.is_staff()
    );

-- ============================================
-- INVENTORY_LOGS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can view inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Staff can create inventory logs" ON inventory_logs;

-- Policy: Staff can view inventory logs
CREATE POLICY "Staff can view inventory logs"
    ON inventory_logs
    FOR SELECT
    TO authenticated
    USING (public.is_staff());

-- Policy: Staff can create inventory logs
CREATE POLICY "Staff can create inventory logs"
    ON inventory_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND public.is_staff()
    );

-- ============================================
-- CATEGORIES TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Policy: Anyone can view categories
CREATE POLICY "Anyone can view categories"
    ON categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Admins can manage categories
CREATE POLICY "Admins can manage categories"
    ON categories
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
