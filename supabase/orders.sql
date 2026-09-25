create table if not exists public.orders (
  id bigint generated always as identity primary key,
  stripe_session_id text unique not null,
  status text not null,
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'eur',
  customer_email text,
  shipping_details jsonb,
  items jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
-- El navegador no tiene política de acceso a pedidos. Solo escribe el servidor con service role.
