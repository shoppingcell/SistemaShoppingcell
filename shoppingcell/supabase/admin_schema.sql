-- Admin MVP schema for ShoppingCell
-- Apply in Supabase: SQL Editor -> New query -> Run

-- Extensions
create extension if not exists pgcrypto;

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_categories_updated_at') then
    create trigger trg_categories_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories_authenticated_all') then
    create policy categories_authenticated_all on public.categories
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_products_updated_at') then
    create trigger trg_products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.products enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products_authenticated_all') then
    create policy products_authenticated_all on public.products
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_products_category_id on public.products(category_id);

-- PRODUCT MEDIA
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_product_media_updated_at') then
    create trigger trg_product_media_updated_at
    before update on public.product_media
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.product_media enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_media' and policyname='product_media_authenticated_all') then
    create policy product_media_authenticated_all on public.product_media
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_product_media_product_id on public.product_media(product_id);

-- INVENTORY (base)
create table if not exists public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.inventory enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory' and policyname='inventory_authenticated_all') then
    create policy inventory_authenticated_all on public.inventory
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- INVENTORY MOVES
create table if not exists public.inventory_moves (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  delta int not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.inventory_moves enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory_moves' and policyname='inventory_moves_authenticated_all') then
    create policy inventory_moves_authenticated_all on public.inventory_moves
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_inventory_moves_product_id on public.inventory_moves(product_id);

-- Optional: public read-only for storefront (if you want later)
-- create policy products_public_read on public.products for select to anon using (active = true);
