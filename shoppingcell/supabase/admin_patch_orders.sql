-- Patch: Orders (Pedidos) + Items for WhatsApp B2B flow
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

-- updated_at helper (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from information_schema.columns where table_schema = tg_table_schema and table_name = tg_table_name and column_name = 'updated_at') then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft', -- draft|sent|confirmed|cancelled
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_orders_updated_at') then
    create trigger trg_orders_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.orders enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_authenticated_all') then
    create policy orders_authenticated_all on public.orders
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null,
  price numeric(12,2),
  cost_price numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_order_items_updated_at') then
    create trigger trg_order_items_updated_at
    before update on public.order_items
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.order_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='order_items' and policyname='order_items_authenticated_all') then
    create policy order_items_authenticated_all on public.order_items
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_orders_status on public.orders(status);
