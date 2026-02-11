-- ShoppingCell PDV: cash received + change

alter table public.sales
  add column if not exists received_amount numeric not null default 0,
  add column if not exists change_amount numeric not null default 0;

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
  v_received numeric := 0;
  v_change numeric := 0;
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

  insert into public.sales(seller_id, customer_id, payment_method, status, subtotal, discount_total, total, paid_amount, received_amount, change_amount)
  values (
    v_seller_id,
    v_customer_id,
    p_payment_method,
    case when p_payment_method = 'fiado' then 'fiado' else 'paid' end,
    0,
    coalesce(p_discount_total,0),
    0,
    0,
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

  if p_payment_method = 'pix' then
    v_received := v_total;
    v_change := 0;
    v_paid := v_total;
  elsif p_payment_method = 'dinheiro' then
    v_received := coalesce(p_paid_amount, v_total);
    if v_received < 0 then v_received := 0; end if;
    v_change := greatest(0, v_received - v_total);
    v_paid := least(v_total, v_received);
  else
    v_received := coalesce(p_paid_amount, 0);
    if v_received < 0 then v_received := 0; end if;
    v_paid := least(v_total, v_received);
    v_change := 0;
  end if;

  update public.sales
    set subtotal = v_subtotal,
        total = v_total,
        paid_amount = v_paid,
        received_amount = v_received,
        change_amount = v_change
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
