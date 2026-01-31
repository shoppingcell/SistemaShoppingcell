-- Patch: RH (Presenças / Observações por dia)
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

create table if not exists public.hr_attendance (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  status text not null, -- present|absent|note
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day)
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_hr_attendance_updated_at') then
    create trigger trg_hr_attendance_updated_at
    before update on public.hr_attendance
    for each row execute function public.set_updated_at();
  end if;
end $$;

create index if not exists idx_hr_attendance_day on public.hr_attendance(day desc);

alter table public.hr_attendance enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='hr_attendance' and policyname='hr_attendance_authenticated_all'
  ) then
    create policy hr_attendance_authenticated_all on public.hr_attendance
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
