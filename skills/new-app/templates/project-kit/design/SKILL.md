---
name: design
description: Design on-brand interfaces and assets for {{APP_NAME}} — production UI or throwaway mocks/prototypes. Holds this app's design tokens, component conventions, and brand look. Use for any visual or UI work on {{APP_NAME}}.
user-invocable: true
---

# {{APP_NAME}} — design

The design system for {{APP_NAME}}. This is the project-local design skill (installed by `new-app`).
It knows THIS app's tokens, so everything it produces stays consistent.

## The stack

Hybrid **shadcn/ui themed by DS tokens**:
- **Token source:** `packages/web/src/styles/ds/*.css` — the single source of truth (`--ink-*`
  ramp, `--signal-*`, surfaces, text, borders, radius, shadows, type scale).
- **Bridge:** `packages/web/src/styles/globals.css` maps DS tokens onto shadcn theme vars
  (`--primary`, `--muted`, `--ring`, ...) and exposes them as Tailwind utilities via `@theme`.
- **Generic primitives:** `packages/web/src/components/ui/*` (shadcn + Radix) — auto-themed.
  Add more with `npx shadcn@latest add <component>`.
- **Bespoke product components:** `packages/web/src/components/ds/*` — hand-built, token-driven.
- **App shell:** `packages/web/src/layouts/AppShell.astro`.

## This app's brand (fill during bootstrap)

- **One-line look:** {{BRAND_LOOK}}
- **Primary/accent:** `--primary` = {{PRIMARY_TOKEN}}
- **Fonts:** sans = {{FONT_SANS}}, mono = {{FONT_MONO}}
- **Personality:** {{BRAND_PERSONALITY}}
- **Voice:** see `BRAND.md` (voice wins when it disagrees with layout).

## Rules
- Reskinning happens at the token seam only (`ds/colors.css`, `ds/typography.css`,
  `ds/elevation.css`). Never hardcode hexes in components — read token names.
- Every reset stays in `@layer base` (Tailwind v4 gotcha: unlayered resets beat utilities).
- shadcn components using state/hooks need `client:load`/`client:visible` in `.astro` files.
- Mobile-first. Style light AND dark (the shadcn bridge supports `data-theme="dark"`).
- For throwaway mocks: copy assets out and build static HTML. For production: edit `packages/web`.

Deepen the brand with the user's `color-system` / `brand-identity` / `web-typography` skills when
generating a fuller identity; keep the token names stable so the app stays consistent.
