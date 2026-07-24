# AI-Assisted App Kit

A kit for building real web apps **with an AI coding agent**, not just a template you copy.

It has two halves that work together:

1. **Skills** — instructions that teach [Claude Code](https://claude.com/claude-code) how to
   bootstrap and grow an app: interview you about the idea, scaffold it, write its documentation,
   and install a set of per-project skills that keep working for the life of the app.
2. **A starter** — a production Cloudflare stack (auth, database, background jobs, design system)
   that the skills build from, so the agent starts from working code instead of a blank page.

The result: you describe an app, and you get a running one, with the conventions and the hard-won
gotchas already baked in.

---

## Why this exists

Most "AI builds your app" attempts fail the same way. The agent starts from nothing, invents a
different architecture every time, forgets the decisions you made two hours ago, and produces
something that demos well and can't be maintained.

This kit fixes those three problems directly:

- **It starts from working code.** The agent customizes a stack that already boots, so it spends
  its effort on your idea instead of re-deriving auth and queues.
- **It writes down decisions.** Every generated app keeps living docs (`CLAUDE.md`, `BRAND.md`,
  `TODO.md`) that the agent maintains as the app changes. These survive context resets — the next
  session picks up knowing the architecture, the voice, and what's left to build.
- **It ships the lessons.** The starter encodes gotchas that cost real debugging time: timezone-safe
  timestamps, cross-origin cookie rules, queue retry and dead-letter handling, a Tailwind cascade
  trap. You inherit the fixes instead of rediscovering the bugs.

It was extracted from a real, shipped SaaS. Everything here earned its place in production.

---

## Install

Requires [Claude Code](https://claude.com/claude-code).

```bash
git clone https://github.com/euphoriawolf/ai-assisted-app-kit.git
ln -s "$(pwd)/ai-assisted-app-kit/skills/new-app" ~/.claude/skills/new-app
```

That's it. The symlink means editing the repo updates the skill you use — one source of truth.

---

## Use it

In Claude Code, run:

```
/new-app
```

The agent will:

1. **Interview you** briefly — what the app is, who it's for, the one core thing users create, and
   whether you need optional pieces like usage metering or payments. It asks rather than assuming.
2. **Scaffold** the monorepo, renamed and rewired for your app.
3. **Prune** whatever you said you don't need.
4. **Apply your brand** — colors and fonts into the design tokens.
5. **Write the living docs** — `CLAUDE.md` (architecture + conventions), `BRAND.md` (voice),
   `TODO.md` (a phased build plan for your idea).
6. **Install per-project skills** into your new repo (below).
7. **Boot it** and confirm sign-in and the background job actually work before handing over.

You end up with a running app and a plan for finishing it.

---

## What your generated app gets

Four skills are installed into your new repo at `.claude/skills/`, pre-filled with *your* app's
name, design tokens, and phase plan. They're committed with the code, so they travel with the
project and work for anyone who clones it.

| Skill | What it does |
|---|---|
| `/design` | Builds UI using your app's design tokens, so everything stays visually consistent |
| `/brand-voice` | Writes and reviews customer-facing copy against your `BRAND.md` |
| `/build-phase` | Picks the next task from `TODO.md`, implements it, verifies it, checks it off |
| `/seo-loop` | Runs a measure → improve → deploy loop for organic traffic |

Plus the living docs the agent maintains as you go:

- **`CLAUDE.md`** — the project brain: architecture, conventions, and gotchas. Kept current as the
  app evolves. (`AGENTS.md` is a byte-identical mirror for other agent tools.)
- **`BRAND.md`** — how the product sounds, everywhere.
- **`TODO.md`** — the phased build ledger, checked off as work lands.

---

## What's in the starter

The stack the agent builds from. It boots with **no API keys and no accounts**.

| | |
|---|---|
| **Sign-in that works** | Google sign-in and passwordless magic links. Sessions in a cookie, cached at the edge. |
| **A database** | Cloudflare D1 (SQLite) with [Drizzle ORM](https://orm.drizzle.team). 14 tables covering users, teams, files, and billing. Migrations included. |
| **Background jobs** | A Cloudflare Queue that runs multi-step work reliably, with retries, backoff, and a dead-letter queue that's actually monitored. |
| **A frontend** | [Astro](https://astro.build) SSR with React islands and [shadcn/ui](https://ui.shadcn.com). |
| **A design system** | Design tokens every component reads from. Rebrand the whole app by editing three files. |
| **File storage** | Cloudflare R2, with upload and download paths wired up. |
| **Payments** | Off by default. Provider-agnostic — bring Stripe, Polar, Paddle, or a local processor. |
| **Usage metering** | Off by default. A credits layer if your app needs one. |

It runs on Cloudflare Workers, so it's fast everywhere and cheap to host.

**Nothing about a business model is assumed.** Credits and payments are opt-in flags. The base app
works with neither, because most apps start that way, and because payment providers differ by
country — so billing sits behind an adapter you can swap.

---

## Using the starter without Claude Code

The stack is just code. Copy it and run it:

```bash
git clone https://github.com/euphoriawolf/ai-assisted-app-kit.git
cp -R ai-assisted-app-kit/skills/new-app/templates/starter-monorepo myapp && cd myapp

nvm use 22          # Node 22 required
pnpm install
pnpm db:generate
pnpm dev            # API + jobs on :8787, web on :4321
```

Open **http://localhost:4321**, sign in with any email — **the sign-in link is printed in your
terminal**, no mailbox needed. Create an item and watch it move `pending → processing → done`.
That's the background job pipeline running end to end.

Its own [README](skills/new-app/templates/starter-monorepo/README.md) covers renaming, rebranding,
turning on payments, and deploying.

---

## What's in this repo

```
skills/new-app/
├── SKILL.md              the /new-app flow the agent follows
├── ROADMAP.md            what ships today, what's optional and not yet built
├── references/           the methodology, loaded by the agent as needed
│   ├── architecture.md     why the kit is shaped this way
│   ├── scaffold.md         copy, rename, wire, verify
│   ├── modules.md          optional modules and how to add or remove them
│   ├── theme.md            design tokens and how to rebrand
│   ├── docs-generation.md  how CLAUDE.md / BRAND.md / TODO.md get written
│   └── gotchas.md          bugs that cost real time, and their fixes
└── templates/
    ├── project-kit/      the four skills installed into each new app
    └── starter-monorepo/ the Cloudflare stack
```

---

## Requirements

- [Claude Code](https://claude.com/claude-code) (to use the skills; the starter works without it)
- Node 22 and pnpm 9
- A Cloudflare account — only when you deploy. Local development needs nothing.

## Status

The starter is complete and verified: it typechecks, both Workers bundle, and the full flow
(sign-in → create → background job → download) has been run end to end. Optional modules that
aren't built yet — extra API routes, OpenAPI docs, the marketing site — are listed in
[ROADMAP.md](skills/new-app/ROADMAP.md), and the agent can build them on request.

## License

MIT
