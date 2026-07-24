# Theme — neutral baseline + the reskin seam

The starter ships the **structure** of a production design system with a **neutral** skin: the same
token files, the same shadcn bridge, none of the ink/blueprint identity. Reskinning an app means
editing a small, well-marked seam — not touching components.

## The token architecture (unchanged per app)

```
packages/web/src/styles/
  ds/colors.css       # the ink ramp + signal + surface/text/border semantic tokens
  ds/typography.css   # font families + type scale + line heights + weights
  ds/spacing.css      # 4px grid, layout primitives (sidebar/topbar/container widths)
  ds/elevation.css    # radius, shadows, motion durations/easing
  ds/base.css         # element resets (ALL in @layer base) + focus ring
  globals.css         # load order + @theme mapping DS tokens → Tailwind utils + shadcn vars
```

Load order in `globals.css` is load-bearing: fonts → `@import "tailwindcss"` → DS tokens → base
reset → `@theme` mapping. Do not reorder.

**Gotcha (kept fixed in the starter):** every reset in `base.css` is wrapped in `@layer base` so
Tailwind utilities (in `@layer utilities`) win the cascade. An unlayered `a { color: inherit }`
silently overrides every text-color utility. See `references/gotchas.md`.

## What "neutral" means in the starter

- **Ink ramp:** a pure neutral grey `--ink-0` (#FFFFFF) → `--ink-950` (near-black). No hue.
- **Accent/primary:** `--primary` maps to `--ink-950` (near-black fill) — brand-agnostic. This is
  the single knob most apps change first.
- **Fonts:** system stack (`system-ui, -apple-system, "Segoe UI", sans-serif` + `ui-monospace,
  SF Mono, Menlo, monospace`). **No Google Fonts import** — the starter loads zero external fonts
  so it boots fast and looks intentional before branding. `fonts.css` is empty scaffolding.
- **Signal colors:** generic desaturated positive/critical/caution/active — keep as-is.
- **No blueprint grid / motifs** — the starter's `base.css` has resets only.

## The reskin seam (what the day-0 flow and the `design` skill edit)

To brand an app you touch **three files**, nothing else:

1. `ds/colors.css` — swap the `--ink-*` ramp for the brand's neutral/near-neutral ramp, and set
   `--primary`/`--accent` to the brand color. Use the user's `color-system` / `color-expert`
   skills to generate an accessible ramp. Keep the token *names*; components read names, not hexes.
2. `ds/typography.css` + `ds/fonts.css` — set `--font-sans` / `--font-mono` to the brand fonts and
   add the font `@import`/`@font-face` in `fonts.css` (and the matching link in `globals.css`).
3. `ds/elevation.css` — optionally dial radius (sharp vs round) and shadow depth to match the brand
   personality. This alone shifts the whole feel.

Everything downstream (shadcn `Button`, `Card`, `AppShell`, marketing components) recolors and
re-types automatically because it consumes the semantic tokens.

## Day-0 reskin (light touch)

From the brand interview (3 personality words + any color/type leaning), set:
- the primary/accent color in `ds/colors.css`,
- the two font families in `ds/typography.css` (+ import),
- radius/shadow character in `ds/elevation.css`.

Then stop. Deeper design work (component variants, marketing hero, bespoke product components) is
the job of the installed `/design` project skill, which is pre-filled with these token values so
it stays consistent with whatever you set here. Do **not** try to fully art-direct the app during
bootstrap — get a coherent neutral-plus-brand-color baseline and move on.

## Dark mode
The shadcn bridge already supports it via `:root[data-theme="dark"]` overrides in `colors.css`.
Keep both light and dark token sets in sync when reskinning.
