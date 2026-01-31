-- Patch: link Orders -> Customers
-- Run in Supabase SQL Editor

-- Add customer_id to orders
alter table public.orders
  add column if not exists customer_id uuid;

-- Add FK (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_customer_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_orders_customer_id on public.orders(customer_id);
