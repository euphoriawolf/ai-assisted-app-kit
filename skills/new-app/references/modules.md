# Module catalog + prune steps

The starter is **batteries-included**: every module below ships wired and working. During the
day-0 interview, ask which to keep. Prune the ones the app won't use with the steps here — each is
designed to leave the app booting (`pnpm dev` green) afterward.

**Two of them are flag-gated, not core: `credits` and `billing` are OFF by default** in
`packages/shared/src/constants/features.ts` (`FEATURES`). The base app (auth + resource + queue)
runs with no metering and no payments — no business model is assumed. You don't have to prune them
to ship without them; just leave the flags off. Turn them on only when the app needs them. **Prune
their files** only if you want them gone entirely.

Always-core (never pruned): `shared`, `db` (users/sessions), `api` (Hono app + auth), `web`
(AppShell + one dashboard page), the design-system token layer.

| Module | What it adds | Default | Depends on |
|---|---|---|---|
| **auth-google** | Google OAuth sign-in | on | api, db.users/sessions |
| **auth-magic-link** | Passwordless email sign-in | on | api, db.magic_link_tokens, email |
| **queue** | Cloudflare Queue consumer + example multi-step job + DLQ | on | api (producer), db.items |
| **credits** | Optional metering: balance, ledger, gate resource creation | **off (`FEATURES`)** | api, db.credits |
| **billing** | Optional, **provider-agnostic** payments (adapter seam; `polar` ref + `none`) | **off (`FEATURES`)** | api, db.orders, credits |
| **teams** | organizations + org_members + org credit pool | on | api, db.orgs |
| **public-api** | API keys + `/api/v1/public/*` + split OpenAPI + `/docs` | api |
| **marketing** | Astro content-as-code site, blog/changelog/docs, SEO, JSON-LD | web |
| **seo-loop** | `SEO-LOOP.md` + `scripts/seo/` measure→build→deploy loop | marketing |
| **email** | 3 sender identities + lifecycle cron sweep + `email_log` dedupe | api, db.email_log |
| **admin** | admin-gated routes + admin dashboard + internal OpenAPI | api, web |

## Prune steps

### queue
- Delete `packages/queue/`. Remove it from `pnpm-workspace.yaml` (covered by glob) and from the
  root `dev`/`api:dev` scripts (`-c queue`). In `packages/api`, delete the queue producer binding
  from `wrangler.jsonc` and the `enqueue()` calls in the example resource; make the resource do
  its work synchronously (or mark it TODO). Drop the `items.status` state machine if unused.

### credits / billing (usually just leave the flags off)
- **To ship without them:** do nothing — `FEATURES.credits.enabled` and `FEATURES.billing.enabled`
  are already `false`, so the core loop is free and no billing UI/route is active.
- **To enable credits:** set `FEATURES.credits.enabled = true` (+ `initialGrant` for a free trial;
  `gateCreation` to charge on create).
- **To enable billing:** set `FEATURES.billing.enabled = true`, pick `provider` (`"polar"` ships;
  add your own adapter in `packages/api/src/billing/<provider>.ts` implementing `PaymentProvider`
  and register it in `factory.ts`), and wire the provider's product ids + secrets. Point the
  provider's webhook at `POST /api/v1/webhooks/billing`.
- **To delete them entirely:** remove `packages/api/src/billing/`, `routes/{checkout,webhooks}.ts`,
  the web `Billing.tsx` + billing nav, `packages/shared/src/constants/{credits,features}.ts` refs,
  the `credits`/`orders`/`subscriptions`/`credit_transactions` tables (regenerate migrations), and
  the `deductCredits` call in the example resource. Nothing else depends on them.

### teams
- Remove `organizations`/`org_members`/`org_credits` from schema; delete org routes and the org
  settings UI. Anywhere code reads `orgId`, fall back to `userId` scoping.

### public-api
- Delete `api_keys` table + `routes/public.ts` + `openapi/spec.public.ts` + `/docs` route + the
  API-keys UI. Keep `spec.internal.ts` only if `admin` stays; otherwise drop OpenAPI entirely.

### marketing
- Delete the Astro content collections (`content/{blog,changelog,docs,seo-pages}`) and
  `layouts/MarketingLayout.astro` + `components/marketing/*` + the public marketing routes. Keep
  `AppShell` (the authed shell). Remove `sitemap`/`robots`/`llms.txt` generators.

### seo-loop
- Delete `SEO-LOOP.md`, `scripts/seo/`, `.seo.env.example`, and the `.claude/skills/seo-loop`
  project skill. (Auto-pruned if `marketing` is pruned.)

### email
- Delete `email.service.ts` + templates + the lifecycle cron in `wrangler.jsonc` + `email_log`
  table. **Note:** pruning email forces pruning `auth-magic-link` (it needs email) — fall back to
  `auth-google` only, or keep a minimal transactional sender.

### admin
- Delete `middleware/admin.ts`, `routes/admin.ts`, `spec.internal.ts`, `/internal/docs`, and the
  admin dashboard pages. Remove `ADMIN_EMAILS` from env.

## Adding back later
Every module is additive. To add one after the fact, copy its files from a fresh
`templates/starter-monorepo/` checkout and re-wire the bindings — the seams are the same.

## Heavy off-Worker compute / Container worker (not templated)
A Worker has a hard memory ceiling, so genuinely heavy work (large media processing, headless
rendering) will OOM it no matter how you optimize. The fix is a **Container-backed Worker** called
over a service binding. It is not in the starter because it is domain-specific and needs a local
Docker daemon to deploy. Gotchas when you add one: install the buildx plugin, a `credsStore` entry
in Docker config can break the push, and a worker name may not start with a digit.
