-- Migration: Add metadata column to stores table
-- This adds the missing JSONB metadata column for store configuration

-- Add the metadata column to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create an index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_stores_metadata 
ON public.stores USING GIN (metadata);

-- Add comment explaining the column
COMMENT ON COLUMN public.stores.metadata IS 
'JSONB store configuration including pickupGate, openingHours, etc.';

/*
NOTES:
- metadata is JSONB for flexible storage of store-specific settings
- Default is empty object '{}'
- Common keys: pickupGate, openingHours, specialInstructions, etc.
- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
*/
