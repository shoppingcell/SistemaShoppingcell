-- Patch: Products "featured" flag (Destaques)
-- Run in Supabase SQL Editor

alter table public.products
  add column if not exists featured boolean not null default false;

create index if not exists idx_products_featured on public.products(featured);
