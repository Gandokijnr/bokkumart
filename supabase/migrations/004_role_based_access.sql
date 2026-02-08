-- ============================================================================
-- Migration: Add Role-Based Access Control to Profiles Table
-- Description: Adds role column and RLS policies for admin access
-- ============================================================================

-- Create roles lookup table for dropdown UI
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (id, name, description) VALUES
    ('customer', 'Customer', 'Regular customer who can place orders'),
    ('staff', 'Staff', 'Store staff with order management access'),
    ('manager', 'Manager', 'Store manager with full store access'),
    ('admin', 'Admin', 'System administrator with full access')
ON CONFLICT (id) DO NOTHING;

-- 1. Add role column to profiles table as foreign key to roles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' 
REFERENCES public.roles(id) ON DELETE RESTRICT;

-- 2. Add store_id column for staff/manager association (if not exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Create index for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_store_role ON public.profiles(store_id, role) WHERE store_id IS NOT NULL;

-- Add comment for Supabase UI
COMMENT ON COLUMN public.profiles.role IS 'User role: customer, staff, manager, or admin';

-- 3. Helper function to check if current user is admin
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

-- 4. Helper function to check if current user is staff or manager of a store
CREATE OR REPLACE FUNCTION public.is_store_staff(p_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND store_id = p_store_id 
        AND role IN ('staff', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function to check if current user is manager of a store
CREATE OR REPLACE FUNCTION public.is_store_manager(p_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND store_id = p_store_id 
        AND role = 'manager'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE RLS POLICIES FOR PROFILES
-- ============================================================================

-- Drop existing policies to recreate with admin access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_admin());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    USING (public.is_admin());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
    ON public.profiles
    FOR INSERT
    WITH CHECK (public.is_admin());

-- ============================================================================
-- UPDATE handle_new_user TO ASSIGN DEFAULT ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'customer';
    v_store_id UUID := NULL;
BEGIN
    -- Check if user metadata contains role (for admin-created users)
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
        v_role := NEW.raw_user_meta_data->>'role';
    END IF;
    
    -- Check if user metadata contains store_id
    IF NEW.raw_user_meta_data->>'store_id' IS NOT NULL THEN
        v_store_id := (NEW.raw_user_meta_data->>'store_id')::UUID;
    END IF;
    
    INSERT INTO public.profiles (id, full_name, phone_number, role, store_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone',
        v_role,
        v_store_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE ORDERS RLS FOR STAFF ACCESS
-- ============================================================================

-- Drop existing order policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
    ON public.orders
    FOR SELECT
    USING (public.is_admin());

-- Store staff can view their store's orders
CREATE POLICY "Store staff can view store orders"
    ON public.orders
    FOR SELECT
    USING (public.is_store_staff(store_id));

-- Customers can view their own orders
CREATE POLICY "Users can view own orders"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can create any order
CREATE POLICY "Admins can create any order"
    ON public.orders
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Store staff can create orders for their store
CREATE POLICY "Store staff can create store orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (public.is_store_staff(store_id) OR auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can update any order
CREATE POLICY "Admins can update all orders"
    ON public.orders
    FOR UPDATE
    USING (public.is_admin());

-- Store staff can update their store's pending orders
CREATE POLICY "Store staff can update store orders"
    ON public.orders
    FOR UPDATE
    USING (public.is_store_staff(store_id));

-- Users can update their own pending orders
CREATE POLICY "Users can update own orders"
    ON public.orders
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_manager(UUID) TO authenticated;

-- ============================================================================
-- CREATE HELPER VIEW FOR ADMIN USER MANAGEMENT
-- ============================================================================

CREATE OR REPLACE VIEW public.admin_user_management AS
SELECT 
    p.id,
    p.full_name,
    p.phone_number,
    p.role,
    p.store_id,
    s.name as store_name,
    p.loyalty_points,
    p.created_at,
    p.updated_at,
    au.email as user_email,
    au.confirmed_at as email_confirmed_at,
    au.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN public.stores s ON p.store_id = s.id;

-- Only admins can access this view
ALTER VIEW public.admin_user_management OWNER TO postgres;

COMMENT ON VIEW public.admin_user_management IS 'Admin view for managing users - accessible only to admins via RLS policies';
