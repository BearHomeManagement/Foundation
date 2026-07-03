
-- BearTrack Supabase setup
create table if not exists profiles (
  id text primary key,
  created_at timestamptz default now(),
  name text, email text, phone text, "preferred-contact" text,
  "property-address" text, "property-type" text, "year-built" text, "home-size" text,
  "access-notes" text, "home-notes" text, status text
);
create table if not exists workorders (
  id text primary key,
  created_at timestamptz default now(), updated_at timestamptz,
  "customer-name" text, "customer-phone" text, "customer-email" text, "property-address" text,
  "workorder-type" text, priority text, "issue-location" text, "issue-description" text,
  "preferred-appointment" text, "access-permission" text, status text, ops_notes text,
  photo_paths text[]
);
create table if not exists memberships (
  id text primary key,
  created_at timestamptz default now(),
  name text, email text, phone text, "property-address" text,
  "membership-interest" text, "membership-notes" text, status text
);
insert into storage.buckets (id, name, public) values ('beartrack-photos', 'beartrack-photos', false)
on conflict (id) do nothing;
