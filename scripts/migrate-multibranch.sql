-- ============================================================================
-- MULTI-BRANCH SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ALTER: rider_dispatches - Add store_id for branch dispatch
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rider_dispatches' AND column_name = 'store_id'
    ) THEN
        ALTER TABLE public.rider_dispatches 
        ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_rider_dispatches_store_id ON public.rider_dispatches(store_id);
        
        RAISE NOTICE '✅ Added store_id to rider_dispatches';
    ELSE
        RAISE NOTICE '⚠️  store_id already exists in rider_dispatches';
    END IF;
END $$;

-- ============================================================================
-- 2. ALTER: stores - Add pilot mode fields
-- ============================================================================
DO $$
BEGIN
    -- Add is_pilot_branch
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'is_pilot_branch'
    ) THEN
        ALTER TABLE public.stores ADD COLUMN is_pilot_branch BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_pilot_branch to stores';
    ELSE
        RAISE NOTICE '⚠️  is_pilot_branch already exists in stores';
    END IF;
    
    -- Add pilot_mode_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'pilot_mode_enabled'
    ) THEN
        ALTER TABLE public.stores ADD COLUMN pilot_mode_enabled BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added pilot_mode_enabled to stores';
    ELSE
        RAISE NOTICE '⚠️  pilot_mode_enabled already exists in stores';
    END IF;
END $$;

-- Set default flagship store as pilot if exists
UPDATE public.stores 
SET is_pilot_branch = true, pilot_mode_enabled = true 
WHERE is_flagship = true AND is_pilot_branch = false;

-- ============================================================================
-- 3. ALTER: profiles - Add referral and notification fields
-- ============================================================================
DO $$
BEGIN
    -- Add referral_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
        RAISE NOTICE '✅ Added referral_code to profiles';
    ELSE
        RAISE NOTICE '⚠️  referral_code already exists in profiles';
    END IF;
    
    -- Add referred_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'referred_by'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
        RAISE NOTICE '✅ Added referred_by to profiles';
    ELSE
        RAISE NOTICE '⚠️  referred_by already exists in profiles';
    END IF;
    
    -- Add first_order_discount_used
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'first_order_discount_used'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN first_order_discount_used BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added first_order_discount_used to profiles';
    ELSE
        RAISE NOTICE '⚠️  first_order_discount_used already exists in profiles';
    END IF;
    
    -- Add push_notifications_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'push_notifications_enabled'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added push_notifications_enabled to profiles';
    ELSE
        RAISE NOTICE '⚠️  push_notifications_enabled already exists in profiles';
    END IF;
END $$;

-- ============================================================================
-- 4. ALTER: orders - Add POS and confirmation fields
-- ============================================================================
DO $$
BEGIN
    -- Add confirmation_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'confirmation_code'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN confirmation_code TEXT;
        CREATE INDEX idx_orders_confirmation_code ON public.orders(confirmation_code);
        RAISE NOTICE '✅ Added confirmation_code to orders';
    ELSE
        RAISE NOTICE '⚠️  confirmation_code already exists in orders';
    END IF;
    
    -- Add pos_receipt_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'pos_receipt_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN pos_receipt_number TEXT;
        RAISE NOTICE '✅ Added pos_receipt_number to orders';
    ELSE
        RAISE NOTICE '⚠️  pos_receipt_number already exists in orders';
    END IF;
    
    -- Add pos_processed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'pos_processed_by'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN pos_processed_by TEXT;
        RAISE NOTICE '✅ Added pos_processed_by to orders';
    ELSE
        RAISE NOTICE '⚠️  pos_processed_by already exists in orders';
    END IF;
    
    -- Add pos_processed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'pos_processed_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN pos_processed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added pos_processed_at to orders';
    ELSE
        RAISE NOTICE '⚠️  pos_processed_at already exists in orders';
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE: promo_codes table (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'promo_codes'
    ) THEN
        CREATE TABLE public.promo_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            description TEXT,
            discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
            discount_value DECIMAL(10,2) NOT NULL,
            min_order_amount DECIMAL(10,2),
            max_discount DECIMAL(10,2),
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            valid_until TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT true,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ Created promo_codes table';
    ELSE
        RAISE NOTICE '⚠️  promo_codes table already exists';
    END IF;
END $$;

-- ============================================================================
-- 6. CREATE: push_notifications table (if not exists)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'push_notifications'
    ) THEN
        CREATE TABLE public.push_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT,
            data JSONB,
            is_read BOOLEAN DEFAULT false,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_push_notifications_user_id ON public.push_notifications(user_id);
        CREATE INDEX idx_push_notifications_is_read ON public.push_notifications(is_read);
        
        ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ Created push_notifications table';
    ELSE
        RAISE NOTICE '⚠️  push_notifications table already exists';
    END IF;
END $$;

-- ============================================================================
-- 7. Update existing data (if needed)
-- ============================================================================

-- Generate referral codes for existing users without one
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL AND role = 'customer';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables altered:';
    RAISE NOTICE '  • rider_dispatches (store_id for branch dispatch)';
    RAISE NOTICE '  • stores (pilot mode flags)';
    RAISE NOTICE '  • profiles (referral + notification fields)';
    RAISE NOTICE '  • orders (POS + confirmation code fields)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  • promo_codes';
    RAISE NOTICE '  • push_notifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: npm run db:tables';
    RAISE NOTICE '  2. Test: npm run db:describe orders';
    RAISE NOTICE '  3. Create a branch: npm run db:branch:new';
    RAISE NOTICE '========================================';
END $$;
