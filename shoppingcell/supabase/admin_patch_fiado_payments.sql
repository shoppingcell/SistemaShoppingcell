-- ShoppingCell: Fiado payments (receivable_payments) + RPC to receive

create table if not exists public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  amount numeric not null check (amount > 0),
  received_by uuid null references auth.users(id) on delete set null,
  paid_at timestamptz not null default now(),
  note text null
);

create index if not exists receivable_payments_receivable_idx on public.receivable_payments(receivable_id, paid_at desc);

alter table public.receivable_payments enable row level security;

drop policy if exists receivable_payments_select on public.receivable_payments;
drop policy if exists receivable_payments_insert on public.receivable_payments;
drop policy if exists receivable_payments_update on public.receivable_payments;
drop policy if exists receivable_payments_delete on public.receivable_payments;

create policy receivable_payments_select on public.receivable_payments
for select using (
  public.is_staff_admin() or exists(
    select 1
    from public.receivables r
    join public.sales s on s.id = r.sale_id
    where r.id = receivable_id and s.seller_id = auth.uid()
  )
);

create policy receivable_payments_insert on public.receivable_payments
for insert with check (
  public.is_staff_admin() or exists(
    select 1
    from public.receivables r
    join public.sales s on s.id = r.sale_id
    where r.id = receivable_id and s.seller_id = auth.uid()
  )
);

create policy receivable_payments_update on public.receivable_payments
for update using (public.is_staff_admin());

create policy receivable_payments_delete on public.receivable_payments
for delete using (public.is_staff_admin());

create or replace function public.pdv_receive_fiado_payment(
  p_receivable_id uuid,
  p_amount numeric,
  p_note text default null
)
returns table(
  receivable_id uuid,
  new_paid numeric,
  new_status text,
  sale_id uuid,
  sale_paid_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
  v_sale_id uuid;
  v_total numeric;
  v_paid numeric;
  v_due date;
  v_user uuid;
  v_new_paid numeric;
  v_new_status text;
  v_sale_paid numeric;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  if not (public.is_staff_admin() or exists(select 1 from public.staff_profiles sp where sp.user_id = v_user and sp.active)) then
    raise exception 'not_allowed';
  end if;

  v_amount := coalesce(p_amount, 0);
  if v_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select r.sale_id, r.total, r.paid, r.due_date
    into v_sale_id, v_total, v_paid, v_due
  from public.receivables r
  where r.id = p_receivable_id
  for update;

  if v_sale_id is null then
    raise exception 'receivable_not_found';
  end if;

  if not public.is_staff_admin() then
    if not exists(select 1 from public.sales s where s.id = v_sale_id and s.seller_id = v_user) then
      raise exception 'not_allowed';
    end if;
  end if;

  if v_paid >= v_total then
    v_new_paid := v_paid;
    v_new_status := 'paid';
  else
    v_new_paid := least(v_total, v_paid + v_amount);

    if v_new_paid >= v_total then
      v_new_status := 'paid';
    elsif v_new_paid > 0 then
      v_new_status := 'partial';
    else
      v_new_status := 'open';
    end if;

    if v_new_status <> 'paid' and v_due is not null and v_due < current_date then
      v_new_status := 'overdue';
    end if;

    insert into public.receivable_payments(receivable_id, amount, received_by, note)
    values (p_receivable_id, v_amount, v_user, nullif(trim(coalesce(p_note,'')),''));

    update public.receivables
      set paid = v_new_paid,
          status = v_new_status
    where id = p_receivable_id;

    update public.sales
      set paid_amount = least(total, coalesce(paid_amount,0) + v_amount),
          received_amount = coalesce(received_amount,0) + v_amount
    where id = v_sale_id;
  end if;

  select s.paid_amount into v_sale_paid from public.sales s where s.id = v_sale_id;

  return query
  select p_receivable_id, v_new_paid, v_new_status, v_sale_id, v_sale_paid;
end;
$$;

revoke all on function public.pdv_receive_fiado_payment(uuid,numeric,text) from public;
grant execute on function public.pdv_receive_fiado_payment(uuid,numeric,text) to authenticated;

create or replace function public._receivables_default_due_date()
returns trigger
language plpgsql
as $$
begin
  if new.due_date is null then
    new.due_date := current_date + 30;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_receivables_default_due_date on public.receivables;
create trigger tr_receivables_default_due_date
before insert on public.receivables
for each row execute function public._receivables_default_due_date();
