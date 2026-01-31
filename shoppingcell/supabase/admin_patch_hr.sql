-- Patch: RH (Funcionários + Pagamentos)
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

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  salary numeric(12,2),
  hired_at date,
  status text not null default 'active', -- active|inactive
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_hr_employees_updated_at') then
    create trigger trg_hr_employees_updated_at
    before update on public.hr_employees
    for each row execute function public.set_updated_at();
  end if;
end $$;

create table if not exists public.hr_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees(id) on delete set null,
  description text,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_hr_payments_updated_at') then
    create trigger trg_hr_payments_updated_at
    before update on public.hr_payments
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_hr_payments_paid_at on public.hr_payments(paid_at desc);
create index if not exists idx_hr_payments_employee_id on public.hr_payments(employee_id);

alter table public.hr_employees enable row level security;
alter table public.hr_payments enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='hr_employees' and policyname='hr_employees_authenticated_all'
  ) then
    create policy hr_employees_authenticated_all on public.hr_employees
      for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='hr_payments' and policyname='hr_payments_authenticated_all'
  ) then
    create policy hr_payments_authenticated_all on public.hr_payments
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
