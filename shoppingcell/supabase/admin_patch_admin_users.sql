-- ShoppingCell: admin_users RBAC (only admin_users can access admin)
-- Apply in Supabase SQL Editor.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff', -- owner|manager|staff
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users au where au.user_id = auth.uid());
$$;

create or replace function public.is_admin_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users au where au.user_id = auth.uid() and au.role = 'owner');
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;
revoke all on function public.is_admin_owner() from public;
grant execute on function public.is_admin_owner() to authenticated;

drop policy if exists admin_users_select on public.admin_users;
drop policy if exists admin_users_insert on public.admin_users;
drop policy if exists admin_users_update on public.admin_users;
drop policy if exists admin_users_delete on public.admin_users;

create policy admin_users_select on public.admin_users
for select using (
  user_id = auth.uid() or public.is_admin_owner()
);

create policy admin_users_insert on public.admin_users
for insert with check (
  public.is_admin_owner()
  or (select count(*) = 0 from public.admin_users)
);

create policy admin_users_update on public.admin_users
for update using (public.is_admin_owner());

create policy admin_users_delete on public.admin_users
for delete using (public.is_admin_owner());
