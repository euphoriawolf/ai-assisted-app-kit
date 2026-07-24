# Scaffold — copy, rename, wire, verify

## Placeholder convention (what the template ships with)

The starter uses `starterapp` / `@app` as placeholders everywhere. The rename pass replaces them
with the new app's slug (lowercase, no leading digit — a Cloudflare worker name cannot start with
a digit; if the brand does, prefix or spell it out, e.g. `4sight` → `foursight`).

| Placeholder | Meaning | Example replacement (`aurora`) |
|---|---|---|
| `@app/` | pnpm workspace scope | `@aurora/` |
| `starterapp` | root pkg name / project slug | `aurora` |
| `starterapp-api` | API worker name | `aurora-api` |
| `starterapp-queue` | queue worker name | `aurora-queue` |
| `starterapp-jobs` / `starterapp-dlq` | queue + dead-letter queue | `aurora-jobs` / `aurora-dlq` |
| `starterapp` (D1) | D1 database name | `aurora` |
| `starterapp-assets` | R2 bucket | `aurora-assets` |
| `starterapp-kv` | KV namespace | `aurora-kv` |
| `app.example.com` / `api.example.com` | prod domains | the user's domains (or leave for later) |
| `Starter App` | display name in copy/OG | the Prose-case app name |
| `items` | the example domain resource | keep as `items`, or rename to the core object |

## Steps

1. **Pick the target directory.** Ask the user (default: `~/<slug>/` or a sibling of the current
   dir). Do not scaffold inside this skill.

2. **Copy the template.**
   ```bash
   cp -R ~/.claude/skills/new-app/templates/starter-monorepo/ <target>/
   cd <target> && git init
   ```

3. **Rename pass.** Replace placeholders with the app's values. Use a script, not manual edits —
   `perl` mangles `$`, so prefer a Python literal-replace over the file set, or careful `sed` for
   the plain identifiers. Cover file *contents* AND paths. Fields to hit: `package.json` names,
   all `wrangler.jsonc` (`name`, `d1_databases`, `r2_buckets`, `kv_namespaces`, `queues`,
   `routes`/`vars`), `.dev.vars.example`, `drizzle.config.ts`, and the `@app/*` imports.
   ```bash
   # from <target>
   grep -rIl --exclude-dir=node_modules -e 'starterapp' -e '@app/' . \
     | while read f; do
         python3 - "$f" <<'PY'
   import sys; p=sys.argv[1]; s=open(p).read()
   s=s.replace('@app/','@aurora/').replace('starterapp','aurora').replace('Starter App','Aurora')
   open(p,'w').write(s)
   PY
       done
   ```
   Then grep-sweep to confirm nothing but intentional strings remain:
   `grep -rI --exclude-dir=node_modules -e starterapp -e '@app/' . || echo clean`.

4. **Decide the example resource name.** If the app's core object has an obvious name (`recipe`,
   `report`, `track`), rename `items`→that now (schema table, api route, queue job, web page). If
   unsure, leave `items` as the worked example and let the build add the real object in Phase 1.

   Renaming touches ~66 files, so script it — but four traps, all hit in a real run:

   - **🚨 NEVER let the rename touch Tailwind utility classes.** This is the worst one. A blanket
     `items` → `clips` rewrites `items-center` into `clips-center`, which Tailwind does not
     generate. Every flex alignment in the app silently dies — buttons, the sidebar, the topbar,
     cards, badges. **`tsc` and `astro check` both pass**, so nothing warns you; it is only visible
     in a browser. Affected utilities: `items-center|items-start|items-end|items-baseline|
     items-stretch`, plus `place-items-*` and `justify-items-*`.
     Always run this restore pass immediately after renaming, then confirm it is zero:
     ```bash
     # <new> is your new resource word, e.g. clips
     grep -rlE "\b<new>-(center|start|end|baseline|stretch)\b" packages/web/src | while read f; do
       python3 - "$f" <<'PY'
     import sys, re
     p=sys.argv[1]; s=open(p).read()
     open(p,'w').write(re.sub(r'\b<new>-(center|start|end|baseline|stretch)\b', r'items-\1', s))
     PY
     done
     grep -rhoE "\b<new>-(center|start|end|baseline|stretch)\b" packages/web/src | wc -l   # must be 0
     ```
   - **Replace CASE-SENSITIVELY.** A case-insensitive `item` → `clip` corrupts
     `InviteMemberSchema`, which contains `Inv·iteM·ember`. Do `items→clips`, `Items→Clips`,
     `item→clip`, `Item→Clip` as separate case-sensitive passes (plural first, or `items` becomes
     `clips` via `item`→`clip` + a stray `s`). Sanity-check first with
     `grep -rhoE '[A-Za-z_]*[Ii]tem[A-Za-z_]*' . | sort -u` and eyeball every match.
   - **Leave generic uses alone.** `PaginatedResult<T> { items: T[] }` in
     `packages/shared/src/types/api.ts` is a generic container, not your domain object. Exclude
     that file, or your generic pagination type ends up saying `clips`.
   - **Fix article agreement afterwards.** "an item" becomes "an clip". Sweep with
     `grep -rn "an <newword>"` and correct to "a". Same for any "a items" leftovers.

   Rename files and directories too (`schema/items.ts`, `types/item.ts`, `routes/items.ts`,
   `components/app/{NewItemForm,ItemDetail}.tsx`, `pages/dashboard/items/`). Use plain `mv` — `git
   mv` fails because nothing is committed yet. Then re-run `pnpm db:generate` so the migration
   creates the renamed table, and typecheck.

5. **Prune opted-out modules** per `references/modules.md`.

6. **Reskin** per `references/theme.md`.

7. **Create the Cloudflare resources** (or defer to deploy time). For local dev, the D1/R2/KV/queue
   bindings just need to exist in `wrangler.jsonc`; Miniflare fakes them locally. For real deploy:
   `wrangler d1 create <slug>`, `wrangler r2 bucket create <slug>-assets`,
   `wrangler kv namespace create <SLUG>_KV`, `wrangler queues create <slug>-jobs` (+ `-dlq`), and
   paste the returned ids back into `wrangler.jsonc`. Requires the user's Cloudflare account.

## Verify (boot)

```bash
nvm use 22          # wrangler hangs on Node 20
pnpm install
pnpm db:generate    # first migration from the schema
pnpm dev            # API+queue on :8787 (one Miniflare), web on :4321
```

Confirm, using the preview browser tools (not by asking the user):
- Web loads at `http://localhost:4321` with the neutral theme.
- `POST http://localhost:8787/api/v1/auth/magic-link` with a test email returns 200 and logs a
  link (dev prints it); following it issues a `session` cookie.
- Create an example item → it enqueues a job → the queue consumer advances it through its steps →
  status flips to `done` in D1 (watch `pnpm dev` logs).
- If `billing` kept: `GET /api/v1/checkout?amount=600` 303s to a Polar sandbox URL.

`tsc --noEmit` (via `pnpm typecheck`) and `astro check` must be clean before hand-off.

## Common boot failures
- Jobs stuck at `pending` → API and queue are not sharing one Miniflare; check the `dev` script
  runs `wrangler dev -c api -c queue`.
- `no such column` / empty tables on first query → migrations weren't **applied** to the local D1.
  `pnpm db:generate` only writes them; apply with
  `wrangler d1 migrations apply <slug> --local --persist-to .wrangler/state` from `packages/api`.
- Wrangler hangs with no output → wrong Node; `nvm use 22`.
- **React islands never hydrate; console shows "Failed to fetch dynamically imported module" and
  the network tab shows `504 (Outdated Optimize Dep)`** → Vite's pre-bundled dependency cache went
  stale, which happens when edits introduce a new workspace import mid-session. It is not a code
  bug. Stop the web dev server, `rm -rf packages/web/node_modules/.vite`, restart, and hard-reload.
- Wiping the local D1 while the dev server is running leaves the worker attached to the deleted
  file, so writes vanish silently. Restart the server after any `rm -rf .wrangler/state/v3/d1`.
- The browser console keeps showing errors after a fix → that buffer is historical. Trust a fresh
  network trace and what actually renders, not old console lines.
