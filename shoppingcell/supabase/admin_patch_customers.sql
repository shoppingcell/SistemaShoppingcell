-- Patch: Customers (Clientes)
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

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text, -- CPF/CNPJ (optional)
  phone text, -- WhatsApp (digits preferred)
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_customers_updated_at') then
    create trigger trg_customers_updated_at
    before update on public.customers
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_customers_name on public.customers using gin (to_tsvector('simple', name));
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_document on public.customers(document);

alter table public.customers enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='customers_authenticated_all'
  ) then
    create policy customers_authenticated_all on public.customers
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
