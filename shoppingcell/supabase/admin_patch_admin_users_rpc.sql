-- ShoppingCell: RPC helpers for admin_users management UI

create or replace function public.list_admin_users()
returns table(
  user_id uuid,
  role text,
  email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    au.user_id,
    au.role,
    u.email,
    au.created_at
  from public.admin_users au
  join auth.users u on u.id = au.user_id
  where public.is_admin_owner();
$$;

revoke all on function public.list_admin_users() from public;
grant execute on function public.list_admin_users() to authenticated;
