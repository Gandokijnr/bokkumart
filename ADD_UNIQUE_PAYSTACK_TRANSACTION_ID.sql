-- Ensure paystack_transaction_id cannot be reused across multiple orders
-- Note: allow NULLs; Postgres UNIQUE allows multiple NULL values.

alter table public.orders
  add constraint orders_paystack_transaction_id_unique
  unique (paystack_transaction_id);
