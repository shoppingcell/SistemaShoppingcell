-- ShoppingCell PDV MVP (profiles/roles + sales + atomic stock decrease)
-- Apply in Supabase SQL Editor.

-- 1) Staff profiles (role-based access)
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'seller', -- admin|seller
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_profiles_role_chk check (role in ('admin','seller'))
);

create index if not exists staff_profiles_role_idx on public.staff_profiles(role);

alter table public.staff_profiles enable row level security;

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user() or exists(
    select 1 from public.staff_profiles sp
    where sp.user_id = auth.uid() and sp.active = true and sp.role = 'admin'
  );
$$;

revoke all on function public.is_staff_admin() from public;
grant execute on function public.is_staff_admin() to authenticated;

drop policy if exists staff_profiles_select on public.staff_profiles;
drop policy if exists staff_profiles_insert on public.staff_profiles;
drop policy if exists staff_profiles_update on public.staff_profiles;
drop policy if exists staff_profiles_delete on public.staff_profiles;

create policy staff_profiles_select on public.staff_profiles
for select using (
  user_id = auth.uid() or public.is_staff_admin()
);

create policy staff_profiles_insert on public.staff_profiles
for insert with check (public.is_staff_admin());

create policy staff_profiles_update on public.staff_profiles
for update using (public.is_staff_admin());

create policy staff_profiles_delete on public.staff_profiles
for delete using (public.is_staff_admin());

-- 2) Customers
alter table public.customers
  add column if not exists active boolean not null default true;

create unique index if not exists customers_phone_unique on public.customers(phone)
where phone is not null and length(phone) > 0;

-- 3) Sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete restrict,
  customer_id uuid null references public.customers(id) on delete set null,
  payment_method text not null, -- pix|dinheiro|fiado
  status text not null default 'open', -- open|paid|fiado
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  total numeric not null default 0,
  paid_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sales_created_at_idx on public.sales(created_at desc);
create index if not exists sales_seller_idx on public.sales(seller_id, created_at desc);

alter table public.sales enable row level security;

drop policy if exists sales_select on public.sales;
drop policy if exists sales_insert on public.sales;
drop policy if exists sales_update on public.sales;
drop policy if exists sales_delete on public.sales;

create policy sales_select on public.sales
for select using (
  public.is_staff_admin() or seller_id = auth.uid()
);

create policy sales_insert on public.sales
for insert with check (
  public.is_staff_admin() or seller_id = auth.uid()
);

create policy sales_update on public.sales
for update using (public.is_staff_admin());

create policy sales_delete on public.sales
for delete using (public.is_staff_admin());

-- 4) Sale items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_idx on public.sale_items(product_id);

alter table public.sale_items enable row level security;

drop policy if exists sale_items_select on public.sale_items;
drop policy if exists sale_items_insert on public.sale_items;
drop policy if exists sale_items_update on public.sale_items;
drop policy if exists sale_items_delete on public.sale_items;

create policy sale_items_select on public.sale_items
for select using (
  public.is_staff_admin() or exists(
    select 1 from public.sales s
    where s.id = sale_id and s.seller_id = auth.uid()
  )
);

create policy sale_items_insert on public.sale_items
for insert with check (
  public.is_staff_admin() or exists(
    select 1 from public.sales s
    where s.id = sale_id and s.seller_id = auth.uid()
  )
);

create policy sale_items_update on public.sale_items
for update using (public.is_staff_admin());

create policy sale_items_delete on public.sale_items
for delete using (public.is_staff_admin());

-- 5) Receivables (Fiado)
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  total numeric not null,
  paid numeric not null default 0,
  status text not null default 'open', -- open|partial|paid|overdue
  due_date date null,
  created_at timestamptz not null default now()
);

create index if not exists receivables_customer_idx on public.receivables(customer_id, created_at desc);
create index if not exists receivables_status_idx on public.receivables(status);

alter table public.receivables enable row level security;

drop policy if exists receivables_select on public.receivables;
drop policy if exists receivables_insert on public.receivables;
drop policy if exists receivables_update on public.receivables;
drop policy if exists receivables_delete on public.receivables;

create policy receivables_select on public.receivables
for select using (
  public.is_staff_admin() or exists(
    select 1 from public.sales s
    where s.id = sale_id and s.seller_id = auth.uid()
  )
);

create policy receivables_insert on public.receivables
for insert with check (public.is_staff_admin());

create policy receivables_update on public.receivables
for update using (public.is_staff_admin());

create policy receivables_delete on public.receivables
for delete using (public.is_staff_admin());

-- 6) PDV RPCs
create or replace function public.pdv_upsert_customer(
  p_name text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_phone text;
begin
  if not (public.is_staff_admin() or exists(select 1 from public.staff_profiles sp where sp.user_id = auth.uid() and sp.active)) then
    raise exception 'not_allowed';
  end if;

  v_phone := nullif(regexp_replace(coalesce(p_phone,''), '\\D', '', 'g'), '');

  if v_phone is null then
    insert into public.customers(name, phone)
    values (nullif(trim(coalesce(p_name,'')),''), null)
    returning id into v_id;
    return v_id;
  end if;

  insert into public.customers(name, phone)
  values (nullif(trim(coalesce(p_name,'')),''), v_phone)
  on conflict (phone) do update set
    name = coalesce(excluded.name, public.customers.name),
    active = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.pdv_upsert_customer(text,text) from public;
grant execute on function public.pdv_upsert_customer(text,text) to authenticated;

create or replace function public.pdv_create_sale(
  p_payment_method text,
  p_items jsonb,
  p_customer jsonb default null,
  p_discount_total numeric default 0,
  p_due_date date default null,
  p_paid_amount numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_customer_id uuid;
  v_seller_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_paid numeric := 0;
  v_row jsonb;
  v_product_id uuid;
  v_qty int;
  v_unit numeric;
  v_disc numeric;
  v_line_total numeric;
  v_current_qty numeric;
begin
  if not (public.is_staff_admin() or exists(select 1 from public.staff_profiles sp where sp.user_id = auth.uid() and sp.active)) then
    raise exception 'not_allowed';
  end if;

  if p_payment_method not in ('pix','dinheiro','fiado') then
    raise exception 'invalid_payment_method';
  end if;

  v_seller_id := auth.uid();
  if v_seller_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'empty_items';
  end if;

  if p_payment_method = 'fiado' then
    if p_customer is null then
      raise exception 'fiado_requires_customer';
    end if;
  end if;

  if p_customer is not null then
    v_customer_id := public.pdv_upsert_customer(
      p_customer->>'name',
      p_customer->>'phone'
    );
  end if;

  insert into public.sales(seller_id, customer_id, payment_method, status, subtotal, discount_total, total, paid_amount)
  values (
    v_seller_id,
    v_customer_id,
    p_payment_method,
    case when p_payment_method = 'fiado' then 'fiado' else 'paid' end,
    0,
    coalesce(p_discount_total,0),
    0,
    0
  )
  returning id into v_sale_id;

  for v_row in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_row->>'product_id')::uuid;
    v_qty := greatest(1, (v_row->>'quantity')::int);
    v_unit := coalesce((v_row->>'unit_price')::numeric, 0);
    v_disc := coalesce((v_row->>'discount')::numeric, 0);

    insert into public.inventory(product_id, quantity, min_quantity)
    values (v_product_id, 0, 0)
    on conflict (product_id) do nothing;

    select quantity into v_current_qty from public.inventory where product_id = v_product_id for update;

    if (v_current_qty - v_qty) < 0 then
      raise exception 'insufficient_stock for product %', v_product_id;
    end if;

    v_line_total := (v_unit * v_qty) - v_disc;
    if v_line_total < 0 then v_line_total := 0; end if;

    insert into public.sale_items(sale_id, product_id, quantity, unit_price, discount, total)
    values (v_sale_id, v_product_id, v_qty, v_unit, v_disc, v_line_total);

    update public.inventory
      set quantity = quantity - v_qty,
          updated_at = now()
    where product_id = v_product_id;

    insert into public.inventory_moves(product_id, user_id, delta, reason)
    values (v_product_id, v_seller_id, -v_qty, 'sale:' || v_sale_id::text);

    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_total := v_total + v_line_total;
  end loop;

  v_total := v_total - coalesce(p_discount_total,0);
  if v_total < 0 then v_total := 0; end if;

  if p_payment_method in ('pix','dinheiro') then
    v_paid := coalesce(p_paid_amount, v_total);
    if v_paid < 0 then v_paid := 0; end if;
    if v_paid > v_total then v_paid := v_total; end if;
  else
    v_paid := coalesce(p_paid_amount, 0);
    if v_paid < 0 then v_paid := 0; end if;
    if v_paid > v_total then v_paid := v_total; end if;
  end if;

  update public.sales
    set subtotal = v_subtotal,
        total = v_total,
        paid_amount = v_paid
  where id = v_sale_id;

  if p_payment_method = 'fiado' then
    insert into public.receivables(sale_id, customer_id, total, paid, status, due_date)
    values (
      v_sale_id,
      v_customer_id,
      v_total,
      v_paid,
      case when v_paid = 0 then 'open' when v_paid < v_total then 'partial' else 'paid' end,
      p_due_date
    );
  end if;

  return v_sale_id;
end;
$$;

revoke all on function public.pdv_create_sale(text,jsonb,jsonb,numeric,date,numeric) from public;
grant execute on function public.pdv_create_sale(text,jsonb,jsonb,numeric,date,numeric) to authenticated;
