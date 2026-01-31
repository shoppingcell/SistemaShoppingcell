-- Patch: Financeiro (Contas a Pagar)
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

create table if not exists public.finance_payables (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending', -- pending|paid|canceled
  category text,
  description text,
  amount numeric(12,2) not null,
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_finance_payables_updated_at') then
    create trigger trg_finance_payables_updated_at
    before update on public.finance_payables
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_finance_payables_due_date on public.finance_payables(due_date);
create index if not exists idx_finance_payables_status on public.finance_payables(status);

alter table public.finance_payables enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='finance_payables' and policyname='finance_payables_authenticated_all'
  ) then
    create policy finance_payables_authenticated_all on public.finance_payables
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
