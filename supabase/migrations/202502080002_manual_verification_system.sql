-- Manual Order Verification System - Database Schema Updates
-- Adds verification tracking columns to orders table

-- Add verification tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS call_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_call_attempt_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_details TEXT,
ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_method TEXT; -- 'phone_call', 'manual_override'

-- Index for efficient verification queue queries
CREATE INDEX IF NOT EXISTS idx_orders_status_verification ON orders(status, claimed_by) WHERE status = 'awaiting_call';
CREATE INDEX IF NOT EXISTS idx_orders_verified_at ON orders(verified_at);
CREATE INDEX IF NOT EXISTS idx_orders_claimed_by ON orders(claimed_by);

-- ============================================
-- RLS Policies for Staff Access
-- ============================================

-- Enable RLS on orders table (if not already enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Staff can view awaiting_call orders" ON orders;
DROP POLICY IF EXISTS "Staff can update order verification status" ON orders;
DROP POLICY IF EXISTS "Staff can claim orders" ON orders;

-- Policy: Staff can view orders awaiting verification
CREATE POLICY "Staff can view awaiting_call orders" ON orders
  FOR SELECT
  TO authenticated
  USING (
    status IN ('awaiting_call', 'confirmed', 'packing', 'ready', 'out_for_delivery') 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Policy: Staff can update verification status (verify/reject/claim)
CREATE POLICY "Staff can update order verification status" ON orders
  FOR UPDATE
  TO authenticated
  USING (
    status IN ('awaiting_call', 'confirmed') 
    AND (
      -- Can update if staff claimed it or it's unclaimed
      (claimed_by = auth.uid() OR claimed_by IS NULL)
      AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('staff', 'admin', 'manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Policy: Staff can update call attempt info
CREATE POLICY "Staff can update call attempts" ON orders
  FOR UPDATE
  TO authenticated
  USING (
    status = 'awaiting_call'
    AND (
      claimed_by = auth.uid() 
      OR claimed_by IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  )
  WITH CHECK (true);

-- ============================================
-- Create user_roles table for staff management
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin', 'manager', 'driver')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
DROP POLICY IF EXISTS "Staff can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Staff can view their own role" ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if current user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('staff', 'admin', 'manager')
    AND is_active = true
  );
END;
$$;

-- Function to claim an order (with race condition protection)
CREATE OR REPLACE FUNCTION claim_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claimed_by UUID;
BEGIN
  -- Try to claim the order if it's unclaimed
  UPDATE orders
  SET claimed_by = auth.uid(),
      claimed_at = NOW()
  WHERE id = p_order_id
    AND status = 'awaiting_call'
    AND (claimed_by IS NULL OR claimed_by = auth.uid());
  
  -- Check if we successfully claimed it
  SELECT claimed_by INTO v_claimed_by
  FROM orders
  WHERE id = p_order_id;
  
  RETURN v_claimed_by = auth.uid();
END;
$$;

-- Function to verify an order
CREATE OR REPLACE FUNCTION verify_order(p_order_id UUID, p_method TEXT DEFAULT 'phone_call')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET status = 'confirmed',
      confirmation_status = 'confirmed_by_phone',
      confirmation_method = p_method,
      verified_at = NOW(),
      verified_by = auth.uid(),
      verification_method = p_method,
      updated_at = NOW()
  WHERE id = p_order_id
    AND claimed_by = auth.uid()
    AND status = 'awaiting_call';
  
  RETURN FOUND;
END;
$$;

-- Function to reject/cancel an order
CREATE OR REPLACE FUNCTION reject_order(p_order_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled',
      confirmation_status = 'cancelled_by_phone',
      rejection_reason = p_reason,
      rejection_details = p_details,
      verified_at = NOW(),
      verified_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_order_id
    AND claimed_by = auth.uid()
    AND status = 'awaiting_call';
  
  RETURN FOUND;
END;
$$;

-- Function to record a call attempt
CREATE OR REPLACE FUNCTION record_call_attempt(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE orders
  SET call_attempt_count = call_attempt_count + 1,
      last_call_attempt_at = NOW()
  WHERE id = p_order_id
    AND claimed_by = auth.uid()
    AND status = 'awaiting_call';
  
  RETURN FOUND;
END;
$$;

-- ============================================
-- Seed a default admin user (optional, update email)
-- ============================================
-- To be run manually with the actual admin user ID:
-- INSERT INTO user_roles (user_id, role, assigned_by) 
-- VALUES ('your-admin-uuid-here', 'admin', 'your-admin-uuid-here')
-- ON CONFLICT DO NOTHING;
