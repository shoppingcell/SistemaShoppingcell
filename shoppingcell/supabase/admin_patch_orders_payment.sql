-- Patch: Orders payment status (manual)
-- Run in Supabase SQL Editor

alter table public.orders
  add column if not exists payment_status text not null default 'pending';

create index if not exists idx_orders_payment_status on public.orders(payment_status);
