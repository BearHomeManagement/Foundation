-- Run in Supabase SQL Editor after reviewing your existing schema.
-- Employees must have auth_user_id linked to their Supabase Auth login.
-- Existing work_orders must include technician_id, scheduled_date, scheduled_time, status, completed_at.
create table if not exists public.field_job_reports (
 id uuid primary key default gen_random_uuid(),
 work_order_id uuid not null references public.work_orders(id) on delete cascade,
 technician_id uuid not null references public.employees(id),
 notes text not null default '',
 labour_hours numeric not null default 0,
 materials text not null default '',
 photo_paths jsonb not null default '[]'::jsonb,
 submission_type text not null check(submission_type in ('progress','complete','reschedule')),
 created_at timestamptz not null default now()
);
create index if not exists field_reports_work_order_idx on public.field_job_reports(work_order_id);
alter table public.field_job_reports enable row level security;
create policy "field technician insert own report" on public.field_job_reports for insert to authenticated
 with check (exists(select 1 from public.employees e where e.id=technician_id and e.auth_user_id=auth.uid()) and exists(select 1 from public.work_orders w where w.id=work_order_id and w.technician_id=technician_id));
create policy "field technician read own report" on public.field_job_reports for select to authenticated
 using (exists(select 1 from public.employees e where e.id=technician_id and e.auth_user_id=auth.uid()));
-- Existing work_orders, employees and storage policies must also enforce assigned-only access.
-- Do not apply permissive test RLS policies in production.
