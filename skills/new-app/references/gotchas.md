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
- **One missing column 500s every read of that table.** Drizzle SELECTs name every column in the
  schema object, so a schema/DB drift of a single column is not a partial failure — it is
  `no such column` on every query against that table. Diagnose by diffing
  `pragma_table_info('<table>')` against the schema file.
- **`d1_migrations` can be silently empty.** If the schema was ever applied with `d1 execute`
  instead of `migrations apply`, the tracking table has no rows: `migrations list` then lies
  (reports applied migrations as pending) and the next real `apply` tries to replay `0000` and
  fails. Backfill with `INSERT OR IGNORE INTO d1_migrations (name) VALUES (...)` for each already-
  applied file, on local **and** remote.
- **Generating a migration is not applying it.** `pnpm db:generate` only writes SQL. Local dev
  needs `wrangler d1 migrations apply <db> --local --persist-to .wrangler/state`. After a
  `.wrangler` reset, the local DB silently falls behind and inserts fail with a generic 500.
- **`db.batch()` takes query-builder objects, not raw SQL.** `db.batch([db.run(sql\`…\`)])` throws
  `Cannot read properties of undefined (reading 'bind')`. Use `db.insert(...)` / `db.update(...)`.
- **Never wipe the local D1 while the dev server is running** — the worker keeps writing to the
  deleted file and changes vanish. Restart after any `rm -rf .wrangler/state/v3/d1`.

## Cross-origin (bites only in prod)
- Web (`app.example.com`) and API (`api.example.com`) are **separate custom domains** in prod.
  Any URL the **browser navigates to directly** (checkout redirect, OAuth start, file download)
  must be prefixed with `API_BASE` from `lib/api.ts`, or it 404s against the web origin. In dev a
  same-origin proxy masks this, so the bug only shows in prod. `fetch()` calls that already go
  through `apiFetch`/`API_BASE` are fine.
- Auth cookies are shared across subdomains: `SameSite=Lax`, `Domain=.example.com`. Do **not**
  use a same-origin proxy in prod to fake same-origin — set the cookie domain instead.
- **`PUBLIC_*` env vars are inlined at BUILD time and are often `undefined` at runtime on Workers.**
  If the API origin resolves to `""`, every server-rendered absolute link silently becomes relative
  and 404s. Desktop hydration usually repairs the link before anyone clicks, so **the people who
  hit it are mobile users tapping before JS loads**. Keep a hardcoded `PROD_API_ORIGIN` constant as
  the final fallback, used for SSR *and* browser.
- **Google OAuth: register callbacks under "Authorized redirect URIs", not "Authorized JavaScript
  origins"** (the latter does nothing for this flow), once per environment.
- **Query params do not reliably survive an OAuth round-trip.** Do not carry state you care about
  in the redirect URL — put it in client storage with a TTL and read it on landing.
- **Auth-state changes need a hard navigation** (`window.location.href`), not a client-side soft
  nav, so SSR re-evaluates the session. Put it in a `finally` so it runs even if logout throws.

## Styling (Tailwind v4)
- **Wrap DS resets in `@layer base`.** An unlayered `base.css` reset overrides `@layer utilities`,
  so `text-*`/`bg-*` utilities silently fail. Everything in the DS token/reset layer must be
  `@layer base`, or map tokens into Tailwind `@theme` so they become real utilities. The classic
  symptom: `bg-*` works but `text-*` does nothing, because a stray `a { color: inherit }` outranks
  it. When a color utility appears inert, suspect an unlayered rule before specificity.
- **All `@import` rules must precede every other rule.** A font `@import` placed after
  `@import "tailwindcss"` is dropped silently.
- **`@theme` cannot self-reference.** `--radius-md: var(--radius-md)` is circular; use literal
  values inside `@theme`, or give the source token a different name.
- **Astro scoped styles never reach island-rendered markup.** A `.astro` file's scoped CSS cannot
  style DOM produced by a React island — use `:global()` or put the rule in `globals.css`.

## Layout traps
- **A provider/portal island inside a flex parent steals space before its own CSS lands.** Sonner
  applies `position: fixed` at runtime; until then the `<astro-island>` is a flex item and shoves
  the layout sideways. Fix both ends: wrap it in `display:contents`, and force
  `[data-sonner-toaster] { position: fixed !important; pointer-events: none !important }`
  unlayered so it wins the hydration race. Set `pointer-events: auto` on the toasts themselves.
- **Use `100dvh`, not `100vh`,** for full-height shells — mobile browser chrome makes `vh` taller
  than the visible viewport, so the bottom is cut off.
- **`min-width: 0` / `min-height: 0` on flex children that scroll.** Without it a wide or tall
  child refuses to shrink and blows out the sidebar or the page instead of scrolling internally.
- **Fixed elements need `env(safe-area-inset-*)`** and `viewport-fit=cover`, or they sit under the
  notch / home indicator.

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
- **The success redirect confirms nothing.** `?purchased=1` means the user came back from the
  checkout page, not that money moved or the webhook landed. Word the toast accordingly and
  re-fetch the balance on a short delay rather than asserting a grant that has not arrived.
- **Standard Webhooks signature, exactly:** signed content is `${webhook-id}.${webhook-timestamp}.${rawBody}`,
  HMAC-SHA256, **base64** (not hex), key = raw UTF-8 bytes of the whole secret string including its
  prefix. The header is a space-separated list of `v1,<sig>` entries; match any one.
- **FK confusion:** `credit_transactions.order_id` points at your **local** `orders.id`, not the
  provider's order id (that is `providerOrderId`). Insert the local row with an explicit id and
  pass that id to the credit grant.
- **Local webhook testing needs a public tunnel.** Providers cannot reach localhost. Use a named
  tunnel; if your network blocks QUIC/UDP, add `--protocol http2`.

## Queue reliability
- **Give the DLQ a consumer.** A dead-letter queue with 0 consumers means jobs that exhaust
  retries vanish silently. Wire an alert/logger on it.
- **Classify failures.** `isPermanent = (err is ProviderError && !err.retryable) || attempts >= max`.
  On permanent failure: refund, set status=failed, notify, ack. Don't let a billing/out-of-credit
  error masquerade as a retryable "overloaded" — it wastes retries and fires false alerts.
- **Update visible status at the START of a handler**, so a stuck job shows the real step, not a
  frozen earlier one.
- **Secondary/best-effort steps must never touch the parent record's state.** A generic
  `catch → mark parent failed` once flipped a completed, paid record to `failed` because an
  unrelated optional side-job errored. Special-case those steps: refund and notify, leave the
  parent alone.
- **A best-effort step must never overwrite the source-of-truth artifact.** Write derivatives to a
  new key. A silently-misfiring enhancement that rewrites the original degrades paid output while
  logging success.
- **Anything buffering more than ~50 MB does not belong in a Worker** — it dies with
  `exceededMemory`, and it can fail in production while appearing to work locally. Move it to a
  Container behind a service binding.

## Email
- The from-address must match the configured sending domain/subdomain exactly, or Cloudflare Email
  Sending fails **silently**. Keep sender identities in one `SENDERS` map with explicit Reply-To.
- **Email *Sending* is a different product from Email *Routing*.** Routing (inbound MX/SPF/DKIM on
  the apex) cannot send outbound to arbitrary recipients. Send from the onboarded sending
  subdomain, and note reply-to addresses need their own Routing rules or replies bounce.
- **Declare the binding unrestricted** — `{ "name": "EMAIL" }`. Adding `destination_address` locks
  it to that single recipient and silently drops mail to everyone else.
- Sending inside `waitUntil` with a `.catch(console.error)` returns **200 to the client even when
  delivery fails**. Diagnose with `wrangler tail` (attach before triggering).

## Deployment / config
- **Every worker has its own `vars`.** A shared value updated in one worker and forgotten in
  another took a whole production pipeline down: the queue worker still pointed at a `workers.dev`
  host, which does **not** serve custom-domain routes, so every asset fetch 404'd. Audit *all*
  workers whenever a domain or shared URL changes.
- **Error-swallowing fallbacks turn a config bug into an unrelated-looking content bug.** The
  above surfaced as a nonsense upstream error because a `catch` replaced the failed fetch with a
  default value. Prefer failing loudly over defaulting silently.
- **Astro + Cloudflare needs `dist/.assetsignore`** before deploy:
  `printf "_worker.js\n_routes.json\n" > dist/.assetsignore`, or wrangler refuses the upload.
- **Turn on `observability`** (`{ "enabled": true }`) in every `wrangler.jsonc` from day one, or
  `console.error` is never retained and post-hoc debugging is impossible — only a live `tail`.
- `wrangler deploy` needs `--env=""` when multiple environments are defined, and
  `CLOUDFLARE_ACCOUNT_ID` exported when the machine has more than one account.
- **Immutable `Cache-Control` on a proxy route makes a wrong response permanently sticky** at the
  edge. Verify content types against the origin directly, and cache-bust reprocessed objects with
  a `?v=` param.
