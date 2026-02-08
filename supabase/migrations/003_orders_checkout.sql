-- Orders table for the HomeAffairs e-commerce flow
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    items JSONB NOT NULL, -- Array of {product_id, quantity, price, name}
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
    delivery_details JSONB, -- {address: {area, street, houseNumber, landmark}, contactPhone, deliveryZone}
    paystack_reference VARCHAR(100),
    paystack_transaction_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Stock reservations table (soft lock during checkout)
CREATE TABLE stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    session_id VARCHAR(255) NOT NULL, -- User session identifier
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_paystack_ref ON orders(paystack_reference);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id, store_id);
CREATE INDEX idx_stock_reservations_expires ON stock_reservations(expires_at);
CREATE INDEX idx_stock_reservations_session ON stock_reservations(session_id);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'processing'));

-- Admin can manage all orders
CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- System can update orders (for webhooks)
CREATE POLICY "System can update order status" ON orders
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- RLS Policies for stock_reservations
CREATE POLICY "Users can view their own reservations" ON stock_reservations
    FOR SELECT USING (session_id = auth.uid()::text);

CREATE POLICY "Users can create their own reservations" ON stock_reservations
    FOR INSERT WITH CHECK (session_id = auth.uid()::text);

CREATE POLICY "Users can delete their own reservations" ON stock_reservations
    FOR DELETE USING (session_id = auth.uid()::text);

-- Function to get available stock (considering reservations)
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id UUID, p_store_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_stock INTEGER;
    reserved_stock INTEGER;
BEGIN
    SELECT quantity INTO total_stock
    FROM store_inventory
    WHERE product_id = p_product_id AND store_id = p_store_id;

    IF total_stock IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
    FROM stock_reservations
    WHERE product_id = p_product_id 
    AND store_id = p_store_id
    AND expires_at > NOW();

    RETURN GREATEST(0, total_stock - reserved_stock);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reserve stock
CREATE OR REPLACE FUNCTION reserve_stock(
    p_product_id UUID,
    p_store_id UUID,
    p_quantity INTEGER,
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
    available INTEGER;
    existing_reservation INTEGER;
BEGIN
    -- Check available stock
    available := get_available_stock(p_product_id, p_store_id);

    IF available < p_quantity THEN
        RETURN FALSE;
    END IF;

    -- Check if user already has a reservation for this product
    SELECT COALESCE(SUM(quantity), 0) INTO existing_reservation
    FROM stock_reservations
    WHERE product_id = p_product_id
    AND store_id = p_store_id
    AND session_id = auth.uid()::text
    AND expires_at > NOW();

    -- If there's an existing reservation, update it
    IF existing_reservation > 0 THEN
        UPDATE stock_reservations
        SET quantity = quantity + p_quantity,
            expires_at = p_expires_at
        WHERE product_id = p_product_id
        AND store_id = p_store_id
        AND session_id = auth.uid()::text;
    ELSE
        -- Create new reservation
        INSERT INTO stock_reservations (
            product_id, store_id, quantity, session_id, expires_at
        ) VALUES (
            p_product_id, p_store_id, p_quantity, auth.uid()::text, p_expires_at
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release stock reservation
CREATE OR REPLACE FUNCTION release_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM stock_reservations
    WHERE product_id = p_product_id
    AND session_id = auth.uid()::text
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct stock when order is paid
CREATE OR REPLACE FUNCTION deduct_stock_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
BEGIN
    -- Only process when status changes to 'paid'
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        -- Deduct stock for each item in the order
        FOR item_record IN SELECT * FROM jsonb_to_recordset(NEW.items) AS x(product_id UUID, quantity INTEGER)
        LOOP
            UPDATE store_inventory
            SET quantity = GREATEST(0, quantity - item_record.quantity),
                updated_at = NOW()
            WHERE product_id = item_record.product_id
            AND store_id = NEW.store_id;

            -- Clear any reservations for this user/product
            DELETE FROM stock_reservations
            WHERE product_id = item_record.product_id
            AND store_id = NEW.store_id
            AND session_id = NEW.user_id::text;
        END LOOP;

        -- Set paid_at timestamp
        NEW.paid_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_deduct_stock_on_payment
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_stock_on_payment();

-- Function to update order updated_at
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_orders_timestamp
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamp();

-- Cleanup expired reservations (can be run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM stock_reservations
    WHERE expires_at <= NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_available_stock(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reserve_stock(UUID, UUID, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION release_stock(UUID, INTEGER) TO authenticated;
