# Starter App

A production-ready starter for building web apps on **Cloudflare's edge**. It gives you the boring-
but-essential 80% of a real product — sign-in, a database, background jobs, a design system, and
optional payments — so you can start on the part that's actually yours.

It boots and runs **with no API keys and no accounts**. Clone it, `pnpm dev`, sign in, create
something, watch a background job process it.

---

## What you get

| | |
|---|---|
| **Sign-in that works** | Google sign-in **and** passwordless magic links. Sessions in a cookie, cached at the edge. |
| **A database** | Cloudflare D1 (SQLite) with [Drizzle ORM](https://orm.drizzle.team). 14 tables covering users, teams, files, and billing. Migrations included. |
| **Background jobs** | A Cloudflare Queue that runs multi-step work reliably, with automatic retries, a dead-letter queue, and clean failure handling. |
| **A frontend** | [Astro](https://astro.build) with server-side rendering, React islands, and [shadcn/ui](https://ui.shadcn.com) components. |
| **A design system** | Design tokens (color, type, spacing, shadows) that every component reads from. Rebrand the whole app by editing three files. |
| **File storage** | Cloudflare R2, with a ready-made upload + download path. |
| **Payments (optional)** | Off by default. Provider-agnostic — bring Stripe, Polar, Paddle, or a local processor. |
| **Credits (optional)** | Off by default. A usage-metering layer if your app needs one. |

Everything runs on Cloudflare Workers, so it's fast everywhere and cheap to host.

---

## The 60-second version

```bash
git clone https://github.com/euphoriawolf/ai-assisted-app-kit.git
cp -R ai-assisted-app-kit/skills/new-app/templates/starter-monorepo myapp && cd myapp
nvm use 22          # Node 22 required
pnpm install
pnpm db:generate    # create the database migration
pnpm dev            # API + jobs on :8787, web on :4321
```

Open **http://localhost:4321**, click sign in, enter any email. **The magic-link sign-in URL is
printed in your terminal** — no mailbox needed. Paste it in the browser and you're logged in.

Then create an item and watch it move through `pending → processing → done` in real time. That's
the background job pipeline running end to end.

---

## How it fits together

```
Browser
   │
   ▼
packages/web ......... Astro site + dashboard (the UI you see)
   │  calls /api/v1/*
   ▼
packages/api ......... Hono API on Workers (auth, resources, files, payments)
   │  puts a message on a queue
   ▼
packages/queue ....... Background worker (does slow work, retries, refunds on failure)
   │
   ▼
D1 (database) · R2 (files) · KV (cache)
```

Two shared packages support them:

- **`packages/shared`** — types, validation schemas, and config used by everything.
- **`packages/db`** — the database schema and migrations.

### The example feature

The starter ships one worked example called **items** so nothing is theoretical. An "item" is
created in the UI, saved to the database, handed to the background queue, processed in three steps,
and the result is saved to file storage.

**This is your template.** Rename `item` to whatever your app actually makes (a report, a video, an
invoice, a design) and replace the processing step with your real work. The plumbing — auth,
progress tracking, retries, storage — already works.

The one place your real work goes is `packages/queue/src/processor.ts`. It currently writes a small
JSON file. Swap in an AI model call, an API request, an image render, whatever your app does.

---

## Making it yours

### 1. Rename it

The starter uses `starterapp` and `@app/` as placeholders. Find and replace them with your app's
name across the repo, including in `wrangler.jsonc` files (the Cloudflare config).

### 2. Rebrand it

Everything visual comes from design tokens. Edit these three files and the entire app follows:

- `packages/web/src/styles/ds/colors.css` — your colors (the app ships neutral grey)
- `packages/web/src/styles/ds/typography.css` — your fonts (ships with system fonts, no downloads)
- `packages/web/src/styles/ds/elevation.css` — corner rounding and shadows

Components never hardcode a color. They read token names, so a rebrand touches no component code.

### 3. Turn on what you need

Open **`packages/shared/src/constants/features.ts`**. Everything optional lives there:

```ts
export const FEATURES = {
  credits: { enabled: false, gateCreation: true, initialGrant: 0 },
  billing: { enabled: false, provider: "none" },
};
```

**Both are off by default, on purpose.** The app makes no assumption that you charge money or meter
usage. Most apps start with neither.

- **Credits** — turn on if you want to meter usage (each action costs credits). `initialGrant` gives
  new users a free allowance.
- **Billing** — turn on to sell those credits. Then pick a payment provider.

### 4. Add a payment provider (only if you're charging)

Payments sit behind a small adapter interface, so you're not locked into one company or country.

```
packages/api/src/billing/
  base.ts       the interface (createCheckout + parseWebhook)
  none.ts       the default: no payments
  polar.ts      a complete working example
  factory.ts    picks which one to use
```

To use a different provider, copy `polar.ts` to `stripe.ts`, implement the same two methods against
their API, and register it in `factory.ts`. Nothing else in the codebase changes — the rest of the
app never learns which provider you use. Point the provider's webhook at
`POST /api/v1/webhooks/billing`.

Pricing has **one dial**: `CREDITS_PER_DOLLAR` in `packages/shared/src/constants/credits.ts`. Change
it and everything reprices at once, because no price is ever stored anywhere else.

---

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run everything locally (API + jobs on :8787, web on :4321) |
| `pnpm db:generate` | Create a migration after changing the database schema |
| `pnpm typecheck` | Type-check every package |
| `pnpm build` | Build for production |

---

## Going live

You'll need a free [Cloudflare account](https://dash.cloudflare.com). Create the resources, paste
the IDs into the `wrangler.jsonc` files, and deploy:

```bash
wrangler d1 create myapp
wrangler r2 bucket create myapp-assets
wrangler kv namespace create SESSION_CACHE
wrangler queues create myapp-jobs && wrangler queues create myapp-dlq

cd packages/api && wrangler deploy
cd ../queue     && wrangler deploy

# Web: wrangler refuses to upload _worker.js as a static asset, so exclude it first
cd ../web && pnpm build
printf "_worker.js\n_routes.json\n" > dist/.assetsignore
wrangler deploy
```

Before the first web deploy, set `PROD_API_ORIGIN` in `src/lib/api.ts` to your API's real origin.
It is deliberately hardcoded: `PUBLIC_*` env vars are inlined at build time and are often missing
at runtime on Workers, and the fallback is what stops server-rendered links pointing nowhere.

Secrets (Google sign-in, payment keys) never go in config files — use
`wrangler secret put GOOGLE_CLIENT_ID` and friends. Copy `.dev.vars.example` to
`packages/api/.dev.vars` for local development.

For Google sign-in, register the callback under **Authorized redirect URIs** (not "Authorized
JavaScript origins", which does nothing here), once per environment:
`https://api.yourdomain.com/api/v1/auth/google/callback` and the localhost equivalent.

---

## Things that will bite you (learned the hard way)

These are baked into the code already, but worth knowing before you change things:

- **Node 22 is required.** Wrangler hangs silently on Node 20.
- **The API and queue must run in one process locally.** `pnpm dev` handles this. If you run them
  separately, jobs get queued and never picked up.
- **Links the browser navigates to** (sign-in, checkout, downloads) must use `API_BASE` from
  `lib/api.ts`. Regular `fetch` calls are fine. Get this wrong and it works locally but 404s in
  production.
- **Timestamps must carry a timezone.** SQLite's plain `datetime('now')` omits it and every date
  renders hours off. The schema defaults are already fixed to write proper UTC; keep writing
  `new Date().toISOString()` in code, and read dates through `parseTimestamp()`.
- **CSS resets must stay inside `@layer base`.** Otherwise they silently override Tailwind classes.
- **Give the dead-letter queue a consumer.** Without one, failed jobs vanish without a trace. One is
  already wired up.

---

## Requirements

- Node 22 (`nvm use 22`)
- pnpm 9
- A Cloudflare account (only when you deploy — local development needs nothing)

## License

MIT
