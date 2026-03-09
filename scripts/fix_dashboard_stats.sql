-- Fix get_admin_dashboard_stats to return correct fields for dashboard
-- Run this in Supabase SQL Editor

-- Drop existing function if it has wrong signature
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats(uuid);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats(text);

-- Create corrected function with proper return type
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(
    target_branch_id uuid DEFAULT NULL
)
RETURNS TABLE (
    pending_count bigint,
    todays_count bigint,
    todays_revenue numeric,
    low_stock_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count pending orders (status = 'pending')
        (SELECT COUNT(*)::bigint 
         FROM public.orders 
         WHERE status = 'pending'
         AND (target_branch_id IS NULL OR store_id = target_branch_id)
        ) AS pending_count,
        
        -- Count today's orders
        (SELECT COUNT(*)::bigint 
         FROM public.orders 
         WHERE created_at >= DATE_TRUNC('day', NOW())
         AND created_at < DATE_TRUNC('day', NOW() + INTERVAL '1 day')
         AND (target_branch_id IS NULL OR store_id = target_branch_id)
        ) AS todays_count,
        
        -- Sum today's revenue
        (SELECT COALESCE(SUM(total_amount), 0)::numeric
         FROM public.orders 
         WHERE created_at >= DATE_TRUNC('day', NOW())
         AND created_at < DATE_TRUNC('day', NOW() + INTERVAL '1 day')
         AND (target_branch_id IS NULL OR store_id = target_branch_id)
         AND status NOT IN ('cancelled', 'refunded')
        ) AS todays_revenue,
        
        -- Count low stock items
        (SELECT COUNT(*)::bigint 
         FROM public.store_inventory si
         JOIN public.stores s ON s.id = si.store_id
         WHERE si.is_visible = true 
         AND si.stock_level > 0 
         AND si.stock_level <= 5
         AND (target_branch_id IS NULL OR si.store_id = target_branch_id)
        ) AS low_stock_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(uuid) TO anon;

-- Also create the verification queue stats function if it doesn't exist
DROP FUNCTION IF EXISTS public.get_verification_queue_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_verification_queue_stats(
    target_branch_id uuid DEFAULT NULL
)
RETURNS TABLE (
    call_list_count bigint,
    unverified_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count orders needing verification calls
        (SELECT COUNT(*)::bigint 
         FROM public.orders 
         WHERE status IN ('pending', 'processing')
         AND (target_branch_id IS NULL OR store_id = target_branch_id)
        ) AS call_list_count,
        
        -- Sum of unverified order values
        (SELECT COALESCE(SUM(total_amount), 0)::numeric
         FROM public.orders 
         WHERE status IN ('pending', 'processing')
         AND (target_branch_id IS NULL OR store_id = target_branch_id)
        ) AS unverified_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_verification_queue_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verification_queue_stats(uuid) TO anon;

-- Update database types in the app
COMMENT ON FUNCTION public.get_admin_dashboard_stats(uuid) IS 
    'Returns dashboard stats: pending_count, todays_count, todays_revenue, low_stock_count';
COMMENT ON FUNCTION public.get_verification_queue_stats(uuid) IS 
    'Returns verification queue stats: call_list_count, unverified_value';
