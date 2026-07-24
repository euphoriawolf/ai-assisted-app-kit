# Architecture — why this skill is shaped the way it is

## The two-tier model

Building an app has two phases that live on different timescales, so they want different tools.

**Tier 1 — this global `new-app` factory skill.** Invoked *once* per idea. It runs the whole
day-0 bootstrap (interview → scaffold → prune → reskin → generate docs → install kit → verify),
then it is done. It lives in `~/.claude/skills/new-app/` and bundles two big assets:
`templates/starter-monorepo/` (the code skeleton) and `templates/project-kit/` (the per-app
skills, as templates). Everything the factory needs is in its own `references/` — it does not
spawn sibling global skills, because no one ever wants to run "just the rename step" on its own.

**Tier 2 — the project-local skill kit** the factory installs into the new repo's
`.claude/skills/`. These are the *recurring* skills used across the app's whole life:
`design` (the app's own design system), `brand-voice` (enforces its `BRAND.md`), `build-phase`
(works its `TODO.md` ledger), `seo-loop` (growth). They travel with the repo, are version-
controlled with it, and are pre-customized to *that app's* name, tokens, voice, and phases.

## Why not one big orchestrator skill

A single router (à la a "pick a sub-skill" orchestrator) fits neither phase well. Day-0 is a
linear pipeline, not a routing problem — one skill should run it start to finish. The recurring
work is *stateful about a specific app*, so it belongs in that app's repo, not in a global skill
that can't know the app's tokens. Splitting by *time* (bootstrap vs lifetime) instead of by
*topic* is what makes each piece small, and it mirrors what the source app already did: a
project-local design skill plus root playbooks like `SEO-LOOP.md`.

## What this generalizes

This kit was extracted from a real, shipped SaaS, not designed in the abstract. Each row is a
thing that worked there, turned into something reusable.

| In the source app | The generalized form here |
|---|---|
| A project-local design skill | `templates/project-kit/design` installed per app |
| `SEO-LOOP.md` + `scripts/seo/` | `templates/project-kit/seo-loop` + generated `SEO-LOOP.md` |
| `CLAUDE.md` "auto-updated by Claude" | `references/docs-generation.md` emits the same contract |
| `BRAND.md` two-non-negotiables voice doc | generated per app, same structure |
| A long phased `TODO.md` ledger | generated starter phase plan tailored to the idea |
| A domain-specific AI queue pipeline | one generic multi-step `items` example job (the seam) |
| That product's brand tokens | neutral DS-token structure, reskinned per app |

## Maintenance note

The starter template is bundled inside this skill for self-containment. If it grows enough to
deserve its own git repo, promote `templates/starter-monorepo/` to a template repo and have
`scaffold.md` `git clone` it instead of copying — the rest of the flow is unchanged.
