-- Fix RLS for storage uploads
-- Run this in Supabase SQL Editor

-- ============================================
-- RIDER-DOCUMENTS BUCKET POLICIES
-- ============================================

-- 1. Allow authenticated users to INSERT (upload) objects
CREATE POLICY "Allow authenticated uploads to rider-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rider-documents');

-- 2. Allow authenticated users to SELECT (needed for upsert verification)
CREATE POLICY "Allow authenticated select from rider-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'rider-documents');

-- 3. Allow authenticated users to UPDATE (for upsert: true)
CREATE POLICY "Allow authenticated updates to rider-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'rider-documents')
WITH CHECK (bucket_id = 'rider-documents');

-- ============================================
-- PRODUCTS BUCKET POLICIES (if needed)
-- ============================================

-- 1. Allow authenticated users to INSERT (upload) objects
CREATE POLICY "Allow authenticated uploads to products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- 2. Allow authenticated users to SELECT
CREATE POLICY "Allow authenticated select from products"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'products');

-- 3. Allow authenticated users to UPDATE (for upsert: true)
CREATE POLICY "Allow authenticated updates to products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');
