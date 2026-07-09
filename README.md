# Aura Crib CMS

Staff dashboard for Aura Crib — a separate app and deployment from the guest
site, sharing the same Supabase project. See `BUILD_PLAN.md` (the doc this
was built from, kept here for reference) for the full design rationale.

**Architecture note:** this app is a **static export** (`output: "export"`
in `next.config.js`, deployed to Cloudflare Pages as plain files in `out/`)
— there is no server at runtime. It was originally built with a Next.js
server + `middleware.ts` for route protection; that's been replaced with
client-side gating (`lib/StaffProfileContext.tsx` +
`components/RequireAuth.tsx`) backed by Supabase Auth sessions. This was
true then and is still true now: **Row Level Security, not the app, is
what actually enforces access** — see `supabase/migrations/002_cms.sql` in
the guest site's repo. The client-side gating just decides what renders and
where to redirect; assume anyone could bypass it and check RLS instead.
See `CLOUDFLARE_DEPLOY.md` for the deploy steps and exactly what changed.

## Setup

1. Apply the migration from the guest site's repo (this app has no
   migrations of its own — one Supabase project, one migration history):

   ```
   cd ../guest-site
   npx supabase db push   # applies 001_init.sql and 002_cms.sql
   ```

2. Deploy the refund Edge Function (also from the guest site's repo). Its
   `refund-payment/index.ts` was updated alongside this app's static
   export switch — see `CLOUDFLARE_DEPLOY.md` §"Refunds without a server"
   for why:

   ```
   npx supabase functions deploy refund-payment
   npx supabase secrets set STRIPE_SECRET_KEY=... PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... PAYPAL_ENV=sandbox
   ```

3. Install and configure this app:

   ```
   npm install
   cp .env.example .env.local   # fill in the values
   npm run dev
   ```

   Note: only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   are used now — there's no server-only `SUPABASE_SERVICE_ROLE_KEY` in
   this app anymore, since there's no server to hold it. That key now lives
   only as a Supabase Edge Function secret.

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

