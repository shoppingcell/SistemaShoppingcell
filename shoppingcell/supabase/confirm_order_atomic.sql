create or replace function public.confirm_order_atomic(
  p_order_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_current numeric;
  v_applied numeric;
  v_adjustments jsonb := '[]'::jsonb;
  v_now timestamptz := now();
begin
  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.status = 'confirmed' then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'confirmed', true,
      'adjustments', v_adjustments
    );
  end if;

  if not exists (
    select 1
      from public.order_items
     where order_id = p_order_id
       and product_id is not null
       and coalesce(quantity, 0) > 0
  ) then
    raise exception 'order_has_no_valid_items' using errcode = 'P0001';
  end if;

  insert into public.inventory (product_id, quantity, min_quantity)
  select distinct oi.product_id, 0, 0
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id is not null
  on conflict (product_id) do nothing;

  for v_item in
    select id, product_id, quantity
      from public.order_items
     where order_id = p_order_id
       and product_id is not null
       and coalesce(quantity, 0) > 0
     order by product_id, id
  loop
    select coalesce(quantity, 0)
      into v_current
      from public.inventory
     where product_id = v_item.product_id
     for update;

    v_applied := greatest(0, least(coalesce(v_item.quantity, 0), v_current));

    if v_applied <> coalesce(v_item.quantity, 0) then
      v_adjustments := v_adjustments || jsonb_build_array(
        jsonb_build_object(
          'product_id', v_item.product_id,
          'requested', coalesce(v_item.quantity, 0),
          'applied', v_applied
        )
      );

      if v_applied <= 0 then
        delete from public.order_items where id = v_item.id;
      else
        update public.order_items
           set quantity = v_applied
         where id = v_item.id;
      end if;
    end if;

    if v_applied > 0 then
      update public.inventory
         set quantity = v_current - v_applied,
             updated_at = v_now
       where product_id = v_item.product_id;

      insert into public.inventory_moves (product_id, user_id, delta, reason)
      values (v_item.product_id, p_user_id, -v_applied, 'order_confirm:' || p_order_id::text);
    end if;
  end loop;

  update public.orders
     set status = 'confirmed'
   where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'confirmed', true,
    'adjustments', v_adjustments
  );
end;
$$;

revoke all on function public.confirm_order_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_order_atomic(uuid, uuid) to service_role;
