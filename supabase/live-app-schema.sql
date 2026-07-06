
-- Bear Home Management live app schema support
-- Run in Supabase SQL Editor if the live Ops portal cannot save/read records.

create table if not exists public.customers (
  id text primary key,
  name text,
  email text,
  phone text,
  address text,
  street text,
  city text,
  state text,
  zip text,
  membership text default 'None',
  status text default 'Lead',
  notes text,
  payment_last4 text,
  payment_status text default 'Not Set',
  service text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.work_orders (
  id text primary key,
  customer_id text,
  customer text,
  email text,
  phone text,
  address text,
  service text,
  priority text default 'Normal',
  description text,
  status text default 'Unassigned',
  appointment text,
  assigned text default 'Unassigned',
  notes text,
  completed_at text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.technicians (
  id text primary key,
  name text,
  role text default 'Technician',
  status text default 'Available',
  phone text,
  skills text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.customers add column if not exists street text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists state text;
alter table public.customers add column if not exists zip text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists payment_last4 text;
alter table public.customers add column if not exists payment_status text;
alter table public.customers add column if not exists service text;
alter table public.customers add column if not exists updated_at timestamptz default now();

alter table public.work_orders add column if not exists customer_id text;
alter table public.work_orders add column if not exists customer text;
alter table public.work_orders add column if not exists email text;
alter table public.work_orders add column if not exists phone text;
alter table public.work_orders add column if not exists address text;
alter table public.work_orders add column if not exists service text;
alter table public.work_orders add column if not exists priority text;
alter table public.work_orders add column if not exists description text;
alter table public.work_orders add column if not exists status text;
alter table public.work_orders add column if not exists appointment text;
alter table public.work_orders add column if not exists assigned text;
alter table public.work_orders add column if not exists notes text;
alter table public.work_orders add column if not exists completed_at text;
alter table public.work_orders add column if not exists updated_at timestamptz default now();

alter table public.technicians add column if not exists name text;
alter table public.technicians add column if not exists role text;
alter table public.technicians add column if not exists status text;
alter table public.technicians add column if not exists phone text;
alter table public.technicians add column if not exists skills text;
alter table public.technicians add column if not exists updated_at timestamptz default now();

-- Testing-friendly RLS. Tighten before production launch.
alter table public.customers enable row level security;
alter table public.work_orders enable row level security;
alter table public.technicians enable row level security;

drop policy if exists "anon read customers" on public.customers;
drop policy if exists "anon write customers" on public.customers;
drop policy if exists "anon read work orders" on public.work_orders;
drop policy if exists "anon write work orders" on public.work_orders;
drop policy if exists "anon read technicians" on public.technicians;
drop policy if exists "anon write technicians" on public.technicians;

create policy "anon read customers" on public.customers for select using (true);
create policy "anon write customers" on public.customers for all using (true) with check (true);
create policy "anon read work orders" on public.work_orders for select using (true);
create policy "anon write work orders" on public.work_orders for all using (true) with check (true);
create policy "anon read technicians" on public.technicians for select using (true);
create policy "anon write technicians" on public.technicians for all using (true) with check (true);
