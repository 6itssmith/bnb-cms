# Aura Crib CMS — Build Plan

Status: **built** (see README.md for setup/bootstrap). This is kept as the
original design reference; if behavior here and in the running app ever
diverge, treat the code + README as current and this as historical intent.

This covers the admin/CMS app per `Update_Module.md` §2, incorporating the
decisions made so far:
- Separate app/deployment from the guest site
- Manual signup + Super Admin approval for staff accounts
- Property content is instant/live (guest site fetches from Supabase, not a static file)
- Overview dashboard has trend charts
- Housekeeping tasks are manual, with an auto-generated suggestion from each booking for reference

---

## 1. Architecture

**Two separate apps, one Supabase backend:**

| | Guest site (`aura-crib`) | CMS (`aura-crib-cms`, new) |
|---|---|---|
| Rendering | Static export, no server | Normal Next.js (SSR/middleware) |
| Audience | Guests, no login | Staff only, logged in |
| Hosting | Any static host / CDN | Vercel or similar (needs a Node server) |
| Auth | None | Supabase Auth |

They're separate because the guest site's static export can't run middleware
or protect routes server-side — fine for public pages, wrong for an admin
panel. The CMS gets its own deployment so route protection is real
(enforced before a page even renders), not just a client-side check.

Both talk to the **same Supabase project** — same database, same Edge
Functions already built for payments.

---

## 2. Database additions

New migration `002_cms.sql`, additive only — doesn't touch `bookings` /
`payments`.

```
staff_profiles
  id            uuid (= auth.users.id)
  full_name     text
  email         text
  role          enum: super_admin | manager | staff
  status        enum: pending | active | suspended
  created_at    timestamptz

staff_audit_log
  id            uuid
  actor_id      uuid → staff_profiles
  action        text        -- e.g. "booking.cancelled", "price.updated"
  target_table  text
  target_id     text
  details       jsonb
  created_at    timestamptz

property_content
  id            uuid (single row for this single-property site)
  name, tagline, location, description
  support_email, support_phone
  base_price_per_night, currency
  gallery       jsonb   -- [{url, alt}]
  amenities     jsonb   -- [{icon, label}]
  policies      jsonb   -- [string]
  updated_by    uuid → staff_profiles
  updated_at    timestamptz

housekeeping_tasks
  id            uuid
  booking_id    uuid → bookings (nullable — manual tasks have no booking)
  title         text
  due_date      date
  status        enum: suggested | assigned | done
  assigned_to   uuid → staff_profiles (nullable)
  source        enum: auto | manual
  created_at    timestamptz
```

A trigger on `bookings` (status → `confirmed`) inserts one `housekeeping_tasks`
row with `source = 'auto'`, `status = 'suggested'`, `due_date = check_out`.
It's just a suggestion sitting in the task list — staff still assign it,
edit it, or ignore it; nothing runs automatically beyond that.

`property_content` gets a public, anon-readable RLS policy (`SELECT` only)
so the guest site can fetch it live with no auth. All writes require
`manager` or `super_admin`.

> Implementation note: two things turned out to be necessary beyond this
> original sketch and were added in `002_cms.sql`: a `reviews` table (the
> "Reviews moderation" feature below needs something to moderate, and none
> existed), and a `date_price_overrides` table (the "Calendar management"
> feature's inline price override needs somewhere to live). Both are
> additive and follow the same RLS pattern as everything else here.

---

## 3. Auth & security levels

- **Login**: Supabase Auth, email/password.
- **Signup**: a `/signup` page creates the `auth.users` row *and* a
  `staff_profiles` row with `status = 'pending'`. They can't log into
  anything past a "waiting for approval" screen until a Super Admin
  flips them to `active` and assigns a role, from **Settings → Staff**.
- **Route protection**: Next.js `middleware.ts` checks the Supabase
  session on every `/dashboard/*` request, server-side, before the page
  renders — redirects to `/login` if missing, `/pending-approval` if
  `status = 'pending'`.
- **Real enforcement is RLS**, not the middleware — middleware is the
  UX (redirects, no flash of content), RLS is what actually stops a
  `staff` account from e.g. deleting a booking even if they hit the API
  directly.

**Permission matrix:**

| | Super Admin | Manager | Staff |
|---|---|---|---|
| Approve/manage staff accounts | ✅ | – | – |
| Settings (payments, templates) | ✅ | – | – |
| Bookings — view | ✅ | ✅ | ✅ |
| Bookings — edit/cancel/refund | ✅ | ✅ | – |
| Pricing / calendar blocks | ✅ | ✅ | – |
| Property content editor | ✅ | ✅ | – |
| Housekeeping — view | ✅ | ✅ | ✅ |
| Housekeeping — assign/update | ✅ | ✅ | update own only |
| Reviews — view | ✅ | ✅ | ✅ |
| Reviews — respond/approve | ✅ | ✅ | respond only |
| Audit log | ✅ | – | – |

---

## 4. Feature breakdown

1. **Overview dashboard** — occupancy %, today's check-ins/outs, monthly
   revenue, pending bookings count, plus a revenue-by-day and
   occupancy-by-day chart (last 30/90 days, toggle) using Recharts.
2. **Calendar management** — month/week grid, click to block/unblock a
   date, inline price override per date (falls back to
   `property_content.base_price_per_night`).
3. **Bookings CRUD** — filterable table (status, date range, guest name),
   detail drawer, cancel/refund action (refund calls the existing
   Stripe/PayPal/M-Pesa functions where applicable), notes field.
4. **Property content editor** — form bound to `property_content`;
   gallery/amenities/policies as repeatable list editors; saves trigger
   the guest site's next live fetch to show the update immediately.
5. **Reports & analytics** — date-range revenue/occupancy summary, CSV
   export (client-side, no extra backend needed).
6. **Housekeeping** — kanban-style board (Suggested → Assigned → Done),
   auto-suggested cards from the booking trigger above, plus a "new
   manual task" button.
7. **Reviews moderation** — list of submitted reviews, approve/hide
   toggle (controls what the guest site's Testimonials section shows),
   reply field.
8. **Settings** — staff list with pending-approval queue (approve +
   assign role), payment provider status (read-only — keys/secrets stay
   in Supabase secrets, never editable from the UI), audit log (Super
   Admin only).

---

## 5. Guest-site changes required

Since content goes live/instant:
- `lib/data.ts`'s hardcoded `property` export is replaced with a fetch
  from `property_content` (via the anon-readable policy) — a small
  client-side hook, loaded once per page with a sensible loading
  skeleton so nothing looks broken while it fetches.
- This is a real, if fairly contained, change to the already-repaired
  guest end. I'll do it as part of this CMS pass since the two are
  coupled, but I'll flag it clearly when it's done rather than bundle it
  in silently.

> Implementation note: this pass built the CMS only, per explicit
> instruction. The guest-site live-fetch change described above is still
> outstanding — see README.md "What's deliberately not done here".

---

## 6. Build order

1. Migration `002_cms.sql` (schema + RLS + trigger)
2. CMS app scaffold: auth, middleware, layout/sidebar shell
3. Settings → Staff (approval flow) — needed first since nothing else
   is reachable without an approved account
4. Overview dashboard + charts
5. Bookings CRUD
6. Housekeeping board
7. Property content editor + guest-site live-fetch change
8. Reviews moderation
9. Reports/export

## 7. Assumptions I'm making unless told otherwise

- Email/password auth is fine for staff (no SSO/magic link needed yet).
- No MFA for Super Admin for this first version.
- Refunds trigger through the existing payment provider functions where
  a real API supports it (Stripe/PayPal); M-Pesa reversals are
  manual/out-of-band and just get logged as a note, since Daraja
  sandbox doesn't support programmatic reversal.
- CSV export is enough for "Reports" for now — no PDF generation.
