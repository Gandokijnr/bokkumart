-- BokkuMart RLS Enablement + Core Policies (Supabase / Postgres)
-- Run AFTER scripts/full_schema_bokkumart.sql
--
-- This file enables RLS on key tables and defines policies for:
-- - Customers managing their own data (profiles, addresses, carts, orders, notifications)
-- - Store staff/admins viewing operational data for their store
-- - Super admins managing staff + sensitive admin tables

BEGIN;

-- ==========================
-- PROFILES (staff management)
-- (based on docs/supabase-rls-policies.sql)
-- ==========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins view staff and managers" ON public.profiles;
CREATE POLICY "Super admins view staff and managers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  AND role IN ('branch_manager', 'staff', 'super_admin')
);

DROP POLICY IF EXISTS "Branch managers view staff and customers" ON public.profiles;
CREATE POLICY "Branch managers view staff and customers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_branch_manager()
  AND role IN ('staff', 'customer')
);

DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Branch managers can update staff and customers" ON public.profiles;
CREATE POLICY "Branch managers can update staff and customers"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_branch_manager()
  AND role IN ('staff', 'customer')
);

DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
CREATE POLICY "Super admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Branch managers can insert staff and customers" ON public.profiles;
CREATE POLICY "Branch managers can insert staff and customers"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_branch_manager()
  AND role IN ('staff', 'customer')
);

-- ==========================
-- ADDRESSES (customers own addresses)
-- ==========================
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses"
ON public.addresses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================
-- STORES / CATEGORIES / PRODUCTS (public read)
-- ==========================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;
CREATE POLICY "Public can read active stores"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (is_active = true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read visible products" ON public.products;
CREATE POLICY "Public can read visible products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true AND is_visible = true);

-- ==========================
-- STORE INVENTORY
-- - Customers can read inventory rows marked visible
-- - Staff can manage inventory for their store
-- ==========================
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible inventory" ON public.store_inventory;
CREATE POLICY "Public can read visible inventory"
ON public.store_inventory
FOR SELECT
TO anon, authenticated
USING (is_visible = true);

DROP POLICY IF EXISTS "Staff manage store inventory" ON public.store_inventory;
CREATE POLICY "Staff manage store inventory"
ON public.store_inventory
FOR ALL
TO authenticated
USING (public.is_store_staff(store_id))
WITH CHECK (public.is_store_staff(store_id));

-- ==========================
-- CARTS / CART ITEMS (customers own carts)
-- ==========================
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own carts" ON public.carts;
CREATE POLICY "Users manage own carts"
ON public.carts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;
CREATE POLICY "Users manage own cart items"
ON public.cart_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_id
      AND c.user_id = auth.uid()
  )
);

-- ==========================
-- ORDERS / ORDER ITEMS
-- - Customers can create/read their own orders
-- - Staff can read/update orders for their store
-- ==========================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;
CREATE POLICY "Users can update own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('pending','processing'))
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can read store orders" ON public.orders;
CREATE POLICY "Staff can read store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_store_staff(store_id));

DROP POLICY IF EXISTS "Staff can update store orders" ON public.orders;
CREATE POLICY "Staff can update store orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_store_staff(store_id))
WITH CHECK (public.is_store_staff(store_id));

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
CREATE POLICY "Users can read own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;
CREATE POLICY "Users can create own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can read store order items" ON public.order_items;
CREATE POLICY "Staff can read store order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND public.is_store_staff(o.store_id)
  )
);

-- ==========================
-- ORDER INTERACTIONS / RIDER DISPATCHES (staff operational)
-- ==========================
ALTER TABLE public.order_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage order interactions" ON public.order_interactions;
CREATE POLICY "Staff manage order interactions"
ON public.order_interactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND public.is_store_staff(o.store_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_id
      AND public.is_store_staff(o.store_id)
  )
);

ALTER TABLE public.rider_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage rider dispatches" ON public.rider_dispatches;
CREATE POLICY "Staff manage rider dispatches"
ON public.rider_dispatches
FOR ALL
TO authenticated
USING (public.is_store_staff(store_id))
WITH CHECK (public.is_store_staff(store_id));

-- ==========================
-- LOYALTY (customers read own)
-- ==========================
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own loyalty" ON public.loyalty_transactions;
CREATE POLICY "Users read own loyalty"
ON public.loyalty_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ==========================
-- CUSTOMER RESTRICTIONS (admin only)
-- ==========================
ALTER TABLE public.customer_restrictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage customer restrictions" ON public.customer_restrictions;
CREATE POLICY "Admins manage customer restrictions"
ON public.customer_restrictions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==========================
-- PROMO CODES (public read active)
-- ==========================
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active promo codes" ON public.promo_codes;
CREATE POLICY "Public read active promo codes"
ON public.promo_codes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- ==========================
-- PUSH NOTIFICATIONS / SUBSCRIPTIONS
-- ==========================
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notifications" ON public.push_notifications;
CREATE POLICY "Users manage own notifications"
ON public.push_notifications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id)
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ==========================
-- AUDIT LOGS (admin only)
-- ==========================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- ==========================
-- PLATFORM REVENUE (admin/finance)
-- ==========================
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read platform revenue" ON public.platform_revenue;
CREATE POLICY "Admins read platform revenue"
ON public.platform_revenue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('finance','super_admin','admin')
  )
);

ALTER TABLE public.platform_revenue_breakdown ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read platform revenue breakdown" ON public.platform_revenue_breakdown;
CREATE POLICY "Admins read platform revenue breakdown"
ON public.platform_revenue_breakdown
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('finance','super_admin','admin')
  )
);

-- ==========================
-- DRIVER EARNINGS / WITHDRAWALS
-- ==========================
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers read own earnings" ON public.driver_earnings;
CREATE POLICY "Drivers read own earnings"
ON public.driver_earnings
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Admins read all driver earnings" ON public.driver_earnings;
CREATE POLICY "Admins read all driver earnings"
ON public.driver_earnings
FOR SELECT
TO authenticated
USING (public.is_admin());

ALTER TABLE public.driver_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers manage own withdrawals" ON public.driver_withdrawals;
CREATE POLICY "Drivers manage own withdrawals"
ON public.driver_withdrawals
FOR ALL
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Admins manage withdrawals" ON public.driver_withdrawals;
CREATE POLICY "Admins manage withdrawals"
ON public.driver_withdrawals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('finance','super_admin','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('finance','super_admin','admin')
  )
);

-- ==========================
-- RIDER ONBOARDING
-- ==========================
ALTER TABLE public.rider_onboarding_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rider can insert own application" ON public.rider_onboarding_applications;
CREATE POLICY "Rider can insert own application"
ON public.rider_onboarding_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Rider can read own application" ON public.rider_onboarding_applications;
CREATE POLICY "Rider can read own application"
ON public.rider_onboarding_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can manage applications" ON public.rider_onboarding_applications;
CREATE POLICY "Super admin can manage applications"
ON public.rider_onboarding_applications
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

COMMIT;
