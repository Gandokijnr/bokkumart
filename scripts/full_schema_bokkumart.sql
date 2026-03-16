-- BokkuMart Full Database Schema (Supabase / Postgres)
-- Generated using app/types/database.types.ts as a structural guide.
-- This is intended to be run in Supabase SQL Editor.
--
-- Notes:
-- - Includes core tables, enums, key constraints, and essential RPC functions used by the app.
-- - RLS policies are NOT fully recreated here; apply/adjust separately as needed.

BEGIN;

-- Extensions commonly used by Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================
-- ENUMS
-- ==========================
DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM (
    'customer','staff','admin','manager','super_admin','branch_manager','finance','driver'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_status AS ENUM ('offline','available','on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.address_label AS ENUM ('home','work','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending','processing','paid','confirmed','ready_for_pos','completed_in_pos',
    'assigned','picked_up','arrived','delivered','cancelled','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_method AS ENUM ('pickup','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('online','pod');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_channel AS ENUM ('platform','in_store');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','cancelled','expired','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.loyalty_transaction_type AS ENUM ('earned','redeemed','bonus','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_interaction_type AS ENUM (
    'call_attempt','verification','rejection','status_change','note_added','rider_assigned','customer_complaint'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_interaction_outcome AS ENUM (
    'answered','no_answer','busy','wrong_number','confirmed','rejected','callback_requested','voicemail','disconnected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rider_dispatch_status AS ENUM ('dispatched','picked_up','in_transit','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_restriction_type AS ENUM (
    'pod_disabled','account_suspended','order_limit','manual_verification_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role_type AS ENUM ('customer','staff','admin','manager','finance','driver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_action_type AS ENUM (
    'price_change','inventory_update','stock_adjustment','product_visibility_change','manager_assignment','role_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_entity_type AS ENUM ('product','store_inventory','store','profile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.promo_discount_type AS ENUM ('percentage','fixed_amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.platform_revenue_status AS ENUM ('pending','locked','paid','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_withdrawal_status AS ENUM ('pending','approved','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.store_delivery_mode AS ENUM ('manual','automatic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================
-- TABLES
-- ==========================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text NULL,
  phone_number text NULL,
  default_address jsonb NULL,
  loyalty_points integer NOT NULL DEFAULT 0,
  role public.profile_role NOT NULL DEFAULT 'customer',
  store_id uuid NULL,
  managed_store_ids uuid[] NULL,
  driver_status public.driver_status NOT NULL DEFAULT 'offline',
  referral_code text NULL,
  referred_by uuid NULL,
  first_order_discount_used boolean NOT NULL DEFAULT false,
  push_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create a profile row for every new auth user
-- This is the standard Supabase pattern: auth.users (signup) -> public.profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'phone_number',
    'customer',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label public.address_label NOT NULL,
  street_address text NOT NULL,
  area text NOT NULL,
  city text NOT NULL DEFAULT 'Lagos',
  state text NOT NULL DEFAULT 'Lagos State',
  landmark text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON public.addresses(user_id);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  parent_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_uniq UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  sku text NULL,
  barcode text NULL,
  retailman_product_id text NULL,
  category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  cost_price numeric NULL,
  unit text NOT NULL DEFAULT 'unit',
  image_url text NULL,
  is_visible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'Lagos',
  state text NOT NULL DEFAULT 'Lagos State',
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  phone text NULL,
  email text NULL,
  operating_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  pickup_instructions text NULL,
  delivery_radius_km numeric NOT NULL DEFAULT 15,
  base_delivery_fee numeric NOT NULL DEFAULT 1000,
  per_km_delivery_fee numeric NOT NULL DEFAULT 100,
  paystack_subaccount_code text NULL,
  platform_percentage numeric NULL,
  fixed_commission numeric NULL,
  paystack_settlement_bank_name text NULL,
  paystack_settlement_account_number text NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_flagship boolean NOT NULL DEFAULT false,
  is_pilot_branch boolean NOT NULL DEFAULT false,
  pilot_mode_enabled boolean NOT NULL DEFAULT false,
  delivery_mode public.store_delivery_mode NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stores_code_uniq UNIQUE (code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_store_id_fk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_store_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  delivery_method public.delivery_method NOT NULL,
  delivery_details jsonb NULL,
  pickup_time text NULL,
  paystack_reference text NULL,
  paystack_transaction_id text NULL,
  payment_split_log jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL,
  delivered_at timestamptz NULL,
  driver_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NULL,
  picked_up_at timestamptz NULL,
  arrived_at timestamptz NULL,
  confirmation_code text NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'online',
  channel public.order_channel NOT NULL DEFAULT 'platform',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  nearest_landmark text NULL,
  driver_notes text NULL,
  pos_receipt_number text NULL,
  pos_processed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  pos_processed_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  points_earned integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  transaction_type public.loyalty_transaction_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_transactions_user_id_idx ON public.loyalty_transactions(user_id);

CREATE TABLE IF NOT EXISTS public.store_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_level integer NOT NULL DEFAULT 0,
  reserved_stock integer NOT NULL DEFAULT 0,
  available_stock integer NOT NULL DEFAULT 0,
  digital_buffer integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  store_price numeric NULL,
  aisle text NULL,
  shelf text NULL,
  section text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_inventory_store_product_uniq UNIQUE (store_id, product_id)
);
CREATE INDEX IF NOT EXISTS store_inventory_store_id_idx ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS store_inventory_product_id_idx ON public.store_inventory(product_id);

CREATE TABLE IF NOT EXISTS public.order_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  interaction_type public.order_interaction_type NOT NULL,
  outcome public.order_interaction_outcome NULL,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_address boolean NOT NULL DEFAULT false,
  verified_amount boolean NOT NULL DEFAULT false,
  verified_substitutions boolean NOT NULL DEFAULT false,
  substitution_approved boolean NOT NULL DEFAULT false,
  substitution_details text NULL
);
CREATE INDEX IF NOT EXISTS order_interactions_order_id_idx ON public.order_interactions(order_id);
CREATE INDEX IF NOT EXISTS order_interactions_staff_id_idx ON public.order_interactions(staff_id);

CREATE TABLE IF NOT EXISTS public.rider_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  rider_name text NOT NULL,
  rider_phone text NULL,
  rider_vehicle_type text NOT NULL DEFAULT 'bike',
  dispatched_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  estimated_arrival timestamptz NULL,
  actual_pickup_at timestamptz NULL,
  actual_delivery_at timestamptz NULL,
  status public.rider_dispatch_status NOT NULL DEFAULT 'dispatched',
  customer_notified boolean NOT NULL DEFAULT false,
  customer_notification_sent_at timestamptz NULL,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rider_dispatches_order_id_idx ON public.rider_dispatches(order_id);
CREATE INDEX IF NOT EXISTS rider_dispatches_store_id_idx ON public.rider_dispatches(store_id);

CREATE TABLE IF NOT EXISTS public.customer_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restriction_type public.customer_restriction_type NOT NULL,
  reason text NOT NULL,
  details text NULL,
  expires_at timestamptz NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS customer_restrictions_user_id_idx ON public.customer_restrictions(user_id);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role_type NOT NULL,
  assigned_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);

CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name text NULL,
  delivery_method public.delivery_method NULL,
  delivery_address jsonb NULL,
  contact_phone text NULL,
  delivery_zone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carts_user_id_idx ON public.carts(user_id);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  name text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  max_quantity integer NOT NULL,
  digital_buffer integer NOT NULL DEFAULT 0,
  image_url text NULL,
  options jsonb NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON public.cart_items(cart_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  user_name text NULL,
  action_type public.audit_action_type NOT NULL,
  entity_type public.audit_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name text NULL,
  old_value jsonb NULL,
  new_value jsonb NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_store_id_idx ON public.audit_logs(store_id);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NULL,
  discount_type public.promo_discount_type NOT NULL,
  discount_value numeric NOT NULL,
  min_order_amount numeric NULL,
  max_discount numeric NULL,
  usage_limit integer NULL,
  usage_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_uniq UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  data jsonb NULL,
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_notifications_user_id_idx ON public.push_notifications(user_id);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'customer',
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_uniq UNIQUE (endpoint)
);

CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  gross_sales numeric NOT NULL DEFAULT 0,
  platform_percentage numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  delivery_fees_excluded numeric NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  status public.platform_revenue_status NOT NULL DEFAULT 'pending',
  invoice_number text NULL,
  invoice_generated_at timestamptz NULL,
  invoice_pdf_url text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_revenue_month_year_uniq UNIQUE (month, year)
);

CREATE TABLE IF NOT EXISTS public.platform_revenue_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_revenue_id uuid NOT NULL REFERENCES public.platform_revenue(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  store_name text NULL,
  order_count integer NOT NULL DEFAULT 0,
  gross_sales numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  delivery_fees numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_revenue_breakdown_uniq UNIQUE (platform_revenue_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_fee numeric NOT NULL DEFAULT 0,
  tip_amount numeric NULL,
  total_earned numeric NOT NULL DEFAULT 0,
  is_withdrawn boolean NOT NULL DEFAULT false,
  withdrawn_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT driver_earnings_order_uniq UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS public.driver_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric NOT NULL,
  status public.driver_withdrawal_status NOT NULL DEFAULT 'pending',
  bank_name text NULL,
  account_number text NULL,
  account_name text NULL,
  processed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at timestamptz NULL,
  rejection_reason text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Rider onboarding (present in docs/*.sql, used by app)
CREATE TABLE IF NOT EXISTS public.rider_onboarding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  personal jsonb NOT NULL,
  vehicle jsonb NOT NULL,
  payout jsonb NOT NULL,
  phone_verification jsonb NOT NULL,
  reviewed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rider_onboarding_user_uniq UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS rider_onboarding_status_idx ON public.rider_onboarding_applications(status);

-- ==========================
-- VIEW
-- ==========================
CREATE OR REPLACE VIEW public.user_profile_summary AS
SELECT
  p.id,
  p.full_name,
  p.phone_number,
  p.default_address,
  p.loyalty_points,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(CASE WHEN lt.transaction_type IN ('earned','bonus') THEN lt.points_earned ELSE 0 END), 0) AS lifetime_earned,
  COALESCE(COUNT(DISTINCT o.id), 0) AS total_orders,
  COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS lifetime_spent,
  (
    SELECT a.id::text
    FROM public.addresses a
    WHERE a.user_id = p.id AND a.is_primary = true
    ORDER BY a.created_at DESC
    LIMIT 1
  ) AS primary_address_id
FROM public.profiles p
LEFT JOIN public.loyalty_transactions lt ON lt.user_id = p.id
LEFT JOIN public.orders o ON o.user_id = p.id
GROUP BY p.id;

-- ==========================
-- FUNCTIONS (RPC)
-- ==========================

CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(lifetime_spent numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF lifetime_spent >= 500000 THEN RETURN 'platinum';
  ELSIF lifetime_spent >= 200000 THEN RETURN 'gold';
  ELSIF lifetime_spent >= 50000 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_loyalty_progress(p_user_id uuid)
RETURNS TABLE (
  current_tier text,
  next_tier text,
  lifetime_spent numeric,
  points_to_next_tier numeric,
  progress_percentage numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  spent numeric := 0;
  cur text;
  next text;
  next_threshold numeric;
  cur_threshold numeric;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0)
  INTO spent
  FROM public.orders o
  WHERE o.user_id = p_user_id;

  cur := public.calculate_loyalty_tier(spent);

  IF cur = 'bronze' THEN
    next := 'silver'; cur_threshold := 0; next_threshold := 50000;
  ELSIF cur = 'silver' THEN
    next := 'gold'; cur_threshold := 50000; next_threshold := 200000;
  ELSIF cur = 'gold' THEN
    next := 'platinum'; cur_threshold := 200000; next_threshold := 500000;
  ELSE
    next := 'platinum'; cur_threshold := 500000; next_threshold := 500000;
  END IF;

  current_tier := cur;
  next_tier := next;
  lifetime_spent := spent;

  points_to_next_tier := GREATEST(next_threshold - spent, 0);

  IF next_threshold = cur_threshold THEN
    progress_percentage := 100;
  ELSE
    progress_percentage := LEAST(100, GREATEST(0, ((spent - cur_threshold) / (next_threshold - cur_threshold)) * 100));
  END IF;

  RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_staff(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.store_id = p_store_id
      AND p.role IN ('staff','manager','branch_manager','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_manager(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.store_id = p_store_id
      AND p.role IN ('manager','branch_manager','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_branch_manager(p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = COALESCE(p_user_id, auth.uid())
      AND p.role IN ('branch_manager','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_managed_store_ids(p_user_id uuid DEFAULT NULL)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(p.managed_store_ids, ARRAY[]::uuid[])
  FROM public.profiles p
  WHERE p.id = COALESCE(p_user_id, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_customer_restriction(p_user_id uuid, p_restriction_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.customer_restrictions cr
    WHERE cr.user_id = p_user_id
      AND cr.restriction_type::text = p_restriction_type
      AND cr.is_active = true
      AND (cr.expires_at IS NULL OR cr.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.add_customer_restriction(
  p_user_id uuid,
  p_restriction_type text,
  p_reason text,
  p_details text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.customer_restrictions (
    user_id, restriction_type, reason, details, expires_at, created_by
  ) VALUES (
    p_user_id,
    p_restriction_type::public.customer_restriction_type,
    p_reason,
    p_details,
    p_expires_at,
    auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_customer_restriction(p_restriction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customer_restrictions
  SET is_active = false,
      updated_at = now()
  WHERE id = p_restriction_id;

  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_store_id uuid,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  store_name text;
  user_name text;
BEGIN
  SELECT s.name INTO store_name FROM public.stores s WHERE s.id = p_store_id;
  SELECT p.full_name INTO user_name FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.audit_logs (
    user_id, user_name, action_type, entity_type, entity_id, store_id, store_name,
    old_value, new_value, description, metadata
  ) VALUES (
    auth.uid(), user_name,
    p_action_type::public.audit_action_type,
    p_entity_type::public.audit_entity_type,
    p_entity_id,
    p_store_id,
    store_name,
    p_old_value,
    p_new_value,
    COALESCE(p_description, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.log_order_interaction(
  p_order_id uuid,
  p_interaction_type text,
  p_outcome text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_verified_address boolean DEFAULT false,
  p_verified_amount boolean DEFAULT false,
  p_verified_substitutions boolean DEFAULT false,
  p_substitution_approved boolean DEFAULT false,
  p_substitution_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.order_interactions (
    order_id, staff_id, interaction_type, outcome, notes, metadata,
    verified_address, verified_amount, verified_substitutions,
    substitution_approved, substitution_details
  ) VALUES (
    p_order_id,
    auth.uid(),
    p_interaction_type::public.order_interaction_type,
    CASE WHEN p_outcome IS NULL THEN NULL ELSE p_outcome::public.order_interaction_outcome END,
    p_notes,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_verified_address, false),
    COALESCE(p_verified_amount, false),
    COALESCE(p_verified_substitutions, false),
    COALESCE(p_substitution_approved, false),
    p_substitution_details
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_call_attempt(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_order_interaction(p_order_id, 'call_attempt', NULL, NULL, '{}'::jsonb, false, false, false, false, NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.verify_order(p_order_id uuid, p_method text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Minimal: mark order confirmed (verification is represented via interactions).
  UPDATE public.orders
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_order_id;

  PERFORM public.log_order_interaction(p_order_id, 'verification', 'confirmed', CONCAT('Verified via ', p_method), '{}'::jsonb, true, true, true, true, NULL);

  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_order(
  p_order_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelled', updated_at = now(), metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{rejection}', jsonb_build_object('reason', p_reason, 'details', p_details), true)
  WHERE id = p_order_id;

  PERFORM public.log_order_interaction(p_order_id, 'rejection', 'rejected', p_reason, jsonb_build_object('details', p_details), false, false, false, false, NULL);

  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Minimal: move from pending->processing if still pending.
  UPDATE public.orders
  SET status = 'processing', updated_at = now()
  WHERE id = p_order_id AND status = 'pending';

  IF FOUND THEN
    PERFORM public.log_order_interaction(p_order_id, 'status_change', NULL, 'Order claimed', '{}'::jsonb, false, false, false, false, NULL);
  END IF;

  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.dispatch_rider(
  p_order_id uuid,
  p_rider_name text,
  p_rider_phone text DEFAULT NULL,
  p_estimated_arrival timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid;
  store_id uuid;
BEGIN
  SELECT o.store_id INTO store_id FROM public.orders o WHERE o.id = p_order_id;

  INSERT INTO public.rider_dispatches (
    order_id, store_id, rider_name, rider_phone, rider_vehicle_type, dispatched_by,
    estimated_arrival, status
  ) VALUES (
    p_order_id,
    store_id,
    p_rider_name,
    p_rider_phone,
    'bike',
    auth.uid(),
    p_estimated_arrival,
    'dispatched'
  )
  RETURNING id INTO new_id;

  UPDATE public.orders
  SET status = 'assigned', assigned_at = now(), updated_at = now()
  WHERE id = p_order_id;

  PERFORM public.log_order_interaction(p_order_id, 'rider_assigned', NULL, CONCAT('Rider dispatched: ', p_rider_name), '{}'::jsonb, false, false, false, false, NULL);

  RETURN new_id;
END; $$;

-- ==========================
-- BASIC RLS ENABLEMENT (optional)
-- ==========================
-- Uncomment if you want to start with RLS enabled (you must add policies after enabling).
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

COMMIT;
