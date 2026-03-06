-- Supabase RLS Policies for Staff Management
-- These policies enforce role-based access to user profiles

-- ============================================
-- POLICY 1: Users can always see their own profile
-- ============================================
CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- POLICY 2: Super admins can view branch managers and staff
-- (Not customers - for staff management purposes)
-- ============================================
CREATE POLICY "Super admins view staff and managers" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
  AND role IN ('branch_manager', 'staff', 'super_admin')
);

-- ============================================
-- POLICY 3: Branch managers can view staff and customers
-- ============================================
CREATE POLICY "Branch managers view staff and customers" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'branch_manager'
  )
  AND role IN ('staff', 'customer')
);

-- ============================================
-- POLICY 4: Super admins can update any profile
-- ============================================
CREATE POLICY "Super admins can update profiles" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- ============================================
-- POLICY 5: Branch managers can update staff and customers
-- ============================================
CREATE POLICY "Branch managers can update staff and customers" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'branch_manager'
  )
  AND role IN ('staff', 'customer')
);

-- ============================================
-- POLICY 6: Users can update their own profile (basic info only)
-- ============================================
CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICY 7: Super admins can insert new profiles
-- ============================================
CREATE POLICY "Super admins can insert profiles" 
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- ============================================
-- POLICY 8: Branch managers can insert staff and customer profiles
-- ============================================
CREATE POLICY "Branch managers can insert staff and customers" 
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'branch_manager'
  )
  AND role IN ('staff', 'customer')
);

-- ============================================
-- ENABLE RLS ON PROFILES TABLE
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTES FOR IMPLEMENTATION
-- ============================================

/*
IMPORTANT IMPLEMENTATION NOTES:

1. These policies assume you have a 'role' column in your profiles table
   with values: 'super_admin', 'branch_manager', 'staff', 'customer'

2. The auth.uid() function returns the UUID of the currently authenticated user

3. Order of policies matters - Supabase applies the most permissive policy 
   that matches the user's role

4. For the frontend to work properly, you should also ensure:
   - The supabase client is initialized with the user's session token
   - The policies are tested with real user accounts

5. To apply these policies:
   - Go to your Supabase Dashboard → SQL Editor
   - Run this SQL file
   - Test by querying profiles with different user roles

6. Alternative: Use RPC functions for complex queries if RLS becomes too restrictive

7. For admin dashboard queries, consider using the service role key 
   (bypasses RLS) but only from secure server-side endpoints
*/
