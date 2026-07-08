-- 002_cms.sql
-- Additive migration for the Aura Crib CMS (aura-crib-cms). Does not touch
-- bookings/payments/blocked_dates/contact_messages structurally — only adds
-- new tables plus the RLS policies staff need to actually use those
-- existing tables from the CMS (today they're readable/writable only by
-- `service_role`, which the CMS must not hold in the browser).
--
-- Run via: npx supabase db push (from the guest site's `supabase/` project —
-- both apps share this one Supabase backend).

------------------------------------------------------------------------------
-- Column additions to existing tables
------------------------------------------------------------------------------

-- Staff-only free-text notes on a booking (per the CMS build plan's
-- "Bookings CRUD" detail view). Never shown to guests.
alter table public.bookings add column if not exists notes text;

------------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------------

create type staff_role as enum ('super_admin', 'manager', 'staff');
create type staff_status as enum ('pending', 'active', 'suspended');
create type housekeeping_status as enum ('suggested', 'assigned', 'done');
create type housekeeping_source as enum ('auto', 'manual');
create type review_status as enum ('pending', 'approved', 'hidden');

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

-- One row per staff member, keyed to their auth.users row. Created by the
-- /signup page at the same time as the auth user, status starts 'pending'.
create table public.staff_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        staff_role not null default 'staff',
  status      staff_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- Append-only trail of privileged actions taken from the CMS, e.g.
-- "booking.cancelled", "price.updated", "staff.approved".
create table public.staff_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.staff_profiles(id),
  action        text not null,
  target_table  text,
  target_id     text,
  details       jsonb,
  created_at    timestamptz not null default now()
);

-- Single-row table (one property) holding everything the guest site
-- currently hardcodes in lib/data.ts. The guest site's live-fetch of this
-- table is a separate, explicitly-flagged follow-up — not part of this
-- migration's job, just the schema it will read from.
create table public.property_content (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  tagline               text,
  location              text,
  description           text,
  support_email         text,
  support_phone         text,
  base_price_per_night  numeric(10,2) not null,
  currency              text not null default 'KES',
  gallery               jsonb not null default '[]'::jsonb,   -- [{url, alt}]
  amenities             jsonb not null default '[]'::jsonb,   -- [{icon, label}]
  policies              jsonb not null default '[]'::jsonb,   -- [string]
  updated_by            uuid references public.staff_profiles(id),
  updated_at            timestamptz not null default now()
);

-- Guests never log in, so review submissions aren't linked to an account —
-- captured as free-text like the existing ContactForm. Approved rows are
-- what the guest site's Testimonials section should read from once wired up.
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references public.bookings(id) on delete set null,
  guest_name    text not null,
  stay_label    text,          -- e.g. "Stayed 4 nights, June 2026"
  quote         text not null,
  rating        smallint check (rating between 1 and 5),
  status        review_status not null default 'pending',
  reply         text,
  replied_by    uuid references public.staff_profiles(id),
  created_at    timestamptz not null default now()
);

create table public.housekeeping_tasks (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references public.bookings(id) on delete cascade,
  title         text not null,
  due_date      date,
  status        housekeeping_status not null default 'suggested',
  assigned_to   uuid references public.staff_profiles(id),
  source        housekeeping_source not null default 'manual',
  created_at    timestamptz not null default now()
);

-- Per-date price overrides for the CMS Calendar page ("inline price
-- override per date, falls back to property_content.base_price_per_night").
-- Kept separate from `blocked_dates` (which the guest site's calendar
-- already reads for availability) so that table's existing shape and RLS
-- grant don't need to change.
create table public.date_price_overrides (
  date        date primary key,
  price       numeric(10,2) not null,
  updated_by  uuid references public.staff_profiles(id),
  updated_at  timestamptz not null default now()
);

create index staff_audit_log_created_idx on public.staff_audit_log (created_at desc);
create index housekeeping_status_idx on public.housekeeping_tasks (status);
create index reviews_status_idx on public.reviews (status);

------------------------------------------------------------------------------
-- Auto-suggested housekeeping task on booking confirmation
------------------------------------------------------------------------------

create or replace function public.suggest_housekeeping_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and (old.status is distinct from 'confirmed') then
    insert into public.housekeeping_tasks (booking_id, title, due_date, status, source)
    values (
      new.id,
      'Turnover clean — ' || new.guest_name,
      new.check_out,
      'suggested',
      'auto'
    );
  end if;
  return new;
end;
$$;

create trigger bookings_suggest_housekeeping
  after update on public.bookings
  for each row
  execute function public.suggest_housekeeping_task();

------------------------------------------------------------------------------
-- Helper functions for RLS (security definer so they can read
-- staff_profiles regardless of the caller's own row-level access to it)
------------------------------------------------------------------------------

create or replace function public.current_staff_role()
returns staff_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.staff_profiles
  where id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_manager_or_above()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_staff_role() in ('super_admin', 'manager');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_staff_role() = 'super_admin';
$$;

------------------------------------------------------------------------------
-- RLS — new tables
------------------------------------------------------------------------------

alter table public.staff_profiles       enable row level security;
alter table public.staff_audit_log      enable row level security;
alter table public.property_content     enable row level security;
alter table public.reviews              enable row level security;
alter table public.housekeeping_tasks   enable row level security;
alter table public.date_price_overrides enable row level security;

-- staff_profiles: a signed-in user can always read their own row (needed to
-- render the "pending approval" screen and know their own role). Active
-- staff can read everyone's row (needed for the Settings → Staff list and
-- to populate "assigned to" pickers). Only super admins can update role/
-- status; a user can insert their own row once, at signup, always as
-- 'pending' + 'staff' regardless of what they submit.
create policy "a user can read their own staff profile"
  on public.staff_profiles for select
  to authenticated
  using (id = auth.uid());

create policy "active staff can read all staff profiles"
  on public.staff_profiles for select
  to authenticated
  using (public.is_active_staff());

create policy "a user can create their own pending profile at signup"
  on public.staff_profiles for insert
  to authenticated
  with check (id = auth.uid() and status = 'pending' and role = 'staff');

create policy "super admins manage staff profiles"
  on public.staff_profiles for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- staff_audit_log: append-only, super admin read, any active staff can insert
-- (the CMS writes an entry alongside whatever action it just took).
create policy "super admins read the audit log"
  on public.staff_audit_log for select
  to authenticated
  using (public.is_super_admin());

create policy "active staff can write audit log entries"
  on public.staff_audit_log for insert
  to authenticated
  with check (public.is_active_staff() and actor_id = auth.uid());

-- property_content: anon-readable (guest site), writable by manager/super_admin.
create policy "anyone can read property content"
  on public.property_content for select
  to anon, authenticated
  using (true);

create policy "managers can update property content"
  on public.property_content for update
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

create policy "managers can insert property content"
  on public.property_content for insert
  to authenticated
  with check (public.is_manager_or_above());

-- reviews: guests submit (anon insert, matching the existing contact_messages
-- pattern), only approved rows are publicly readable, staff moderate.
create policy "anyone can submit a review"
  on public.reviews for insert
  to anon
  with check (status = 'pending');

create policy "anyone can read approved reviews"
  on public.reviews for select
  to anon
  using (status = 'approved');

create policy "active staff can read all reviews"
  on public.reviews for select
  to authenticated
  using (public.is_active_staff());

create policy "managers moderate reviews"
  on public.reviews for update
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

create policy "staff can reply to reviews"
  on public.reviews for update
  to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- housekeeping_tasks: all active staff can view; manager/super_admin can
-- create/edit anything; plain staff can only update tasks assigned to them
-- (per the permission matrix: "update own only").
create policy "active staff can read housekeeping tasks"
  on public.housekeeping_tasks for select
  to authenticated
  using (public.is_active_staff());

create policy "managers manage housekeeping tasks"
  on public.housekeeping_tasks for all
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

create policy "staff update their own assigned task"
  on public.housekeeping_tasks for update
  to authenticated
  using (public.is_active_staff() and assigned_to = auth.uid())
  with check (public.is_active_staff() and assigned_to = auth.uid());

-- date_price_overrides: anon-readable (guest site can factor overrides into
-- displayed pricing once wired up), manager/super_admin write.
create policy "anyone can read date price overrides"
  on public.date_price_overrides for select
  to anon, authenticated
  using (true);

create policy "managers manage date price overrides"
  on public.date_price_overrides for all
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

------------------------------------------------------------------------------
-- RLS additions — existing tables, staff access
------------------------------------------------------------------------------

-- bookings: all active staff can view; manager/super_admin can edit/cancel.
create policy "active staff can read all bookings"
  on public.bookings for select
  to authenticated
  using (public.is_active_staff());

create policy "managers can update bookings"
  on public.bookings for update
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- blocked_dates: manager/super_admin manage calendar blocks from the CMS.
create policy "managers manage blocked dates"
  on public.blocked_dates for all
  to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- payments: read-only for staff (booking detail view shows payment history);
-- writes stay service-role-only (webhook handlers), except the refund path,
-- which goes through the refund-payment Edge Function using the service
-- role — never a direct client-side update.
create policy "active staff can read payments"
  on public.payments for select
  to authenticated
  using (public.is_active_staff());

-- contact_messages: staff can read submissions (currently service-role only).
create policy "active staff can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_active_staff());
