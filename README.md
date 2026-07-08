# Aura Crib CMS

Staff dashboard for Aura Crib — a separate app and deployment from the guest
site, sharing the same Supabase project. See `BUILD_PLAN.md` (the doc this
was built from, kept here for reference) for the full design rationale.

## Setup

1. Apply the migration from the guest site's repo (this app has no
   migrations of its own — one Supabase project, one migration history):

   ```
   cd ../BNB_DEMO
   npx supabase db push   # applies 001_init.sql and 002_cms.sql
   ```

2. Deploy the new refund Edge Function, also from the guest site's repo:

   ```
   npx supabase functions deploy refund-payment
   ```

3. Install and configure this app:

   ```
   npm install
   cp .env.example .env.local   # fill in the values
   npm run dev
   ```

## Bootstrapping the first Super Admin

There's a deliberate chicken-and-egg problem: every signup lands as
`pending`, and only a Super Admin can approve anyone — including the very
first one. Resolve it once, manually, via the Supabase SQL editor:

1. Go to `/signup` and create your own account normally.
2. In the Supabase dashboard's SQL editor, run:

   ```sql
   update public.staff_profiles
   set status = 'active', role = 'super_admin'
   where email = 'you@example.com';
   ```

3. Sign in at `/login`. From here on, use **Settings → Staff** to approve
   everyone else — no more manual SQL needed.

## Roles

| | Super Admin | Manager | Staff |
|---|---|---|---|
| Approve/manage staff accounts | ✅ | – | – |
| Settings (payments, audit log) | ✅ | – | – |
| Bookings — view | ✅ | ✅ | ✅ |
| Bookings — edit/cancel/refund | ✅ | ✅ | – |
| Pricing / calendar blocks | ✅ | ✅ | – |
| Property content editor | ✅ | ✅ | – |
| Housekeeping — view | ✅ | ✅ | ✅ |
| Housekeeping — assign/update | ✅ | ✅ | update own only |
| Reviews — view | ✅ | ✅ | ✅ |
| Reviews — respond/approve | ✅ | ✅ | respond only |
| Audit log | ✅ | – | – |

The sidebar and page-level checks in this app hide/redirect based on role
for UX, but the actual enforcement is Row Level Security in
`002_cms.sql` — assume any client-side check here could be bypassed and
verify the RLS policy still holds if you change something.

## What's deliberately not done here

Per the build plan's own scope: the guest site's `lib/data.ts` still serves
hardcoded property content rather than fetching `property_content` live.
That change is called out there as a small, separate, explicitly-flagged
follow-up to the guest site — not bundled into this CMS build.

Also out of scope for this pass, callable follow-ups: SSO/magic-link auth,
Super Admin MFA, PDF export for Reports (CSV only), and programmatic M-Pesa
reversal (Daraja sandbox has none — see `refund-payment`'s handling of the
`mpesa` provider case).
