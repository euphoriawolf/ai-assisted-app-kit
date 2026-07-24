---
name: build-phase
description: Work the {{APP_NAME}} build ledger in TODO.md — pick the next phase/task, implement it end-to-end, keep CLAUDE.md + AGENTS.md current, and check items off. Use when building the next piece of {{APP_NAME}} or asking "what's next".
user-invocable: true
---

# {{APP_NAME}} — build-phase

Drives the phased build of {{APP_NAME}} against `TODO.md` (the ledger) and `CLAUDE.md` (the brain).

## Loop
1. **Read `TODO.md`.** Find the first unchecked item in the earliest incomplete phase (or the phase
   the user names). Read `CLAUDE.md` for current architecture + conventions.
2. **Implement it end-to-end** in the relevant package(s). Follow the stack conventions in
   `CLAUDE.md`: Cloudflare-native, API-first, provider abstraction for external deps, the one-price
   credit lever, the gotchas (timestamps as ISO `Z`, `API_BASE` for browser-navigated URLs, single
   Miniflare for local queue, `@layer base`, migration sync).
3. **Verify.** `pnpm typecheck`; boot `pnpm dev` and exercise the change in the browser preview; for
   queue work, confirm a job round-trips. Never mark done on failing checks.
4. **Update the living docs.** Check the item off in `TODO.md`. If the change was substantive, update
   `CLAUDE.md`, then re-mirror: `cp CLAUDE.md AGENTS.md`. Add any new gotcha to `CLAUDE.md`.
5. **Report** what shipped and what's next.

## Rules
- One coherent task per pass; don't sprawl. Prefer finishing a phase before starting the next.
- Reuse existing utilities/components before writing new ones (grep first).
- Customer-facing copy goes through `/brand-voice`; UI through `/design`.
- Keep `CLAUDE.md` and `AGENTS.md` byte-identical — they are the memory that survives context resets.
