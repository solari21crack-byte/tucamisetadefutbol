create table if not exists public.orders (
  id bigint generated always as identity primary key,
  stripe_session_id text unique,
  paypal_order_id text unique,
  status text not null,
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'eur',
  customer_email text,
  shipping_details jsonb,
  items jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.orders alter column stripe_session_id drop not null;
alter table public.orders add column if not exists paypal_order_id text;
create unique index if not exists orders_paypal_order_id_key on public.orders (paypal_order_id);
alter table public.orders enable row level security;
-- El navegador no tiene política de acceso a pedidos. Solo escribe el servidor con service role.
grant select, insert, update on public.orders to service_role;
