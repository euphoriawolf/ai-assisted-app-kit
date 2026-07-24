# Portable infra gotchas

Hard-won lessons from running a real app on this stack, each one earned by something breaking in
production. Fold the relevant ones into the generated `CLAUDE.md`. Domain-specific gotchas from the
source app were deliberately left out — only the portable ones are here.

## Runtime / tooling
- **Node 22 required.** Wrangler hangs under Node 20. Ship `.nvmrc` = `22`; tell contributors
  `nvm use`. Every wrangler/deploy command should assume Node 22.
- **Local queue needs ONE Miniflare.** The API (producer) and queue (consumer) must run in the
  same Miniflare instance with shared state, or enqueued jobs are never consumed and generations
  hang at `pending`. Dev script does `wrangler dev -c api -c queue --persist-to .wrangler/state`.
  Do **not** run a standalone queue dev server alongside it — it uses an isolated state dir and
  won't see the API's queue/D1.

## Data
- **Timestamps must carry a zone.** Plain `datetime('now')` yields a zone-less
  `"YYYY-MM-DD HH:MM:SS"` that JS `new Date()` misreads as local time (the classic "created 3 hours
  ago" bug). Defend on all three sides: (1) schema defaults use
  `strftime('%Y-%m-%dT%H:%M:%fZ','now')` so even implicit writes are ISO-8601 UTC — the starter
  ships this; (2) write `new Date().toISOString()` explicitly in code; (3) read every stored
  timestamp through `lib/date.ts` `parseTimestamp()`, which appends `Z` when no zone is present.
  Verified by actually booting the app: a `users` row inserted without an explicit `createdAt` came
  back zone-less until the schema default was fixed.
- **All IDs are UUID strings** via `crypto.randomUUID()`. **JSON columns are SQLite `text`.**
- **DB stores R2 keys, not full URLs.** Generate URLs on demand (signed or via a Worker proxy).
- **Migration dir sync.** Drizzle generates migrations into `packages/db`, but wrangler deploys
  them from `packages/api/migrations`. Keep a `scripts/sync-migrations.mjs` that copies after
  `db:generate`, or prod runs against a stale schema.

## Cross-origin (bites only in prod)
- Web (`app.example.com`) and API (`api.example.com`) are **separate custom domains** in prod.
  Any URL the **browser navigates to directly** (checkout redirect, OAuth start, file download)
  must be prefixed with `API_BASE` from `lib/api.ts`, or it 404s against the web origin. In dev a
  same-origin proxy masks this, so the bug only shows in prod. `fetch()` calls that already go
  through `apiFetch`/`API_BASE` are fine.
- Auth cookies are shared across subdomains: `SameSite=Lax`, `Domain=.example.com`. Do **not**
  use a same-origin proxy in prod to fake same-origin — set the cookie domain instead.

## Styling (Tailwind v4)
- **Wrap DS resets in `@layer base`.** An unlayered `base.css` reset overrides `@layer utilities`,
  so `text-*`/`bg-*` utilities silently fail. Everything in the DS token/reset layer must be
  `@layer base`, or map tokens into Tailwind `@theme` so they become real utilities.

## Billing (optional; provider-agnostic — examples use the Polar adapter)
Billing is off by default (`FEATURES.billing`) and lives behind a `PaymentProvider` adapter
(`packages/api/src/billing`). These apply to Polar; most have a direct analogue in Stripe/Paddle/etc.
- **Polar prices are immutable.** Changing a *price* means creating a new product and pasting the
  new id into `wrangler.jsonc` `vars` (prod) + `.dev.vars` (sandbox). **Never leave stale product
  ids** in config while the UI advertises new prices — if ids aren't ready, remove the vars so
  checkout returns a clean 503 instead of mischarging.
- **Derive credits from `order.amount` + `metadata`, never store a fixed count on the product.**
  One formula (`creditsForDollars(dollars, bonusPct)`) is used by the webhook (grant), the buy UI
  (display), and the margin calculator. Change the *rate* constant + redeploy and everything
  reprices with zero Polar edits, and nothing can go stale and mischarge.
- Grants arrive via the **webhook**, not the redirect. Verify the Standard Webhooks signature;
  dedupe by `providerOrderId`; make the credit add atomic (`db.batch()`).

## Queue reliability
- **Give the DLQ a consumer.** A dead-letter queue with 0 consumers means jobs that exhaust
  retries vanish silently. Wire an alert/logger on it.
- **Classify failures.** `isPermanent = (err is ProviderError && !err.retryable) || attempts >= max`.
  On permanent failure: refund, set status=failed, notify, ack. Don't let a billing/out-of-credit
  error masquerade as a retryable "overloaded" — it wastes retries and fires false alerts.
- **Update visible status at the START of a handler**, so a stuck job shows the real step, not a
  frozen earlier one.

## Email
- The from-address must match the configured sending domain/subdomain exactly, or Cloudflare Email
  Sending fails **silently**. Keep sender identities in one `SENDERS` map with explicit Reply-To.
