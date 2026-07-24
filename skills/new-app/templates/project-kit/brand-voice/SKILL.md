---
name: brand-voice
description: Write and review customer-facing copy for {{APP_NAME}} so it matches the brand voice in BRAND.md. Use before shipping any marketing page, UI string, email, error message, or docs copy for {{APP_NAME}}.
user-invocable: true
---

# {{APP_NAME}} — brand voice

Enforces `BRAND.md` (repo root), the source of truth for how {{APP_NAME}} sounds. When voice and
layout disagree, voice wins.

## Before writing or editing ANY customer-facing copy
1. Read `BRAND.md` — especially **§0 the two non-negotiable mechanics rules** and §1 the one-line brief.
2. Draft in that voice.
3. Run the §pre-publish checklist at the end of `BRAND.md`.

## The two non-negotiables (restated so they're never missed)
1. **{{NON_NEGOTIABLE_1}}** (default: never use the em dash `—` in any customer-facing copy — it
   reads as an AI-content marker; use a period, comma, colon, or restructure).
2. **{{NON_NEGOTIABLE_2}}** (the one product-specific rule that matters most for {{APP_NAME}}).

## Quick reference
- **CTAs:** start with a verb, name the outcome.
- **Errors:** what happened, why, how to fix.
- **Empty states:** what this is, why it's empty, how to start.
- **Lexicon:** use canonical terms; avoid the banned words. See `BRAND.md` §lexicon.

## Reviewing copy
When asked to review, quote the offending line, name which rule it breaks, and offer a fix. Do not
rewrite silently. Flag any em dash, any banned term, and any copy doing a job a visual/example
should do instead.
