# Deploying to Cloudflare

Two different Cloudflare products, because the two apps are different shapes:

| | This CMS | Guest site (`aura-crib`) |
|---|---|---|
| Next.js output | normal (SSR + middleware) | `output: "export"` (fully static) |
| Cloudflare product | **Workers**, via the OpenNext adapter | **Pages** (static) |
| Why | middleware needs a real server to enforce auth before a page renders | no server needed — just HTML/CSS/JS |

---

## A. CMS → Cloudflare Workers (OpenNext)

This repo is already wired for it: `@opennextjs/cloudflare`, `wrangler.jsonc`,
`open-next.config.ts` are all in place.

### 1. Prerequisites
- A Cloudflare account
- Node 18+
- `npx wrangler login` (opens a browser to authenticate the CLI)

### 2. Environment variables

**Public** (baked into the client bundle at build time) — set these in
`.env` locally, or as Cloudflare Pages/Workers "Build variables" if you
build in CI:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**Secret** (server-only, never in the client bundle) — set these directly
on the Worker, not in `.env`:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
Paste the value when prompted. Repeat for any other server-only secret
this app reads (e.g. if you add Stripe/PayPal admin actions later).

### 3. Build + deploy
```bash
npm install
npm run build                     # next build
npx opennextjs-cloudflare build    # transforms the Next.js build for Workers
npx wrangler deploy               # ships .open-next/worker.js + assets
```

Or add these as scripts (optional convenience) to `package.json`:
```json
"cf:build": "next build && opennextjs-cloudflare build",
"cf:preview": "opennextjs-cloudflare preview",
"cf:deploy": "opennextjs-cloudflare build && wrangler deploy"
```
then just run `npm run cf:deploy`.

### 4. Preview locally before shipping
```bash
npx opennextjs-cloudflare preview
```
Runs the actual Worker build locally via `wrangler dev` — closer to
production than `next dev`, useful for catching Edge-runtime-only issues.

### 5. Custom domain
Cloudflare dashboard → **Workers & Pages** → your `aura-crib-cms` worker →
**Settings → Domains & Routes** → add e.g. `admin.auracrib.co.ke`.

### 6. Known-safe build warning
You'll see this during `next build` — it's expected and non-fatal:
```
A Node.js API is used (process.version) which is not supported in the Edge Runtime.
Import trace: @supabase/supabase-js → @supabase/ssr/createBrowserClient
```
`@supabase/ssr` re-exports both its browser and server client from the same
module, so this reference gets pulled into the bundle even though
`middleware.ts` only calls `createServerClient`. `nodejs_compat` in
`wrangler.jsonc` (already set) polyfills `process` on Cloudflare Workers, so
this doesn't break anything at runtime — just noise in the build log.

### 7. Post-deploy checklist
- Visit `/login` — should render (not redirect-loop).
- Try a dashboard URL while logged out — should redirect to `/login`.
- Log in with a `pending` staff account — should redirect to `/pending-approval`.
- Confirm Supabase Auth cookies are being set on your CMS domain (check
  DevTools → Application → Cookies) — if you changed the domain, make sure
  it's added under Supabase **Auth → URL Configuration → Redirect URLs**.

---

## B. Guest site → Cloudflare Pages (static)

The guest site builds to a plain folder of HTML/CSS/JS (`out/`) — no
adapter, no Worker, no server.

### 1. Via the Cloudflare dashboard
1. **Workers & Pages → Create → Pages → Connect to Git** (or **Direct Upload**
   if you'd rather not connect a repo).
2. Build settings:
   - Framework preset: `Next.js (Static HTML Export)` — or `None`, either works since the config already sets `output: "export"`.
   - Build command: `npm run build`
   - Build output directory: `out`
3. Environment variables (Pages project → **Settings → Environment variables**,
   set for both Production and Preview):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   (These are the only two the guest site needs — everything else, including
   all payment provider secrets, lives in Supabase Edge Function secrets, not
   here.)
4. Save and deploy. Cloudflare rebuilds on every push to the connected branch.

### 2. Via Wrangler CLI instead (no dashboard, no Git connection needed)
```bash
npm install
npm run build                 # outputs to ./out
npx wrangler pages deploy out --project-name=aura-crib-guest
```

### 3. Custom domain
Pages project → **Custom domains** → add e.g. `auracrib.co.ke` and `www.auracrib.co.ke`.

### 4. Notes specific to this static export
- `images.unoptimized: true` is already set in `next.config.js`, so
  `next/image` works with no image-optimization server (Cloudflare Pages
  has none for a static deploy).
- Next's static export already generates a `404.html` — Cloudflare Pages
  picks this up automatically as the custom 404 page, no `_redirects` file
  needed.
- All dynamic behavior (booking creation, payments, notifications) happens
  through Supabase Edge Functions called directly from the browser — there
  is no Next.js server involved on this deployment, by design.
