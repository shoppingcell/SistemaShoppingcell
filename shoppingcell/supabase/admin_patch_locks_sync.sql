-- Patch: sheet sync + auto-lock fields (Admin overrides)
-- Run in Supabase SQL Editor

-- Products: store sheet metadata + allow manual overrides
alter table public.products
  add column if not exists sheet_code text,
  add column if not exists barcode text,
  add column if not exists ncm text,
  add column if not exists cest text,
  add column if not exists cost_price numeric(12,2),
  add column if not exists price_locked boolean not null default false,
  add column if not exists cost_locked boolean not null default false;

create index if not exists idx_products_sheet_code on public.products(sheet_code);

-- Inventory: minimum stock + allow manual overrides
alter table public.inventory
  add column if not exists min_quantity int not null default 0,
  add column if not exists quantity_locked boolean not null default false,
  add column if not exists min_locked boolean not null default false;
