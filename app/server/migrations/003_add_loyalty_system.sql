-- Create loyalty_transactions table to track points history
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);

-- Add loyalty_points column to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'loyalty_points') THEN
        ALTER TABLE profiles ADD COLUMN loyalty_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to calculate available points (earned - redeemed)
CREATE OR REPLACE FUNCTION get_user_available_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    earned_points INTEGER;
    redeemed_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(points), 0) INTO earned_points
    FROM loyalty_transactions
    WHERE user_id = p_user_id AND type IN ('earned', 'bonus');
    
    SELECT COALESCE(SUM(points), 0) INTO redeemed_points
    FROM loyalty_transactions
    WHERE user_id = p_user_id AND type = 'redeemed';
    
    RETURN earned_points - redeemed_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for loyalty_transactions
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loyalty transactions"
    ON loyalty_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert loyalty transactions"
    ON loyalty_transactions
    FOR INSERT
    WITH CHECK (true);

-- Add points_value column to orders to track how many points were redeemed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'points_redeemed') THEN
        ALTER TABLE orders ADD COLUMN points_redeemed INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'points_discount_amount') THEN
        ALTER TABLE orders ADD COLUMN points_discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;
