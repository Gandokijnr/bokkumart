-- Manual Payout Request System (Drivers)

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid')),
  bank_details jsonb not null default '{}'::jsonb,
  transaction_reference text null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_requests_driver_id_idx on public.payout_requests(driver_id);
create index if not exists payout_requests_status_idx on public.payout_requests(status);

create table if not exists public.payout_request_orders (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.payout_requests(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  delivery_fee_snapshot numeric not null check (delivery_fee_snapshot >= 0),
  created_at timestamptz not null default now(),
  unique(order_id)
);

create index if not exists payout_request_orders_payout_request_id_idx on public.payout_request_orders(payout_request_id);
create index if not exists payout_request_orders_driver_id_idx on public.payout_request_orders(driver_id);

alter table public.payout_requests enable row level security;
alter table public.payout_request_orders enable row level security;

drop policy if exists payout_requests_driver_select on public.payout_requests;
create policy payout_requests_driver_select
on public.payout_requests
for select
to authenticated
using (driver_id = auth.uid());

drop policy if exists payout_requests_driver_insert on public.payout_requests;
create policy payout_requests_driver_insert
on public.payout_requests
for insert
to authenticated
with check (driver_id = auth.uid());

drop policy if exists payout_requests_driver_update on public.payout_requests;
create policy payout_requests_driver_update
on public.payout_requests
for update
to authenticated
using (driver_id = auth.uid())
with check (driver_id = auth.uid());

drop policy if exists payout_request_orders_driver_select on public.payout_request_orders;
create policy payout_request_orders_driver_select
on public.payout_request_orders
for select
to authenticated
using (driver_id = auth.uid());

drop policy if exists payout_request_orders_driver_insert on public.payout_request_orders;
create policy payout_request_orders_driver_insert
on public.payout_request_orders
for insert
to authenticated
with check (driver_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payout_requests_set_updated_at on public.payout_requests;
create trigger payout_requests_set_updated_at
before update on public.payout_requests
for each row execute function public.set_updated_at();

create or replace function public.get_driver_withdrawable_balance(
  p_driver_id uuid,
  p_min_amount numeric default 2000
)
returns table (
  withdrawable_balance numeric,
  eligible_orders_count integer,
  can_request boolean
)
language sql
stable
as $$
  with eligible_orders as (
    select o.id, o.delivery_fee
    from public.orders o
    where o.driver_id = p_driver_id
      and o.status = 'delivered'
      and not exists (
        select 1
        from public.payout_request_orders pro
        where pro.order_id = o.id
      )
  )
  select
    coalesce(sum(eligible_orders.delivery_fee), 0) as withdrawable_balance,
    coalesce(count(eligible_orders.id), 0)::int as eligible_orders_count,
    (coalesce(sum(eligible_orders.delivery_fee), 0) >= p_min_amount) as can_request
  from eligible_orders;
$$;

create or replace function public.create_driver_payout_request(
  p_driver_id uuid,
  p_bank_details jsonb,
  p_min_amount numeric default 2000
)
returns table (
  id uuid,
  driver_id uuid,
  amount numeric,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_amount numeric;
  v_id uuid;
  v_has_pending boolean;
begin
  if p_driver_id is null then
    raise exception 'driver_id is required';
  end if;

  if auth.uid() is null or auth.uid() <> p_driver_id then
    raise exception 'not authorized';
  end if;

  select exists(
    select 1 from public.payout_requests pr
    where pr.driver_id = p_driver_id
      and pr.status in ('pending', 'approved')
  ) into v_has_pending;

  if v_has_pending then
    raise exception 'You already have a pending payout request';
  end if;

  select coalesce(sum(o.delivery_fee), 0)
  into v_amount
  from public.orders o
  where o.driver_id = p_driver_id
    and o.status = 'delivered'
    and not exists (
      select 1
      from public.payout_request_orders pro
      where pro.order_id = o.id
    );

  if v_amount < p_min_amount then
    raise exception 'Insufficient balance. Minimum payout amount is %', p_min_amount;
  end if;

  insert into public.payout_requests(driver_id, amount, status, bank_details)
  values (p_driver_id, v_amount, 'pending', coalesce(p_bank_details, '{}'::jsonb))
  returning payout_requests.id into v_id;

  insert into public.payout_request_orders(payout_request_id, driver_id, order_id, delivery_fee_snapshot)
  select v_id, p_driver_id, o.id, o.delivery_fee
  from public.orders o
  where o.driver_id = p_driver_id
    and o.status = 'delivered'
    and not exists (
      select 1
      from public.payout_request_orders pro
      where pro.order_id = o.id
    );

  return query
    select pr.id, pr.driver_id, pr.amount, pr.status, pr.created_at
    from public.payout_requests pr
    where pr.id = v_id;
end;
$$;

grant execute on function public.get_driver_withdrawable_balance(uuid, numeric) to authenticated;
grant execute on function public.create_driver_payout_request(uuid, jsonb, numeric) to authenticated;
