-- Patch: Financeiro (Movimentações)
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

-- Simple ledger table: one row per movement
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- income|expense
  category text, -- optional: Vendas, Frete, Fornecedor, etc.
  description text,
  amount numeric(12,2) not null,
  occurred_at timestamptz not null default now(),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_finance_transactions_updated_at') then
    create trigger trg_finance_transactions_updated_at
    before update on public.finance_transactions
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_finance_transactions_occurred_at on public.finance_transactions(occurred_at desc);
create index if not exists idx_finance_transactions_order_id on public.finance_transactions(order_id);

alter table public.finance_transactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_transactions' and policyname='finance_transactions_authenticated_all'
  ) then
    create policy finance_transactions_authenticated_all on public.finance_transactions
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
