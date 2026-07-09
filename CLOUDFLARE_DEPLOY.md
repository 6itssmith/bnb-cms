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
