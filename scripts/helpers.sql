 -- SQL Runner Script
-- Run this in Supabase SQL Editor or via psql
-- This script helps manage tables from terminal

-- Helper function to list all tables
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE (table_name text, table_type text)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.relname::text AS table_name,
        CASE c.relkind 
            WHEN 'r' THEN 'table'
            WHEN 'v' THEN 'view'
            WHEN 'm' THEN 'materialized view'
            WHEN 'f' THEN 'foreign table'
        END::text AS table_type
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'v', 'm', 'f')
    ORDER BY c.relname;
$$;

-- Helper function to describe table structure
CREATE OR REPLACE FUNCTION public.describe_table(p_table_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
    ORDER BY c.ordinal_position;
$$;

-- Helper function to create a new branch (store)
CREATE OR REPLACE FUNCTION public.create_branch(
    p_code text,
    p_name text,
    p_address text,
    p_city text,
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
BEGIN
    INSERT INTO public.stores (
        code,
        name,
        address,
        city,
        phone,
        email,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_code,
        p_name,
        p_address,
        p_city,
        p_phone,
        p_email,
        true,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_store_id;
    
    RETURN v_store_id;
END;
$$;

-- Helper to initialize inventory for a new branch
CREATE OR REPLACE FUNCTION public.initialize_branch_inventory(p_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    v_product record;
BEGIN
    FOR v_product IN SELECT id FROM public.products WHERE is_active = true
    LOOP
        INSERT INTO public.store_inventory (
            store_id,
            product_id,
            stock_level,
            available_stock,
            reserved_stock,
            is_visible,
            created_at,
            updated_at
        ) VALUES (
            p_store_id,
            v_product.id,
            0,
            0,
            0,
            false,
            NOW(),
            NOW()
        )
        ON CONFLICT (store_id, product_id) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Helper to get branch statistics
CREATE OR REPLACE FUNCTION public.get_branch_stats(p_store_id uuid)
RETURNS TABLE (
    total_orders bigint,
    total_revenue numeric,
    total_products bigint,
    low_stock_items bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(DISTINCT o.id)::bigint as total_orders,
        COALESCE(SUM(o.total_amount), 0)::numeric as total_revenue,
        COUNT(DISTINCT si.product_id)::bigint as total_products,
        COUNT(DISTINCT CASE WHEN si.available_stock < 10 THEN si.product_id END)::bigint as low_stock_items
    FROM public.stores s
    LEFT JOIN public.orders o ON o.store_id = s.id AND o.created_at >= DATE_TRUNC('month', NOW())
    LEFT JOIN public.store_inventory si ON si.store_id = s.id
    WHERE s.id = p_store_id
    GROUP BY s.id;
$$;
