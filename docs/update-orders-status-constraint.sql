-- Migration: Update orders status check constraint to include POS workflow statuses
-- Adds ready_for_pos and completed_in_pos to the allowed status values

-- First, drop the existing check constraint if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the updated check constraint with all valid statuses
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending',
  'processing',
  'paid',
  'confirmed',
  'ready_for_pos',
  'completed_in_pos',
  'assigned',
  'picked_up',
  'arrived',
  'delivered',
  'cancelled',
  'refunded'
));

-- Update any existing orders that might have invalid statuses
-- (This is a safety measure - should not affect valid data)
UPDATE public.orders 
SET status = 'pending'
WHERE status NOT IN (
  'pending',
  'processing',
  'paid',
  'confirmed',
  'ready_for_pos',
  'completed_in_pos',
  'assigned',
  'picked_up',
  'arrived',
  'delivered',
  'cancelled',
  'refunded'
);

/*
NOTES:
- This migration adds POS workflow statuses: ready_for_pos, completed_in_pos
- These statuses support the new order flow: pending -> confirmed -> ready_for_pos -> completed_in_pos -> assigned -> picked_up -> arrived -> delivered
- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
*/
