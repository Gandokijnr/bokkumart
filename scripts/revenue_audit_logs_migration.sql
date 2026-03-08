-- Migration: Add revenue audit logging for financial accountability
-- This creates an audit trail for all changes to platform_revenue records

-- Step 1: Create revenue_audit_logs table
CREATE TABLE IF NOT EXISTS revenue_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_revenue_id UUID NOT NULL REFERENCES platform_revenue(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email VARCHAR(255), -- Cached for convenience
  action VARCHAR(50) NOT NULL CHECK (action IN ('calculated', 'recalculated', 'locked', 'unlocked', 'paid', 'disputed', 'invoice_generated', 'force_recalculate')),
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  previous_total DECIMAL(12,2),
  new_total DECIMAL(12,2),
  previous_platform_fee DECIMAL(12,2),
  new_platform_fee DECIMAL(12,2),
  notes TEXT,
  metadata JSONB, -- For additional context like excludeDeliveryFees, forceRecalculate flags
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_revenue_id ON revenue_audit_logs(platform_revenue_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON revenue_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON revenue_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON revenue_audit_logs(created_at DESC);

-- Step 3: Create view for audit reporting
CREATE OR REPLACE VIEW v_revenue_audit_summary AS
SELECT 
  ral.id,
  ral.platform_revenue_id,
  ral.admin_id,
  ral.admin_email,
  ral.action,
  ral.previous_status,
  ral.new_status,
  ral.previous_total,
  ral.new_total,
  ral.previous_platform_fee,
  ral.new_platform_fee,
  ral.notes,
  ral.created_at,
  pr.month,
  pr.year,
  TO_CHAR(TO_DATE(pr.month::TEXT, 'MM'), 'Month') AS month_name
FROM revenue_audit_logs ral
JOIN platform_revenue pr ON ral.platform_revenue_id = pr.id
ORDER BY ral.created_at DESC;

-- Step 4: Create function to get audit trail for a revenue period
CREATE OR REPLACE FUNCTION get_revenue_audit_trail(
  p_revenue_id UUID
)
RETURNS TABLE (
  id UUID,
  admin_email VARCHAR,
  action VARCHAR,
  previous_status VARCHAR,
  new_status VARCHAR,
  previous_total DECIMAL,
  new_total DECIMAL,
  previous_platform_fee DECIMAL,
  new_platform_fee DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ral.id,
    ral.admin_email,
    ral.action,
    ral.previous_status,
    ral.new_status,
    ral.previous_total,
    ral.new_total,
    ral.previous_platform_fee,
    ral.new_platform_fee,
    ral.notes,
    ral.created_at
  FROM revenue_audit_logs ral
  WHERE ral.platform_revenue_id = p_revenue_id
  ORDER BY ral.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add RLS policies for audit logs (admin only access)
ALTER TABLE revenue_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin can view audit logs"
  ON revenue_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Only service role or super admin can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON revenue_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Step 6: Add comments for documentation
COMMENT ON TABLE revenue_audit_logs IS 'Audit trail for all changes to platform_revenue records - financial accountability';
COMMENT ON COLUMN revenue_audit_logs.action IS 'Type of action: calculated, recalculated, locked, unlocked, paid, disputed, invoice_generated, force_recalculate';
COMMENT ON COLUMN revenue_audit_logs.metadata IS 'JSONB field for additional context like excludeDeliveryFees, forceRecalculate flags, IP address, etc.';

-- Grant permissions
GRANT SELECT ON revenue_audit_logs TO authenticated;
GRANT INSERT ON revenue_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_audit_trail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_audit_trail(UUID) TO service_role;

