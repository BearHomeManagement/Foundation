-- BearOps Auth / RLS Setup
-- Run this in Supabase SQL Editor after creating the tables.
-- This makes the BearOps tables available only to authenticated users.

alter table customers enable row level security;
alter table properties enable row level security;
alter table memberships enable row level security;
alter table home_care_hours enable row level security;
alter table assessments enable row level security;
alter table assessment_categories enable row level security;
alter table assessment_items enable row level security;
alter table work_orders enable row level security;
alter table photos enable row level security;
alter table documents enable row level security;
alter table score_history enable row level security;
alter table maintenance_timeline enable row level security;

create policy "auth customers all" on customers for all to authenticated using (true) with check (true);
create policy "auth properties all" on properties for all to authenticated using (true) with check (true);
create policy "auth memberships all" on memberships for all to authenticated using (true) with check (true);
create policy "auth home care hours all" on home_care_hours for all to authenticated using (true) with check (true);
create policy "auth assessments all" on assessments for all to authenticated using (true) with check (true);
create policy "auth assessment categories all" on assessment_categories for all to authenticated using (true) with check (true);
create policy "auth assessment items all" on assessment_items for all to authenticated using (true) with check (true);
create policy "auth work orders all" on work_orders for all to authenticated using (true) with check (true);
create policy "auth photos all" on photos for all to authenticated using (true) with check (true);
create policy "auth documents all" on documents for all to authenticated using (true) with check (true);
create policy "auth score history all" on score_history for all to authenticated using (true) with check (true);
create policy "auth maintenance timeline all" on maintenance_timeline for all to authenticated using (true) with check (true);
