# Docs generation — the living source-of-truth files

Every app gets five root docs. They are the *contract* the rest of the build runs against.
Generate them from the day-0 interview, then keep them alive (see the maintenance rule below).

Files: `CLAUDE.md`, `AGENTS.md` (byte-identical mirror of CLAUDE.md), `BRAND.md`, `TODO.md`,
`SEO-LOOP.md` (only if `marketing` module kept).

## CLAUDE.md — the project brain

The most important file. It is **auto-maintained by Claude as the project evolves** — every
substantive change updates it. Header must say so. Sections to generate (adapt to your app):

```
# {{APP_NAME}} — Project Context
> Auto-updated by Claude as the project evolves. Keep AGENTS.md byte-identical.

## Brand Name            # exact casing rules for the name
## What This Is          # one paragraph: what it does, for whom, the core loop
## Product & Brand Principles  # the load-bearing positioning rules (read before copy/UI)
## Monorepo Structure    # the packages tree
## Tech Stack            # the table (Workers/Hono/D1/Drizzle/R2/KV/Queues/Astro/Polar/...)
## Database              # tables, JSON columns, ID + timestamp rules (from gotchas.md)
## Example Job / Pipeline # how the queue job flows (or "no queue" if pruned)
## Provider Abstraction  # the seam for external AI/3rd-party deps
## Feature Flags         # FEATURES: credits + billing, OFF by default; what's on for THIS app
## Credit System         # only if credits enabled — the one-price-lever rule
## Billing               # only if billing enabled — which provider adapter, webhook at /webhooks/billing
## API Routes            # /api/v1 map + auth model + the cross-origin API_BASE rule
## R2 Storage            # key conventions, "store keys not URLs"
## Environment Variables # pointer to .dev.vars.example
## Development           # pnpm scripts, Node 22, the single-Miniflare local-queue rule
## Frontend Architecture # marketing vs app split
## Build Phases          # the checklist mirroring TODO.md
```

Fill it with THIS app's specifics, and fold in the relevant items from `references/gotchas.md`
(timestamps, cross-origin, local queue, migration sync, Polar, Tailwind layer). Keep the
"gotcha earned in blood" tone — these are the lines that save the next session hours.

**AGENTS.md rule:** it is a byte-for-byte copy of CLAUDE.md. After any CLAUDE.md edit, re-copy.
`cp CLAUDE.md AGENTS.md`.

## BRAND.md — voice, generated per app

Governs every customer-facing surface (marketing, UI, docs, emails, errors). Generate from the
brand interview; you may go deeper with the `brand-identity` / `copywriting-tone-of-voice-creator`
skills. Keep this skeleton, which opens with **two non-negotiable mechanics rules**:

```
# {{APP_NAME}}: Brand & Voice Guidelines
> The standard for how {{APP_NAME}} sounds in every surface. When voice and layout disagree,
> voice wins.

## 0. Two non-negotiable mechanics rules   # e.g. "never use the em dash"; one product-specific rule
## 1. The one-line brief                    # the single sentence that defines the promise
## 2. Who we're writing for                 # audience(s), primary GTM vs first-class others
## 3. Positioning & personality             # 3 adjectives from the interview, made concrete
## 4. Voice vs. tone                         # voice always-on; tone flexes by moment
## 5. Writing principles
## 6. Lexicon (canonical terms / words we avoid / capitalization)
## 7. Microcopy patterns (CTAs, errors, empty states, loading, success, confirmations)
## 8. Surface-by-surface cheatsheet
## 9. Before / after
## 10. Pre-publish checklist
```

Rule #1 (em dash ban) is a strong default — carry it unless the user opts out. Rule #2 should be
the ONE thing most load-bearing for this specific product (a visual product's might be "show, don't
tell"). Pick the app's equivalent.

## TODO.md — the phased build ledger

A living checklist, one section per phase, `[x]`/`[~]`/`[ ]`. Generate a starting plan tailored to
the idea. The default phase spine (prune/reorder to the modules kept):

```
Phase 1: Scaffolding + DB schema
Phase 2: Auth (Google OAuth + Magic Link)
Phase 3: Core loop — the {{CORE_OBJECT}} resource + queue job (if any)
Phase 4: Credits + Billing                  # ONLY if the app meters/charges — off by default,
                                            # provider-agnostic (pick an adapter); skip otherwise
Phase 5: Admin + Analytics
Phase 6: Public API + API keys + embed        # if public-api kept
Phase 7: Design System (shadcn + DS tokens, AppShell)
Phase 8: Frontend — core loop (Astro app screens)
Phase 9: Frontend — secondary screens (billing, settings, admin, share)
Phase 10: Marketing site + SEO (content-as-code, JSON-LD, sitemap)   # if marketing kept
Phase 11: Email system (senders + lifecycle cron)                     # if email kept
Phase 12: Polish + Deployment
```

Mark Phase 1 done (the scaffold just did it). Each item is a concrete, checkable task, not a vague
goal. This is what the `/build-phase` project skill works through.

## SEO-LOOP.md — the growth playbook (marketing only)

Use this shape: a `/loop` playbook with Measure → Analyze → Build → Verify → gated Deploy →
Log, backed by `scripts/seo/`. Generalize the head-term targeting to the app's category. Ship the
`.seo.env.example` template. This drives the `/seo-loop` project skill and, optionally, an
autonomous weekly scheduled task.

## Maintenance rule (put this in CLAUDE.md itself)

> When you make a substantive change, update CLAUDE.md and re-mirror AGENTS.md. When you finish a
> TODO item, check it off. When you learn a gotcha, add it to CLAUDE.md. These files are the
> memory that survives context resets.
