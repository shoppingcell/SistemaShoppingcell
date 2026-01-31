-- Patch: add cost_price + min_quantity and store sheet metadata
-- Run in Supabase SQL Editor

alter table public.products
  add column if not exists cost_price numeric(12,2);

alter table public.inventory
  add column if not exists min_quantity int not null default 0;

-- Optional: store sheet code / barcode / NCM / CEST (future)
alter table public.products
  add column if not exists sheet_code text,
  add column if not exists barcode text,
  add column if not exists ncm text,
  add column if not exists cest text;

create index if not exists idx_products_sheet_code on public.products(sheet_code);
