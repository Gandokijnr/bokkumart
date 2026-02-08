-- Order Logs Table for Staff Accountability
-- Tracks all actions performed on orders by staff members

CREATE TABLE IF NOT EXISTS order_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_staff_id ON order_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON order_logs(created_at DESC);

-- Enable RLS
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view logs for orders they have access to
CREATE POLICY "Staff can view order logs" ON order_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN profiles p ON p.id = auth.uid()
            WHERE o.id = order_logs.order_id
            AND p.role IN ('admin', 'manager', 'staff')
        )
    );

-- Staff can insert their own logs
CREATE POLICY "Staff can create order logs" ON order_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'staff')
        )
    );

-- ============================================
-- Inventory Logs Table (for kill switch tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('mark_unavailable', 'mark_available', 'stock_adjustment')),
    previous_value INTEGER,
    new_value INTEGER,
    staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_store_id ON inventory_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_staff_id ON inventory_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- Enable RLS
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view inventory logs" ON inventory_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can create inventory logs" ON inventory_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'staff')
        )
    );

-- ============================================
-- Order Notifications Table (for customer updates)
-- ============================================

CREATE TABLE IF NOT EXISTS order_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('order_update', 'delay', 'delivery', 'cancellation')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON order_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_user_id ON order_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_is_read ON order_notifications(is_read);

-- Enable RLS
ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON order_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications" ON order_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'staff')
        )
    );

-- Users can mark notifications as read
CREATE POLICY "Users can update their notifications" ON order_notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- ATC (Average Time to Confirm) Tracking View
-- ============================================

CREATE OR REPLACE VIEW order_atc_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
    AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
    ) FILTER (WHERE status = 'confirmed') as avg_confirmation_minutes
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Grant access to the view
GRANT SELECT ON order_atc_stats TO authenticated;
