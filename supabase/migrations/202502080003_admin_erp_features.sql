-- ============================================================================
-- Migration: Add Comprehensive Admin ERP Features
-- Description: order_interactions table, rider dispatch, customer blacklist
-- ============================================================================

-- ============================================
-- 1. ORDER INTERACTIONS TABLE (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call_attempt', 'verification', 'rejection', 'status_change', 'note_added', 'rider_assigned', 'customer_complaint')),
    outcome TEXT CHECK (outcome IN ('answered', 'no_answer', 'busy', 'wrong_number', 'confirmed', 'rejected', 'callback_requested', 'voicemail', 'disconnected')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Verification-specific fields
    verified_address BOOLEAN DEFAULT FALSE,
    verified_amount BOOLEAN DEFAULT FALSE,
    verified_substitutions BOOLEAN DEFAULT FALSE,
    substitution_approved BOOLEAN DEFAULT FALSE,
    substitution_details TEXT
);

-- Enable RLS
ALTER TABLE public.order_interactions ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_interactions_order_id ON public.order_interactions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_interactions_staff_id ON public.order_interactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_interactions_created_at ON public.order_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_order_interactions_type ON public.order_interactions(interaction_type);

-- RLS Policies for order_interactions
DROP POLICY IF EXISTS "Staff can view order interactions" ON public.order_interactions;
DROP POLICY IF EXISTS "Staff can create interactions" ON public.order_interactions;

-- Staff can view interactions for orders they have access to
CREATE POLICY "Staff can view order interactions" ON public.order_interactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
            AND (
                -- Staff can see their store's orders
                public.is_store_staff(o.store_id)
                -- Admins can see all
                OR public.is_admin()
                -- Users can see their own orders
                OR o.user_id = auth.uid()
            )
        )
    );

-- Staff can create interactions for orders they handle
CREATE POLICY "Staff can create interactions" ON public.order_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
            AND (
                public.is_store_staff(o.store_id)
                OR public.is_admin()
            )
        )
    );

-- ============================================
-- 2. RIDER DISPATCH TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rider_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_name TEXT NOT NULL,
    rider_phone TEXT,
    rider_vehicle_type TEXT DEFAULT 'motorcycle',
    dispatched_by UUID NOT NULL REFERENCES auth.users(id),
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_pickup_at TIMESTAMP WITH TIME ZONE,
    actual_delivery_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'picked_up', 'in_transit', 'delivered', 'failed')),
    customer_notified BOOLEAN DEFAULT FALSE,
    customer_notification_sent_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rider_dispatches ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rider_dispatches_order_id ON public.rider_dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_rider_dispatches_status ON public.rider_dispatches(status);
CREATE INDEX IF NOT EXISTS idx_rider_dispatches_rider ON public.rider_dispatches(rider_name);

-- RLS Policies
DROP POLICY IF EXISTS "Staff can view dispatches" ON public.rider_dispatches;
DROP POLICY IF EXISTS "Staff can manage dispatches" ON public.rider_dispatches;

CREATE POLICY "Staff can view dispatches" ON public.rider_dispatches
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
            AND (
                public.is_store_staff(o.store_id)
                OR public.is_admin()
            )
        )
    );

CREATE POLICY "Staff can manage dispatches" ON public.rider_dispatches
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
            AND (
                public.is_store_staff(o.store_id)
                OR public.is_admin()
            )
        )
    )
    WITH CHECK (dispatched_by = auth.uid());

-- ============================================
-- 3. CUSTOMER BLACKLIST / RESTRICTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('pod_disabled', 'account_suspended', 'order_limit', 'manual_verification_required')),
    reason TEXT NOT NULL,
    details TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, restriction_type)
);

-- Enable RLS
ALTER TABLE public.customer_restrictions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_restrictions_user_id ON public.customer_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_restrictions_active ON public.customer_restrictions(is_active) WHERE is_active = TRUE;

-- RLS Policies
DROP POLICY IF EXISTS "Staff can view restrictions" ON public.customer_restrictions;
DROP POLICY IF EXISTS "Admins can manage restrictions" ON public.customer_restrictions;

CREATE POLICY "Staff can view restrictions" ON public.customer_restrictions
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_admin()
        OR public.is_store_staff(
            (SELECT store_id FROM public.profiles WHERE id = user_id)
        )
    );

CREATE POLICY "Admins can manage restrictions" ON public.customer_restrictions
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR public.is_store_manager(
        (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ))
    WITH CHECK (created_by = auth.uid());

-- ============================================
-- 4. BRANCH SWITCHING / ADMIN IMPERSONATION LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_branch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    original_store_id UUID REFERENCES public.stores(id),
    impersonating_store_id UUID REFERENCES public.stores(id),
    session_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_ended_at TIMESTAMP WITH TIME ZONE,
    actions_taken INTEGER DEFAULT 0,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.admin_branch_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can see their own sessions
CREATE POLICY "Admins can view own sessions" ON public.admin_branch_sessions
    FOR SELECT
    TO authenticated
    USING (admin_id = auth.uid() OR public.is_admin());

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to log order interaction
CREATE OR REPLACE FUNCTION public.log_order_interaction(
    p_order_id UUID,
    p_interaction_type TEXT,
    p_outcome TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_verified_address BOOLEAN DEFAULT FALSE,
    p_verified_amount BOOLEAN DEFAULT FALSE,
    p_verified_substitutions BOOLEAN DEFAULT FALSE,
    p_substitution_approved BOOLEAN DEFAULT FALSE,
    p_substitution_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interaction_id UUID;
BEGIN
    INSERT INTO public.order_interactions (
        order_id,
        staff_id,
        interaction_type,
        outcome,
        notes,
        metadata,
        verified_address,
        verified_amount,
        verified_substitutions,
        substitution_approved,
        substitution_details
    ) VALUES (
        p_order_id,
        auth.uid(),
        p_interaction_type,
        p_outcome,
        p_notes,
        p_metadata,
        p_verified_address,
        p_verified_amount,
        p_verified_substitutions,
        p_substitution_approved,
        p_substitution_details
    )
    RETURNING id INTO v_interaction_id;
    
    -- Also update the order's interaction count if it's a call attempt
    IF p_interaction_type = 'call_attempt' THEN
        UPDATE public.orders
        SET call_attempt_count = call_attempt_count + 1,
            last_call_attempt_at = NOW()
        WHERE id = p_order_id;
    END IF;
    
    RETURN v_interaction_id;
END;
$$;

-- Function to check if customer has restrictions
CREATE OR REPLACE FUNCTION public.has_customer_restriction(
    p_user_id UUID,
    p_restriction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.customer_restrictions
        WHERE user_id = p_user_id
        AND restriction_type = p_restriction_type
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$;

-- Function to dispatch rider
CREATE OR REPLACE FUNCTION public.dispatch_rider(
    p_order_id UUID,
    p_rider_name TEXT,
    p_rider_phone TEXT DEFAULT NULL,
    p_estimated_arrival TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dispatch_id UUID;
    v_order_store_id UUID;
BEGIN
    -- Get order store_id for permission check
    SELECT store_id INTO v_order_store_id
    FROM public.orders
    WHERE id = p_order_id;
    
    -- Check permissions
    IF NOT (public.is_store_staff(v_order_store_id) OR public.is_admin()) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    -- Create dispatch record
    INSERT INTO public.rider_dispatches (
        order_id,
        rider_name,
        rider_phone,
        dispatched_by,
        estimated_arrival
    ) VALUES (
        p_order_id,
        p_rider_name,
        p_rider_phone,
        auth.uid(),
        p_estimated_arrival
    )
    RETURNING id INTO v_dispatch_id;
    
    -- Update order status
    UPDATE public.orders
    SET status = 'out_for_delivery',
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log the interaction
    INSERT INTO public.order_interactions (
        order_id,
        staff_id,
        interaction_type,
        notes,
        metadata
    ) VALUES (
        p_order_id,
        auth.uid(),
        'rider_assigned',
        'Rider dispatched: ' || p_rider_name || ' (' || COALESCE(p_rider_phone, 'No phone') || ')',
        jsonb_build_object('dispatch_id', v_dispatch_id, 'rider_name', p_rider_name)
    );
    
    RETURN v_dispatch_id;
END;
$$;

-- Function to add customer restriction (blacklist)
CREATE OR REPLACE FUNCTION public.add_customer_restriction(
    p_user_id UUID,
    p_restriction_type TEXT,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restriction_id UUID;
BEGIN
    -- Only admins and managers can add restrictions
    IF NOT (public.is_admin() OR public.is_store_manager(
        (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    )) THEN
        RAISE EXCEPTION 'Permission denied: Only admins and managers can add restrictions';
    END IF;
    
    INSERT INTO public.customer_restrictions (
        user_id,
        restriction_type,
        reason,
        details,
        expires_at,
        created_by
    ) VALUES (
        p_user_id,
        p_restriction_type,
        p_reason,
        p_details,
        p_expires_at,
        auth.uid()
    )
    ON CONFLICT (user_id, restriction_type) 
    DO UPDATE SET
        reason = EXCLUDED.reason,
        details = EXCLUDED.details,
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        updated_at = NOW()
    RETURNING id INTO v_restriction_id;
    
    RETURN v_restriction_id;
END;
$$;

-- Function to remove customer restriction
CREATE OR REPLACE FUNCTION public.remove_customer_restriction(
    p_restriction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.customer_restrictions
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_restriction_id;
    
    RETURN FOUND;
END;
$$;

-- ============================================
-- 6. REAL-TIME STATS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(
    p_store_id UUID DEFAULT NULL
)
RETURNS TABLE (
    unconfirmed_orders BIGINT,
    active_pickups BIGINT,
    riders_en_route BIGINT,
    daily_revenue NUMERIC,
    pending_verification BIGINT,
    orders_in_processing BIGINT,
    orders_out_for_delivery BIGINT,
    cancelled_today BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Unconfirmed orders (awaiting call + pending)
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status IN ('awaiting_call', 'pending'))::BIGINT as unconfirmed_orders,
        
        -- Active pickups (ready for pickup)
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'ready')::BIGINT as active_pickups,
        
        -- Riders en route
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'out_for_delivery')::BIGINT as riders_en_route,
        
        -- Daily revenue (confirmed orders today)
        COALESCE((SELECT SUM(total_amount) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'confirmed'
         AND created_at >= DATE_TRUNC('day', NOW())
         AND created_at < DATE_TRUNC('day', NOW() + INTERVAL '1 day')), 0)::NUMERIC as daily_revenue,
        
        -- Pending verification
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'awaiting_call')::BIGINT as pending_verification,
        
        -- Orders in processing
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status IN ('confirmed', 'packing'))::BIGINT as orders_in_processing,
        
        -- Orders out for delivery
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'out_for_delivery')::BIGINT as orders_out_for_delivery,
        
        -- Cancelled today
        (SELECT COUNT(*) FROM public.orders 
         WHERE (p_store_id IS NULL OR store_id = p_store_id)
         AND status = 'cancelled'
         AND updated_at >= DATE_TRUNC('day', NOW()))::BIGINT as cancelled_today;
END;
$$;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.log_order_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_customer_restriction TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_rider TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_customer_restriction TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_customer_restriction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats TO authenticated;

COMMENT ON TABLE public.order_interactions IS 'Audit trail for all staff-customer interactions';
COMMENT ON TABLE public.rider_dispatches IS 'Rider dispatch records with tracking';
COMMENT ON TABLE public.customer_restrictions IS 'Customer restrictions/blacklist for problematic customers';
COMMENT ON TABLE public.admin_branch_sessions IS 'Audit log for admin branch switching/impersonation';
