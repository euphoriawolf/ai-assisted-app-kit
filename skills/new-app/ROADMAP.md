# Roadmap — what ships today, what's optional and not yet built

The starter is deliberately a **spine**, not a finished product. Everything below is additive: the
app boots, typechecks, and runs end to end without any of it.

## Shipping today (built + verified)

Verified by actually booting the app: sign-in via the console-printed magic link, creating an item,
watching the queue job run to completion, and downloading the artifact from R2. Typecheck is clean
across all four TS packages, `astro check` reports 0 errors, and both Workers bundle for deploy.

- **`packages/shared`** — types, Zod schemas, error classes, the `FEATURES` flags, and the credit
  math (`creditsForDollars`, the single price lever).
- **`packages/db`** — Drizzle schema, 14 tables, migrations, and the `sync-migrations` step.
- **`packages/api`** — Hono on Workers: Google OAuth + magic-link auth, sessions (KV-cached),
  the example `items` resource, credits, provider-agnostic billing (`billing/` adapter seam),
  R2 file proxy, structured logging, rate limiting, and a daily cron.
- **`packages/queue`** — queue consumer with the 3-step example job, retry/backoff, permanent-
  failure classification, refunds, and a dead-letter-queue consumer.
- **`packages/web`** — Astro SSR + React islands, the DS token layer + shadcn bridge, `AppShell`,
  login, dashboard, new-item, item detail with live progress, and billing.

## Not yet built (add when you need them)

Each is an independent module. `references/modules.md` describes the seams and the prune/add steps.

### Extra API routes
`orgs`, `api-keys`, `admin`, `public` (API-key-authenticated public endpoints), `redeem`, `share`,
`email` (lifecycle sweep endpoints). The database tables for teams, API keys, redemption codes, and
the email log **already exist** in the schema, so these are route + service work, not migrations.

### OpenAPI documentation
The intended shape is **two separate specs**, never merged, so the public one can't leak internal
routes: a public spec (bearer/API-key auth only) served at `/docs`, and an internal spec behind an
admin session at `/internal/docs`.

### Marketing site + SEO
Astro content collections (`blog`, `changelog`, `docs`), programmatic SEO pages, `sitemap.xml`,
`robots.txt`, `llms.txt`, and JSON-LD builders. The starter ships a single minimal landing page and
`MarketingLayout` as the foundation.

### The SEO/LLM growth loop
`SEO-LOOP.md` plus a `scripts/seo/` measure→analyze→build→verify→deploy→log loop, driven by the
`seo-loop` project skill. Depends on the marketing site.

### Lifecycle email
Transactional email ships (magic link, welcome, purchase confirmation). Not built: the scheduled
lifecycle sweep (welcome follow-up, activation, win-back) with `email_log` dedupe and cooldowns,
plus HMAC unsubscribe links. The `email_log` table and the daily cron trigger already exist.

### Heavy off-Worker compute
If a job needs more than a Worker's memory or runtime (large media processing, headless rendering),
add a Container-backed Worker and call it over a service binding. Workers have a hard memory
ceiling; jobs that exceed it must move off-Worker rather than be optimized in place.

## Design rules to preserve when extending

- **Keep the core free of business-model assumptions.** Credits and billing are opt-in flags; the
  base app must always run with both off.
- **Anything external goes behind an adapter** (`billing/base.ts` and `queue/src/processor.ts` are
  the two worked examples), so swapping vendors is a config change.
- **Never store a price or credit count in a payment provider.** Derive from amount + metadata so
  one constant reprices everything and nothing can go stale.
- **Update `CLAUDE.md` as the app changes**, and re-mirror `AGENTS.md`. Those docs are what survive
  a context reset.
