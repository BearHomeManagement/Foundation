-- BearTrack Core database setup for Supabase SQL Editor
-- Run this once in Supabase -> SQL Editor before testing live sync.

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  role text default 'customer' check (role in ('customer','technician','ops','admin')),
  name text,
  email text unique,
  phone text,
  preferred_contact text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_email text references public.user_profiles(email) on delete cascade,
  home_name text,
  address text,
  property_type text,
  year_built text,
  square_feet text,
  stories text,
  hvac_count text,
  filter_size text,
  access_notes text,
  complexity_score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.work_orders (
  id text primary key,
  customer_email text,
  name text,
  phone text,
  address text,
  home_name text,
  property_type text,
  service text,
  priority text default 'Normal',
  description text,
  preferred text,
  status text default 'Scheduled',
  appointment text default 'Pending smart schedule',
  assigned text default 'Unassigned',
  membership text default 'None',
  ops_notes text,
  home_health integer,
  recommended_membership text,
  inspection_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;
alter table public.properties enable row level security;
alter table public.work_orders enable row level security;

-- Testing policies: allow frontend anon/publishable key to create and read records.
-- Tighten these before launch with authenticated role checks.
drop policy if exists "bhm test select profiles" on public.user_profiles;
create policy "bhm test select profiles" on public.user_profiles for select using (true);
drop policy if exists "bhm test insert profiles" on public.user_profiles;
create policy "bhm test insert profiles" on public.user_profiles for insert with check (true);
drop policy if exists "bhm test update profiles" on public.user_profiles;
create policy "bhm test update profiles" on public.user_profiles for update using (true) with check (true);

drop policy if exists "bhm test select properties" on public.properties;
create policy "bhm test select properties" on public.properties for select using (true);
drop policy if exists "bhm test insert properties" on public.properties;
create policy "bhm test insert properties" on public.properties for insert with check (true);
drop policy if exists "bhm test update properties" on public.properties;
create policy "bhm test update properties" on public.properties for update using (true) with check (true);

drop policy if exists "bhm test select work orders" on public.work_orders;
create policy "bhm test select work orders" on public.work_orders for select using (true);
drop policy if exists "bhm test insert work orders" on public.work_orders;
create policy "bhm test insert work orders" on public.work_orders for insert with check (true);
drop policy if exists "bhm test update work orders" on public.work_orders;
create policy "bhm test update work orders" on public.work_orders for update using (true) with check (true);
