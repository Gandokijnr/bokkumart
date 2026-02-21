-- Paystack Subaccount routing schema additions
-- Run this in Supabase SQL editor.

-- 1) Stores routing metadata
alter table public.stores
  add column if not exists paystack_subaccount_code text,
  add column if not exists platform_percentage numeric,
  add column if not exists fixed_commission numeric,
  add column if not exists paystack_settlement_bank_name text,
  add column if not exists paystack_settlement_account_number text;

-- Optional: basic sanity checks
-- Paystack subaccount codes look like ACCT_xxxxxx
-- alter table public.stores add constraint stores_paystack_subaccount_code_format
--   check (paystack_subaccount_code is null or paystack_subaccount_code ~ '^ACCT_[A-Za-z0-9]+$');

-- 2) Orders auditing
alter table public.orders
  add column if not exists payment_split_log jsonb;

-- Optional indexes
create index if not exists idx_stores_paystack_subaccount_code on public.stores (paystack_subaccount_code);
