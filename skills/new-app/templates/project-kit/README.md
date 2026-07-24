# Project kit — installed into every new app

`new-app` step 6 copies these skill folders into `<app>/.claude/skills/` and fills the placeholders
below from the day-0 interview + generated docs. After copying, grep the app for `{{` to confirm
none are left unfilled.

| Placeholder | Source |
|---|---|
| `{{APP_NAME}}` | Prose-case app name |
| `{{APP_SLUG}}` | technical slug |
| `{{BRAND_LOOK}}` | one-line look (from theme/brand interview) |
| `{{PRIMARY_TOKEN}}` | `--primary` value set in `ds/colors.css` |
| `{{FONT_SANS}}` / `{{FONT_MONO}}` | fonts set in `ds/typography.css` |
| `{{BRAND_PERSONALITY}}` | 3 personality words |
| `{{NON_NEGOTIABLE_1}}` / `{{NON_NEGOTIABLE_2}}` | BRAND.md §0 rules |

These skills are project-local: they live with the repo, are committed with it, and stay pinned to
this app's tokens/voice/phases. They are the Tier-2 half of the two-tier model (see the skill's
`references/architecture.md`).
