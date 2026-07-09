# Deploying the Aura Crib CMS to Cloudflare

**This supersedes the earlier version of this doc**, which set up the CMS
as a full Next.js server on Cloudflare Workers via `@opennextjs/cloudflare`.
The CMS is now a **static export** instead (`output: "export"` in
`next.config.js`) — plain HTML/JS/CSS in `out/`, no server at runtime.
Deploys to **Cloudflare Pages**, same as the guest site.

## Why this changed, and what moved

The CMS originally needed a server for one reason: `middleware.ts` had to
run per-request, server-side, to redirect unauthenticated/unapproved staff
before a dashboard page ever rendered. Static export has no server to run
that on.

What replaced it:

| Before (server) | Now (static) |
|---|---|
| `middleware.ts` redirects before render | `components/RequireAuth.tsx` redirects client-side, after the Supabase session resolves in the browser — see `lib/StaffProfileContext.tsx` |
| `lib/supabase/server.ts` (cookie-based session, Server Components) | `lib/supabase/client.ts` only — plain `@supabase/supabase-js`, session in `localStorage` |
| `lib/auth.ts`'s `getStaffProfile()` fetched server-side per request | Same data now lives in `StaffProfileContext`, fetched once client-side and kept in sync via `onAuthStateChange` |
| `app/api/bookings/[id]/refund/route.ts` held the service-role key server-side, called the Edge Function on the CMS's behalf | Deleted. `BookingDetailDrawer.tsx` calls the `refund-payment` Edge Function **directly** with the signed-in staff member's own session — the Edge Function now verifies that caller's JWT + role itself. See "Refunds without a server" below. |

**What did *not* change:** Row Level Security is still the actual
enforcement layer (`guest-site/supabase/migrations/002_cms.sql`). Every
page-level check in this app (`canManage`, `isSuperAdmin`, the redirect in
`RequireAuth`) is UX only, exactly as it was described when this was a
server app — the difference is only *where* that UX check runs now.

## Refunds without a server

This was the one place the CMS held a secret (`SUPABASE_SERVICE_ROLE_KEY`)
server-side. A static app has nowhere safe to put that, so the design
changed: the CMS never holds that key at all anymore. Instead,
`refund-payment` (in `guest-site/supabase/functions/refund-payment`) now:

1. Reads the `Authorization` header `supabase.functions.invoke` attaches
   automatically — the signed-in staff member's own access token, not a
   shared secret.
2. Verifies that token is a real, current session (`auth.getUser(jwt)`).
3. Looks up that user's `staff_profiles` row (using the service-role key,
   which lives only in the function's own Edge Function secrets) and
   confirms `status = 'active'` and `role` is `manager` or `super_admin`.
4. Only then calls Stripe/PayPal and writes the audit log entry.

**You need to redeploy this function** if you haven't already, since its
auth check changed:

```bash
cd guest-site
npx supabase functions deploy refund-payment
```

The updated source is at
`guest-site/supabase/functions/refund-payment/index.ts` — if you're
working from an older copy of the guest site repo, copy that file in
before deploying.

## Deploying the CMS

### Dashboard (connect the repo)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Build settings:
   - **Root directory**: `aura-crib-cms` (or wherever this app lives in
     your repo)
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
3. Environment variables (Settings → Environment variables), same for
   Production and Preview:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   That's the complete list — there's no service-role key or any other
   server-only variable to set here anymore.
4. Save and deploy.

### CLI alternative

```bash
cd aura-crib-cms
npm install
npm run deploy    # runs: next build && wrangler pages deploy out --project-name=aura-crib-cms
```

### Custom domain

**Workers & Pages → aura-crib-cms → Custom domains** — put it on its own
subdomain (e.g. `cms.auracrib.com`), not the same host as the guest site.

## Guest site (unchanged)

Still exactly as before — plain static export, plain Cloudflare Pages,
`out/` as the build output directory. Nothing in this update touches it
directly.

## Live testing checklist

1. **CMS bootstrap**: `<cms-domain>/signup`, create your account, run the
   one-time SQL from `README.md` to promote it to `super_admin`, sign in.
2. **Client-side gating, not a flash of content**: open
   `<cms-domain>/bookings` in an incognito window. You should briefly see
   a spinner, then land on `/login` — never dashboard content, even for an
   instant. (This is the one meaningful behavior change from the old
   middleware version: there's now always a brief loading state before any
   redirect, since the check can only happen after the page's JS runs. If
   that flash feels too long in practice, that's a sign to revisit this —
   but it should be near-instant on a warm session.)
3. **RLS sanity check**: approve a second account as `staff` (not
   manager/super_admin). Confirm the sidebar hides Calendar/Property/
   Reports/Settings, *and* separately confirm they can't cancel a booking
   even by hitting the drawer's cancel control directly — RLS should
   reject it regardless of what the UI shows.
4. **Refund path**: as manager/super_admin, cancel-and-refund a real
   sandbox-paid booking. Confirm it succeeds, check the Edge Function logs
   in the Supabase dashboard for the call, and confirm `staff_audit_log`
   gets an entry.
5. **Refund path, negative case**: sign in as a plain `staff` account and
   confirm calling refund fails (403 from the Edge Function) even if you
   could somehow trigger the call — this is the check that actually
   matters now that there's no server-side gate in front of it.
6. **Live content**: edit something in Property Content, confirm it saves.
   Reminder: the guest site won't reflect it yet — its live-fetch from
   `property_content` is still the flagged follow-up, not built.

## Troubleshooting a live deployment

### Signup shows a blank / `{}` error

This is almost always Supabase Auth failing to send the confirmation
email through a custom SMTP provider (Brevo, etc.) — GoTrue's error
response in that case doesn't always have a normal `.message`, so it can
render as an empty-looking error. Check, in order:

1. **Supabase dashboard → Authentication → Emails → SMTP Settings**: is
   "Enable Custom SMTP" actually on, and do the host/port/username/password
   match Brevo's SMTP credentials exactly (`smtp-relay.brevo.com`, port
   `587`, login = your Brevo SMTP login, not your account email)?
2. **Sender address**: Brevo requires the "From" address to be a verified
   sender or domain in your Brevo account. An unverified sender is the
   single most common cause of silent send failures.
3. **Fastest unblock for testing**: Authentication → Providers → Email →
   turn **"Confirm email" off**. This CMS's real gate is Super Admin
   approval (`staff_profiles.status`), not email confirmation — email
   confirmation was never load-bearing here, so it's safe to leave off for
   an internal staff tool, not just during testing.
4. This app's `app/signup/page.tsx` now logs the raw Supabase error object
   to the browser console and shows a specific fallback message instead of
   a bare `{}` — if you still see a blank error after redeploying, open
   devtools and check the console for the actual error object.

### Bootstrapped Super Admin still lands on "pending approval"

Creating a user from **Supabase dashboard → Authentication → Users → Add
user** only creates the `auth.users` row — it does **not** create a
matching `staff_profiles` row, because that insert normally happens inside
`app/signup/page.tsx`'s own code, which a dashboard-created user never
runs. With no `staff_profiles` row at all, `RequireAuth` treats that the
same as "pending" and redirects there — indefinitely, no matter what.

Fix: in the Supabase SQL editor, find the user's real id and upsert a
profile for it directly:

```sql
select id, email from auth.users where email = 'you@example.com';

insert into public.staff_profiles (id, full_name, email, role, status)
values ('<uuid-from-above>', 'Your Name', 'you@example.com', 'super_admin', 'active')
on conflict (id) do update set role = 'super_admin', status = 'active';
```

If you signed up through `/signup` instead (so a `pending` row *does*
exist already), just update it rather than inserting:

```sql
update public.staff_profiles
set status = 'active', role = 'super_admin'
where email = 'you@example.com';
```

### Locked out of the whole portal / weird errors on every page

If this happens on *every* page, not just signup, the most likely cause
is a stale `middleware.ts` (or `open-next.config.ts` / `wrangler.jsonc`
pointing at a Worker build) still present in the repo. Next.js still
compiles a middleware bundle even with `output: "export"` — it only warns,
it doesn't fail the build — and **Cloudflare Pages' Next.js framework
preset will pick that up and run it as a Pages Function on every request**,
using the old server-side auth logic this app no longer relies on. That
old logic fighting the new client-side `RequireAuth` is exactly what
produces "authorized in the database but still redirected" symptoms.

Confirm this is/isn't happening:

```bash
rm -rf .next out
npm run build
```

Check the build output. If you see a line like `ƒ Middleware   91 kB`,
`middleware.ts` still exists somewhere in the repo — delete it (along with
`open-next.config.ts` and `wrangler.jsonc`, if present; neither belongs in
a static export). A clean static build should show only `○ (Static)`
routes and no `ƒ Middleware` line.

Also check the Cloudflare Pages project itself: **Settings → Builds &
deployments → Framework preset** should not be set to "Next.js" (that
preset assumes an SSR app and wraps the build accordingly). With a static
export, set it to **None**, with:
- Build command: `npm run build`
- Build output directory: `out`
