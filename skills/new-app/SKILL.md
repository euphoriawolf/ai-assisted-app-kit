---
name: new-app
description: Bootstrap a brand-new production web app from a proven Cloudflare-native starter. Use when the user wants to start a new app, product, SaaS, MVP, or side project from scratch and wants the same spine as a shipped production SaaS — Cloudflare Workers monorepo, Hono API, Astro SSR + SEO, shadcn design system, Google + magic-link auth, D1/Drizzle, optional queue pipeline, optional/provider-agnostic billing + credits (off by default), email lifecycle, and the living-docs (CLAUDE.md / BRAND.md / TODO.md) methodology. Triggers on "new app", "start a new project", "scaffold an app", "spin up a SaaS", "build me the foundation for X".
user-invocable: true
---

# new-app — the app factory

This skill bootstraps a new app from a battle-tested starter and installs a per-project
skill kit so the app can be built and grown the same way the app this was extracted from was. It runs **once** per
new idea, then gets out of the way — the durable, per-app skills it drops into the repo take
over from there.

**Read `references/architecture.md` first** if you are unsure why this skill is shaped the way
it is (the two-tier model: this global factory + the project-local kit it installs).

## What you produce

A new repo at a path the user chooses, containing:
- The **starter monorepo** (`templates/starter-monorepo/`) — a batteries-included Cloudflare
  stack (see `references/modules.md`), renamed and re-bound for the new app.
- The **living source-of-truth docs** generated for *this* idea: `CLAUDE.md`, `AGENTS.md`
  (byte-identical mirror), `BRAND.md`, `TODO.md`, `SEO-LOOP.md` (see `references/docs-generation.md`).
- The **project-local skill kit** in `.claude/skills/` (`design`, `brand-voice`, `build-phase`,
  `seo-loop`), pre-filled with the app's name, tokens, and phase plan (from `templates/project-kit/`).
- A **neutral design-system theme** ready to reskin (see `references/theme.md`).

## The day-0 flow

Do these in order. Load the referenced file only when you reach that step — keep context lean.

1. **Interview (short).** Get: app name (Prose case + technical slug), one-line description,
   audience, the ONE core object/action (this becomes the `items` example resource), and which
   optional modules the app needs. **Explicitly ask about business model, don't assume one:**
   does it meter usage with **credits** (default off)? does it need **billing** at all, and if so
   in which market / with which provider (default off, `provider: "none"`)? Most apps start with
   neither. Ask brand basics too (personality in 3 words, any color/type leaning). Don't
   over-interview; refine later. If the user gave an idea already, confirm your reading and fill gaps.

2. **Scaffold.** Follow `references/scaffold.md`: choose the target dir, copy
   `templates/starter-monorepo/` there, then do the full rename pass (package scope, worker
   names, D1/R2/KV/queue bindings, domains). Verify no `starterapp`/placeholder strings remain
   except where intended.

3. **Prune modules.** Default is batteries-included. Use `references/modules.md` to remove any
   module the user opted out of — each has tested removal steps that leave the app booting.

4. **Reskin (neutral → brand).** Use `references/theme.md` to set the app's palette/type from
   the interview. Keep it light; the installed `design` skill handles deeper design work later.

5. **Generate the living docs.** Use `references/docs-generation.md` to write `CLAUDE.md`,
   `AGENTS.md`, `BRAND.md`, `TODO.md`, `SEO-LOOP.md` for this idea. Fold in the portable gotchas
   from `references/gotchas.md`. For `BRAND.md`, you may invoke the user's `brand-identity` /
   `copywriting-tone-of-voice-creator` skills for depth; keep the two-non-negotiables structure.

6. **Install the project kit.** Copy `templates/project-kit/*` into `<app>/.claude/skills/` and
   fill placeholders (`{{APP_NAME}}`, `{{APP_SLUG}}`, token values, the generated phase list).

7. **Verify boot.** Follow `references/scaffold.md` §Verify: `nvm use 22 && pnpm install &&
   pnpm dev`; confirm API+queue (:8787) and web (:4321) boot, the example `items` resource
   round-trips the queue, and a magic-link login issues a session. Report what booted.

8. **Hand off.** Tell the user the repo is ready, point them at `TODO.md` Phase 1, and remind
   them the per-app skills (`/design`, `/brand-voice`, `/build-phase`, `/seo-loop`) are now
   installed in the repo.

## Principles baked into every app (state these; they drive the build)

- **Cloudflare-native, edge-first.** Workers + Hono + D1/Drizzle + R2 + KV + Queues.
- **API-first.** A real backend the frontend and any 3rd party consume; split public/internal OpenAPI.
- **SEO-first + mobile-first + show-don't-tell** on the marketing surface.
- **Living docs are law.** `CLAUDE.md` is auto-maintained as the app evolves; `AGENTS.md` mirrors
  it byte-for-byte; `BRAND.md` governs every piece of customer-facing copy.
- **Provider abstraction** for any external AI/3rd-party dependency (documented seam in `api`).
- **Malleable by default — no business model baked in.** The core (auth + resource + queue) works
  with zero credits and zero billing. Both are OPTIONAL layers, off by default, gated by
  `FEATURES` (`packages/shared/src/constants/features.ts`). **Billing is provider-agnostic**: a
  `PaymentProvider` adapter seam (`packages/api/src/billing`) with `polar` as a reference and
  `none` as the default — swap in Stripe/Paddle/a local processor per market. When credits ARE
  used, they derive from amount + metadata (one price lever), never a stored count.

## Reference index (load on demand)

| File | When |
|---|---|
| `references/architecture.md` | Why two tiers; what lives where |
| `references/scaffold.md` | Copy + rename + wire bindings; verify boot |
| `references/modules.md` | Module catalog + per-module prune steps |
| `references/theme.md` | Neutral DS tokens + reskin seam |
| `references/docs-generation.md` | Generate CLAUDE/AGENTS/BRAND/TODO/SEO-LOOP |
| `references/gotchas.md` | Portable infra gotchas to carry into every app |
