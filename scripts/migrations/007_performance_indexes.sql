BEGIN;

-- Core lookup / filter indexes
CREATE INDEX IF NOT EXISTS profiles_store_id_idx ON public.profiles(store_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

CREATE INDEX IF NOT EXISTS categories_is_active_sort_order_idx ON public.categories(is_active, sort_order);

CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON public.products(barcode);
CREATE INDEX IF NOT EXISTS products_retailman_product_id_idx ON public.products(retailman_product_id);
CREATE INDEX IF NOT EXISTS products_is_active_created_at_idx ON public.products(is_active, created_at DESC);

-- Inventory: optimize hot paths (store page, search fallback)
CREATE INDEX IF NOT EXISTS store_inventory_store_visible_product_idx
  ON public.store_inventory(store_id, product_id)
  WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS store_inventory_store_visible_in_stock_idx
  ON public.store_inventory(store_id, product_id)
  WHERE is_visible = true AND stock_level > 0;

-- Orders: user/store timelines and admin dashboards
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_store_id_created_at_idx ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_store_id_status_created_at_idx ON public.orders(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_status_created_at_idx ON public.orders(payment_status, created_at DESC);

-- Promo code reuse check: orders where metadata->>promo_code matches
CREATE INDEX IF NOT EXISTS orders_user_promo_code_idx
  ON public.orders(user_id, (metadata->>'promo_code'))
  WHERE (metadata ? 'promo_code');

-- Addresses: user address list ordering
CREATE INDEX IF NOT EXISTS addresses_user_primary_created_at_idx
  ON public.addresses(user_id, is_primary DESC, created_at DESC);

-- Carts: find active cart (store_id IS NULL) fast
CREATE INDEX IF NOT EXISTS carts_user_active_created_at_idx
  ON public.carts(user_id, created_at DESC)
  WHERE store_id IS NULL;

-- Cart items: common maintenance operations
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS cart_items_store_id_idx ON public.cart_items(store_id);

-- Order items: product-level reporting/analytics
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

-- Audit logs: fast filters + timeline
CREATE INDEX IF NOT EXISTS audit_logs_store_created_at_idx ON public.audit_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx ON public.audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_created_at_idx ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- Order interactions: KPI queries (interaction_type + time window) and joins
CREATE INDEX IF NOT EXISTS order_interactions_type_created_at_order_id_idx
  ON public.order_interactions(interaction_type, created_at DESC, order_id);

-- Customer restrictions: frequent check for active restrictions
CREATE INDEX IF NOT EXISTS customer_restrictions_active_user_idx
  ON public.customer_restrictions(user_id)
  WHERE is_active = true;

-- User roles: frequent checks for active roles
CREATE INDEX IF NOT EXISTS user_roles_active_user_idx
  ON public.user_roles(user_id)
  WHERE is_active = true;

-- Push notifications: inbox queries
CREATE INDEX IF NOT EXISTS push_notifications_user_read_sent_at_idx
  ON public.push_notifications(user_id, is_read, sent_at DESC);

COMMIT;
