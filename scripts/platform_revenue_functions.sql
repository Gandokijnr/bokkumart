-- SQL function for store-level revenue breakdown
-- Run this in Supabase SQL Editor after running the migration

-- Drop existing function first (needed when changing return type)
DROP FUNCTION IF EXISTS get_store_revenue_breakdown(INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION get_store_revenue_breakdown(
  p_month INTEGER,
  p_year INTEGER,
  p_exclude_delivery BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  store_id UUID,
  store_name VARCHAR,
  order_count BIGINT,
  subtotal DECIMAL,
  delivery_fees DECIMAL,
  platform_fee DECIMAL
) AS $$
DECLARE
  v_platform_percentage DECIMAL := 8.0;
BEGIN
  RETURN QUERY
  SELECT 
    o.store_id,
    s.name AS store_name,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.subtotal), 0) AS subtotal,
    COALESCE(SUM(o.delivery_fee), 0) AS delivery_fees,
    ROUND(
      (COALESCE(SUM(o.subtotal), 0) - CASE WHEN p_exclude_delivery THEN COALESCE(SUM(o.delivery_fee), 0) ELSE 0 END) 
      * (v_platform_percentage / 100), 
      2
    ) AS platform_fee
  FROM orders o
  JOIN stores s ON o.store_id = s.id
  WHERE o.channel = 'platform'
    AND o.payment_status = 'paid'
    AND EXTRACT(MONTH FROM o.created_at) = p_month
    AND EXTRACT(YEAR FROM o.created_at) = p_year
  GROUP BY o.store_id, s.name
  ORDER BY subtotal DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_store_revenue_breakdown IS 'Returns store-level revenue breakdown for a given month/year';

-- Grant execute permission to authenticated users (for admin use)
GRANT EXECUTE ON FUNCTION get_store_revenue_breakdown(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_revenue_breakdown(INTEGER, INTEGER, BOOLEAN) TO service_role;
