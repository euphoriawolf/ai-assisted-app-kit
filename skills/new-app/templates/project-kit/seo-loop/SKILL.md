---
name: seo-loop
description: Run the {{APP_NAME}} SEO/LLM growth loop from SEO-LOOP.md — measure search + AI-referral traffic, pick the highest-leverage improvement, build it, verify, gated-deploy, log. Use for growing organic/chatbot traffic to {{APP_NAME}}.
user-invocable: true
---

# {{APP_NAME}} — seo-loop

Executes the growth playbook in `SEO-LOOP.md` (repo root). The marketing surface is content-as-code
in `packages/web` (Astro content collections + programmatic SEO pages), so improvements are code.

## The loop (see SEO-LOOP.md for the full version)
1. **Measure** — pull current search + AI-referral data (`scripts/seo/`: GSC, analytics). Write a
   dated snapshot + diff.
2. **Analyze / prioritize** — pick the one change with the best effort/leverage (a new head-term
   landing page, better internal linking, JSON-LD, a thin page to fill).
3. **Build** — implement in `packages/web`. Every landing page ships with real examples before the
   closing CTA, HowTo/FAQ/Breadcrumb JSON-LD, and correct canonical/sitemap entries.
4. **Verify** — `astro check` + build clean; preview the page; validate structured data.
5. **Deploy (gated)** — additive marketing scope only; deploy + verify live + be ready to roll back.
6. **Log** — append the iteration to `scripts/seo/log.md`.

## Rules
- Copy goes through `/brand-voice`; visuals through `/design`.
- Additive marketing scope only in the autonomous path — never touch app/api/auth/billing here.
- If a human and this loop can edit the same marketing files, pause one while the other works.
- Credentials live in gitignored `.seo.env` (template: `scripts/seo/.seo.env.example`).

## Optional autonomy
This can run as a weekly scheduled task (the user's `schedule` skill) inside the SEO-LOOP.md §5
guardrails: additive scope, build-gated, deploy+verify+rollback.
