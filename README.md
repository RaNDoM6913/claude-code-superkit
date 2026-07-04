# ⚡ claude-code-superkit

> **The quality-first kit for Claude Code & Codex** — every one of 56 agents runs on Opus (now 4.8, 1M context). No Sonnet, no Haiku, no token-cost compromises on the work that ships your code. Every prompt hardened for the Opus executor by **Claude Fable 5**, a tier above Opus.

<div align="center">

[![Stars](https://img.shields.io/github/stars/RaNDoM6913/claude-code-superkit?style=for-the-badge&logo=github)](https://github.com/RaNDoM6913/claude-code-superkit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
![Agents](https://img.shields.io/badge/56_agents-Opus_4.8-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)
![Hardened by](https://img.shields.io/badge/prompts_hardened_by-Claude_Fable_5-FF6B35?style=for-the-badge&logo=anthropic&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-gpt--5.5-00A67E?style=for-the-badge&logo=openai&logoColor=white)

**Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI.**
**All agents on Opus. Maximum accuracy. Zero compromises.**

[🚀 Quick Start](#-installation) · [⌨️ Commands](#%EF%B8%8F-key-commands) · [📖 Guide](docs/guide/) · [❓ Troubleshooting](TROUBLESHOOTING.md) · [📋 Changelog](CHANGELOG.md)

</div>

---

Battle-tested in a production app with 68+ endpoints and 50 database migrations. Features double-verification code review, 4-layer documentation enforcement, AgentShield security scanning, and [SkillsMP](https://skillsmp.com) marketplace integration.

**Why all-Opus?** On a flat-rate Claude Code subscription, downgrading agents to Sonnet/Haiku only degrades quality without saving money — even cost-optimizing kits disable model downgrade on flat-rate plans. Superkit pins every agent to the `opus` alias, so it rode straight to Opus 4.8 with zero config churn.

<table>
<tr>
<td width="50%">

### 🔍 Double-Verification Review
Independent second agent re-checks every finding before it reaches you.
`/review --comment` posts inline on GitHub PRs.

</td>
<td width="50%">

### 📄 4-Layer Doc Enforcement
Rule + auto-commands + BLOCKING hook + Stop hook.
Maps every changed file to its required arch doc — commit blocked if missing.
*Example: edit `app/api/users.go` → commit blocked until `docs/architecture/api-reference.md` is staged.*

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Security Scanning
AgentShield (102 rules) + Red/Blue adversarial audit.
`.claude/settings.json` guarded against CVE-2025-59536 hijacks. CI-ready via `/security-scan`.

</td>
<td width="50%">

### 🔎 SkillsMP Integration
Search 500K+ community skills before building.
Keyword or AI semantic search via API.

</td>
</tr>
</table>

---

## 🧬 Hardened by a Stronger Model

Every prompt in the kit was engineered by **Claude Fable 5** — Anthropic's Mythos-class model, a tier above Opus — for a weaker model to execute reliably: Fable writes the instructions, Opus 4.8 runs them. In v1.5.0 all 117 prompt surfaces (56 agents, 16 commands, 22 skills, 20 rules) went through a four-step pipeline — a 16-agent audit of every file, a written failure-mode playbook, a full rewrite, then independent adversarial verification where one model instance writes and a separate one attacks. That was ~200 subagents with 0 unresolved escalations, closed by a kit-wide consistency sweep that came back clean. The result is a fixed countermeasure for each way a weaker executor tends to drift:

| Opus failure mode | Countermeasure baked into every file |
|-------------------|--------------------------------------|
| Lost-in-the-middle | Hard Rules at the top + Recap at the bottom |
| Premature "done" | Done-gates — generators verify artifacts on disk and run what they generate |
| Invented APIs / files | Evidence Gates (findings only with `file:line` actually read; `NOT FOUND` over invention) + a real-API honesty pass |
| Vague judgment calls | Decision tables with explicit defaults |
| Vocabulary drift | One canonical severity / confidence / verdict enum set |
| Fractional numbering | Linear phases / steps everywhere |

Contracts instead of vibes — Opus executes best when every judgment call is a decision table and every output has an exact contract.

## 📦 What's Inside

**One kit, two harnesses** — full parity for Claude Code (Opus 4.8) and Codex CLI (gpt-5.5, xhigh).

| Component | Count | Description |
|-----------|-------|-------------|
| **Core Agents** | 31 | Code review, security, testing, audit, debugging, health, tree gen, DB review, architecture, docs review, plan validation, goal verification, evaluation, AI slop cleanup, critic, visual review, comment-rot analyzer, silent-failure-hunter, **minimal-change-engineer**, **reality-checker**, **codebase-onboarding-engineer**, **behavioral-nudge-engine** — all on **Opus** |
| **Stack Agents** | 19 | Go (6: reviewer, error, concurrency, performance, modernizer, observability), TypeScript, Python, Rust, Frontend-3D (4: presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer), **Frontend-UI (6: ui-reviewer umbrella + typography / color / motion / interaction / design-critic)** |
| **GAN Agents** | 3 | **gan-planner**, **gan-generator**, **gan-evaluator** — adversarial verification loop (optional package, requires Playwright) |
| **Extra Agents** | 3 | Bot reviewer (Telegram/Discord/Slack), design system reviewer, red-blue auditor |
| **Extra Skills** | 1 | [SkillsMP](https://skillsmp.com) search — 500K+ community skills marketplace |
| **Commands** | 16 | `/dev`, `/review`, `/audit`, `/workflow`, `/superkit-init`, `/superkit-evolve`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit`, `/docs-init`, `/security-scan`, `/benchmark`, `/pair`, `/capture-screen` |
| **Hooks** | 42 shipped + 2 internal + Stop | 26 shipped core (incl. intake-classifier.py, gateguard pair, edit-streak, audit-trail, audit-settings CVE-2025-59536, plan-completion-gate, user-intent-detect, subagent-stop-validate, compact-state-inject, /dev hard-enforce trio) + 9 stack (Go error/context/safety/golangci-lint + format-on-edit per language) + 4 frontend-3d (gsap/r3f/tailwind/bundle-size) + 3 frontend-ui (banned-fonts/color/animation-easing) |
| **Rules** | 19 shipped + 1 internal | 7 core (coding style, security path-scoped, git workflow, documentation, auto dev workflow, auto command triggers, frontend-aesthetics path-scoped) + superkit-integrity (internal) + 2 stack (go-conventions, go-safety) + 3 frontend-3d (gsap-conventions, threejs-conventions, frontend-aesthetics-3d) + 7 frontend-ui (frontend-design-aesthetics, typography-guidelines, color-and-contrast, spatial-and-layout, motion-and-animation, interaction-polish, ui-anti-patterns) + 1 Codex `default.rules` (approval policy DSL) |
| **Skills** | 11 core + 6 frontend-3d + 1 frontend-ui + 3 GAN + 1 extra | project-architecture, project-scanner, writing-agents/commands/hooks/skills, **telegram-bot-builder**, **nextjs-supabase-auth**, **drizzle-orm-expert**, **ru-text** (Russian typography), **postgresql-optimization**, **redis-patterns** + threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement + impeccable-craft + gan-planner/generator/evaluator + SkillsMP search |
| **Plugins** | 4 base + 3 optional | superpowers, github, context7, code-review + code-simplifier, playwright, frontend-design |

## 🆕 What's New

**v1.5.0 — the Opus 4.8 reliability rework, authored & adversarially verified by Claude Fable 5** (see [CHANGELOG](CHANGELOG.md)):

- 🏗️ **The whole prompt surface, rebuilt** — all 117 files (56 agents, 16 commands, 22 skills, 20 rules) reworked against a single failure-mode playbook for the weaker executor: **Hard Rules** up top + a **Recap** at the bottom (lost-in-the-middle guard), an **exact fenced Output Contract** with a filled example, **Evidence Gates** (reviewers) / **Done-gates** (generators), canonical severity + confidence enums with LOW routed to Open Questions (never dropped), and ripgrep-safe two-pass greps.
- 🔄 **`/dev` linearized 0–15** — phase numbering now matches the dev-flow SVGs exactly (fractional 1.5/2.1/… retired), with a single Skip Matrix, a per-phase Done-when, and gate verdicts consumed verbatim. `/review` reworked too — goal-verifier moved to its own verdict track and Step 2/3 dispatch resynced (silent-failure-hunter, comment-rot-analyzer, api-contract-sync, database-reviewer now actually fire).
- 🐛 **frontend-ui dispatch restored** — a prior `inject-tokens` bug had injected `tokens:` mid-`description` in all 6 agents, making every Dispatch/Do-NOT-dispatch condition invisible to Claude Code's dispatcher. Fixed in the tool and all 6 agents, so routing works again.
- 🔧 **Real-API honesty pass** — nonexistent `maps.NewWithSize()` and Playwright `--device-scale-factor` removed, `prisma migrate reset` demoted from "rollback" to a guarded last resort, `drizzle-kit push` → `migrate`, and dead Go `references/` paths fixed for the installed layout.
- 🤖 **GAN contract redesigned end-to-end** — the plan now carries a mandatory `## Rubric` handoff, the evaluator scores `X/N` against the named rubrics, `BLOCKED` is reserved for un-runnable evaluations only, and the generator fix-loop is capped at 3 attempts.
- 📚 **Meta-skills teach the new conventions** — `writing-agents` and `writing-commands` now encode the full playbook (skeleton, canonical enums, Evidence/Done-gate blocks, the command contract), so every future component inherits it; authoring guides (ch.3–5) + examples synced.
- 📐 **Rules layer consolidated** — `documentation.md` collapsed into ONE canonical table verified against the enforcement hook (the old "15-Point" list had 19 rows and disagreed with it), TGApp specifics moved to marked "ADAPT" example blocks, and the 10 frontend rules unified under binding cross-file decisions (reflex at 3+, a single canonical font-reject list, explicit gsap↔motion scoping, typography pinned at 1.25×).
- 🔬 **Adversarially verified, file by file** — every rewrite done by one model instance and verified by another (~200 subagents, 0 unresolved escalations), catching copy-paste-breaking code bugs and dropped checks before they shipped. Plus hook-coherence fixes: subagent-stop-validate no longer guards ghost agents, `/security-scan` triggers realigned to what the command actually audits, and the ui-reviewer name collision documented as intended precedence.
- 🔜 **Codex mirrors next** — beyond the already-synced `/dev` trio + GAN, the remaining Codex skill mirrors are scheduled for the next release.

Previous releases: [CHANGELOG](CHANGELOG.md) · [v1.4.2](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.2) · [v1.4.1](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.1) · [v1.4.0](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.0)

## 🔄 How `/dev` Works

<p align="center">
  <img src="docs/dev-flow.svg" alt="/dev — 16-phase development orchestrator: Planning (7 steps) → Execution (5 steps) → Quality (4 steps)" width="960">
</p>

**Example:** `/dev add rate limiting to login`
1. Loads CLAUDE.md + architecture docs (Phase 0)
2. Plans + validates the plan (plan-checker gate)
3. Implements behind a sprint contract
4. Reviewers fan out (security-scanner, ts-reviewer) in parallel
5. goal-verifier checks the change against the original goal
6. Commits only when verification passes with fresh evidence

## 🚀 Installation

### Claude Code (recommended)

**1. Clone + install** (works on macOS, Linux, Windows with Node.js 18+):

```bash
git clone https://github.com/RaNDoM6913/claude-code-superkit
cd claude-code-superkit
bash setup.sh

# With explicit options:
bash setup.sh --stacks=go,typescript --profile=strict --codex

# Non-interactive (CI/CD):
bash setup.sh --defaults
```

`bash setup.sh` is an interactive Node.js installer that selects your stack, hook profile, and plugins. Zero dependencies beyond Node.js. See [detailed guide](docs/INSTALL-CLAUDE-CODE.md).

**2. Open Claude Code, 3. install plugins, 4. run setup, 5. verify:**

```bash
# 2. Open Claude Code
claude

# 3. Install plugins
/plugins
# → install: superpowers, github, context7, code-review

# 4. Run intelligent setup (auto-fills docs from your code!)
/superkit-init

# 5. Verify
/review --full
```

> **npm note:** registry publish is deferred — install via `git clone` for now. When `claude-code-superkit` is published, `npx claude-code-superkit` will become the one-liner alternative.

**`/superkit-init`** scans your codebase and generates **filled** documentation — no more manual TODO filling:
- `CLAUDE.md` — populated with your tech stack, commands, conventions
- `docs/architecture/*.md` — generated from actual code analysis
- `docs/trees/*.md` — project structure trees
- `.claude/rules/` — configured with your real file paths

Use `--non-interactive` for quick setup without checkpoints.

> **Already set up?** Run `/superkit-evolve` anytime to detect and fix documentation drift (stale migration counters, missing docs for new components, outdated trees).

### Codex CLI

Tell Codex:
```
Fetch and follow instructions from https://raw.githubusercontent.com/RaNDoM6913/claude-code-superkit/main/packages/codex/INSTALL.md
```

Or run `bash setup.sh --codex` from a cloned superkit repo to install both Claude Code and Codex CLI support in one go. Model: **gpt-5.5** + **xhigh** reasoning.

### Which command do I use?

| I want to… | Use |
|------------|-----|
| Ship a feature end-to-end | `/dev <task>` |
| Review a PR / branch | `/review --comment` |
| Fix a bug | `/workflow bugfix` |
| Set up a new repo | `/superkit-init` |
| Understand an unfamiliar codebase | dispatch `codebase-onboarding-engineer` |
| Refresh docs after drift | `/superkit-evolve` |

## ⌨️ Key Commands

| Command | What it does |
|---------|-------------|
| `/dev <task>` | 16-phase orchestrator: read-docs → understand → architect → pseudocode → plan → contract → validate → implement → evaluate → verify → test → goals → review → critic → docs → report |
| `/workflow <template>` | Predefined workflows: `bugfix`, `hotfix`, `spike`, `refactor`, `dep-upgrade`, `security-audit` |
| `/review [--comment]` | Detect changes → dispatch reviewers → **double-verify** findings → unified report (optionally post GitHub PR comments) |
| `/audit` | Parallel audit: up to 4 agents (frontend, backend, infra, security) |
| `/audit --health` | Quick health dashboard — dispatches only health-checker (~30s vs ~5min) |
| `/test` | Auto-detect stack and run tests |
| `/lint` | Auto-detect stack and run linters |
| `/commit` | Conventional commit with secret scanning |
| `/new-migration` | Create migration file pair (up + down) |
| `/migrate` | Apply or rollback database migrations |
| `/superkit-init` | Intelligent project setup: scan codebase → generate filled docs → configure rules with real paths |
| `/superkit-evolve` | Incremental doc update: detect drift (migrations, trees, missing docs) → fix |
| `/docs-init` | Scaffold architecture documentation (redirects to `/superkit-init`) |
| `/security-scan` | Run security scan on .claude/ configs |
| `/benchmark` | Run Go benchmarks with benchstat comparison |
| `/pair` | AI pair programming — Driver, Navigator, TDD, Review, Debug modes |
| `/capture-screen` | Capture React components as PNG textures for 3D model screens |

## 🔧 Hook Profiles

> ⚠️ **Critical:** Hook scripts MUST be tracked in git. If your `.gitignore` contains `.claude/scripts/`, remove that line immediately. Without tracked hooks, other developers get zero enforcement. Run `bash .claude/scripts/hooks/verify-hooks.sh` to check.

Set `CLAUDE_HOOK_PROFILE` environment variable:

| Profile | Behavior |
|---------|----------|
| `fast` | Only git safety + console.log warning |
| `standard` (default) | All core hooks + stack formatters |
| `strict` | Everything + go vet on every edit + stop verification |

Disable specific hooks without editing `settings.json`: `CLAUDE_DISABLED_HOOKS=hook1,hook2`. Full env-var reference: **[Chapter 15](docs/guide/15-env-vars-and-hook-profiles.md)**.

## ❓ Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues, platform-specific guidance, and FAQ.

## 🛡️ Security

### Untrusted `.claude/settings.json` (CVE-2025-59536)

`.claude/settings.json` tells Claude Code which hooks to run on every tool call. A malicious `settings.json` committed to an untrusted repo can register a PreToolUse hook that executes arbitrary code the moment you open the project — this is a real **RCE + API token exfiltration** vector, documented by [Check Point Research](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/).

Superkit mitigates this with the `audit-settings-source.sh` hook wired to `SessionStart`. On every session it inspects `.claude/settings.json`'s git history:

- If the file was modified in the last 7 days by an author whose email doesn't match your `git config user.email` → the hook prints a loud warning with the offending commit hashes and authors, and drops a marker `${TMPDIR:-/tmp}/claude-untrusted-settings-<session>` so downstream hooks can downgrade decisions.
- Fails open (`exit 0`) everywhere — this is an alert, not a block.

**Opt-out for known-good repos:** `export CLAUDE_DISABLE_SETTINGS_AUDIT=1`.

**Before opening any untrusted project:** read the diff first (`git log -p .claude/settings.json`), or start Claude Code with `--no-hooks` until you've vetted the file.

### Scanning `.claude/` for misconfigurations

Scan your `.claude/` configurations for vulnerabilities with [AgentShield](https://github.com/affaan-m/agentshield):

```bash
npx ecc-agentshield scan          # Quick scan (102 rules)
npx ecc-agentshield scan --fix    # Auto-fix safe issues
```

Or use the built-in command: `/security-scan`.

CI integration included — see `.github/workflows/security.yml`.

## 🎨 Frontend Development

Two sibling self-contained packages covering the full frontend surface — polished product UIs *(frontend-ui)* and scroll-driven 3D experiences *(frontend-3d)*. Install one or both during `bash setup.sh`. Both run entirely on auto-dispatch: Claude routes to the right reviewer based on the files you're editing, no slash commands needed.

---

### 🖌️ `frontend-ui` — 2D UI & Polish

Production-grade reviewers for typography, color, motion, and interaction polish. Rules load only when you edit `.tsx`/`.jsx`/`.css`/`.scss`/`.html`/`.vue` files, so the kit stays weightless on backend work.

```bash
bash setup.sh
# Select "Frontend UI" when prompted for stacks
```

#### 🔍 Agents (6)

- **ui-reviewer** — umbrella dispatcher, 11-item reflex audit, delegates to the 5 specialists below
- **ui-typography-reviewer** — 4-step font-selection procedure, modular scale, `reflex_fonts_to_reject` list, line-height/length, font-loading hygiene
- **ui-color-reviewer** — OKLCH over HSL, tinted neutrals, palette cohesion, theme-by-use-context decision table, WCAG/APCA contrast
- **ui-motion-reviewer** — Emil Kowalski's 4-question animation framework, custom cubic-bezier constants, duration table, spring vs duration, reduced-motion
- **ui-interaction-reviewer** — buttons (`:active`, hit targets), modals (transform-origin, focus trap), forms (validation timing), focus-visible, loading patterns, microcopy
- **ui-design-critic** — holistic gestalt critique (*"does it feel designed?"*), narrative output, reflex audit scaled across the whole diff

#### 📏 Rules (7) — path-scoped, zero main-context tax

- **frontend-design-aesthetics** — anti-slop, anti-center, anti-generic UI
- **typography-guidelines** — font-selection procedure + banned-fonts list (Inter, DM Sans, Fraunces, etc.)
- **color-and-contrast** — OKLCH, tinted neutrals, theme decision table
- **spatial-and-layout** — 4pt scale, rhythm, container queries
- **motion-and-animation** — custom easing constants, duration table, 4-question framework
- **interaction-polish** — buttons, modals, drawers, forms, focus, loading, empty states, microcopy
- **ui-anti-patterns** — banned fonts, colors, layouts, motion, interactions

#### 🪝 Hooks (3) — advisory, triggered on save

- **ui-banned-fonts-check** — detects `Inter`, `DM Sans`, `Fraunces`, and other reflex-reject families
- **ui-color-check** — pure `#000`/`#fff`, purple→blue gradients, gradient text, 3+ `hsl()` without `oklch()`
- **ui-animation-easing-check** — `ease-in` on UI, `transition: all`, `scale(0)` entry, layout-property animation

#### 🛠️ Skill (opt-in)

- **impeccable-craft** — 4-stage shape-then-build flow: Shape → Refine → Implement → Polish. For building UI from scratch with user check-ins at drift points.

Full reference: **[docs/FRONTEND-UI.md](docs/FRONTEND-UI.md)** · Guide: **[Chapter 14](docs/guide/14-frontend-ui.md)** · Credits: [Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) · [Emil Kowalski's skill](https://github.com/emilkowalski/skill)

---

### 🎬 `frontend-3d` — Scroll-driven 3D & Animation

Production-grade reviewers for scroll-driven product showcases with GSAP ScrollTrigger, React Three Fiber, and Three.js. Built from 12+ hours of battle-tested debug experience — texture color distortion, GSAP timeline compression, UV mapping mismatches, Tailwind v3/v4 drift.

```bash
bash setup.sh
# Select "Frontend 3D" when prompted for stacks
```

#### 🔍 Agents (4)

- **presentation-reviewer** *(16 checks)* — GSAP ScrollTrigger, phone frames, combined sections, 3D textures
- **r3f-scene-reviewer** *(15 checks)* — color management, performance, GLB handling, R3F patterns
- **ui-design-reviewer** *(16 checks)* — typography, color, layout, motion, states, glassmorphism
- **frontend-perf-reviewer** *(12 checks)* — bundle size, lazy loading, CSS containment, web vitals

#### 📚 Skills (6)

- **threejs-color-management** — sRGB vs Linear, toneMapping, debug checklist
- **r3f-scroll-driven-3d** — GSAP → Zustand → R3F bridge pattern
- **gltf-debugging** — runtime GLB inspection, UV debugging
- **html-to-3d-texture** — capture HTML as PNG for 3D models
- **product-3d-lighting** — studio lighting for product showcases
- **output-enforcement** — anti-laziness, complete code generation

#### 🪝 Hooks (4)

- **gsap-pattern-check** — `scrub: true`, missing `invalidateOnRefresh`, no `tl.set` extension, no `gsap.context()`
- **r3f-color-check** — deprecated `sRGBEncoding`, missing `colorSpace`, wrong material for screens
- **tailwind-version-guard** — v3/v4 syntax mismatches (`@tailwind` vs `@import`, config format)
- **bundle-size-warn** — heavy imports: moment, lodash, THREE namespace, MUI, antd, framer-motion

#### 📏 Rules (3) & Command (1)

- **gsap-conventions** — `scrub` as number, `invalidateOnRefresh`, `tl.set({},{},1.0)`, `gsap.context()` cleanup
- **threejs-conventions** — `meshBasicMaterial` for screens, UV copy on texture swap, `getState()` in `useFrame`
- **frontend-aesthetics-3d** — anti-center bias, spring physics, staggered reveals, 3D atmosphere
- **`/capture-screen [port]`** — capture React components as PNG textures for 3D model screens (Playwright + sharp)

Full reference: **[docs/FRONTEND-3D.md](docs/FRONTEND-3D.md)** · Guide: **[Chapter 13](docs/guide/13-frontend-3d.md)**

## 🏗️ Showcase

See [`packages/showcase/`](packages/showcase/) for a real production example — a production social app with 28 agents, 17 commands, 13 hooks, 11 skills, and 6 rules.

<details>
<summary>📖 Documentation (15 chapters + 3 examples)</summary>

### Guide

| Chapter | Topic |
|---------|-------|
| [01 — Getting Started](docs/guide/01-getting-started.md) | Install in 5 minutes, first commands |
| [02 — Architecture](docs/guide/02-architecture.md) | How agents, commands, hooks, rules, skills work together |
| [03 — Writing Agents](docs/guide/03-writing-agents.md) | Agent format, 2-phase review, severity/confidence |
| [04 — Writing Commands](docs/guide/04-writing-commands.md) | Orchestrator pattern, agent dispatch |
| [05 — Writing Hooks](docs/guide/05-writing-hooks.md) | Hook types, JSON protocol, profiles |
| [06 — Writing Skills](docs/guide/06-writing-skills.md) | Knowledge skills, dynamic content |
| [07 — Writing Rules](docs/guide/07-writing-rules.md) | Always-in-context enforcement |
| [08 — Orchestration](docs/guide/08-orchestration.md) | Full pipeline: /dev → agents → report |
| [09 — Advanced Patterns](docs/guide/09-advanced-patterns.md) | Profiles, session continuity, CI/CD |
| [10 — Codex CLI Support](docs/guide/10-codex-support.md) | Codex integration, tool mapping, skill discovery |
| [11 — Documentation Architecture](docs/guide/11-documentation-architecture.md) | Doc templates, tree generation, enforcement |
| [12 — Security Scanning](docs/guide/12-security-scanning.md) | AgentShield, CI, Red Team/Blue Team |
| [13 — Frontend 3D](docs/guide/13-frontend-3d.md) | GSAP, Three.js, R3F agents, hooks, skills, rules |
| [14 — Frontend UI](docs/guide/14-frontend-ui.md) | Typography, color, motion, interaction reviewers, rules, hooks |
| [15 — Env Vars & Hook Profiles](docs/guide/15-env-vars-and-hook-profiles.md) | `CLAUDE_HOOK_PROFILE`, `CLAUDE_DISABLED_HOOKS`, full env-var reference |

### Examples

| Example | What you build |
|---------|---------------|
| [Agent from Scratch](docs/examples/agent-from-scratch.md) | Dockerfile reviewer agent (10 checks) |
| [Command Orchestrator](docs/examples/command-orchestrator.md) | /deploy command with 4 phases |
| [Hook Pipeline](docs/examples/hook-pipeline.md) | Format + lint on every edit |

</details>

<details>
<summary>🤝 Codex CLI Support</summary>

superkit works with both **Claude Code** and **OpenAI Codex CLI**:

| Feature | Claude Code | Codex CLI |
|---------|:-:|:-:|
| Model | Opus (per agent) | **gpt-5.5** (global config) |
| Agents / Skills | 56 agents | 82 skills in `packages/codex/skills/` (9 commands + 36 agents + 9 stack + 10 frontend-3d + 7 frontend-ui + 5 go-knowledge + 6 TGApp = 82) + 3 GAN mirrors in `packages/gan/skills/` (optional install) |
| Commands | 16 (slash commands) | 9 (user-invocable skills) |
| Hooks | 42 shipped (26 core + 9 stack + 4 frontend-3d + 3 frontend-ui) + 2 internal + Stop | — (inline rules in AGENTS.md) |
| Rules | 19 shipped (7 core + 2 stack + 3 frontend-3d + 7 frontend-ui) + 1 internal | 1 file (`packages/codex/rules/default.rules` — approval policy DSL) |
| Knowledge Skills | 11 + 6 frontend-3d + 1 frontend-ui + 1 extra | 3 (project-architecture, writing-agents, writing-commands) |
| Session continuity | Yes (hooks) | — |
| Subagent dispatch | Agent tool | spawn_agent |

`bash setup.sh --codex` (from cloned repo) will install for Codex CLI — copies 82 skills + `default.rules` and creates AGENTS.md + config.toml (`gpt-5.5`, `xhigh`).

See [Codex Installation Guide](packages/codex/INSTALL.md) for manual setup.

</details>

## ⚡ Using with Superpowers Plugin

This toolkit is **complementary** to the [Superpowers plugin](https://github.com/obra/superpowers):

- **superkit** = infrastructure (agents, hooks, commands, review pipeline)
- **superpowers** = process (TDD, debugging, brainstorming, verification)

Install both for the complete experience.

### 🧩 Ecosystem & companions

Skills, MCP servers, design/asset resources, and repos that complement Superkit's orchestration. Superkit provides the pipeline (hooks, commands, `/dev`); these add depth.

<details>
<summary><b>Expand — skills · MCP servers · design & assets · repos · language packs</b></summary>

#### Skills (install separately)

| Skill | What | Link |
|-------|------|------|
| ui-ux-pro-max | Design system generation (161 rules, 71 styles, 73 fonts) | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| app-store-preflight | iOS/macOS App Store review validator | [GitHub](https://github.com/truongduy2611/app-store-preflight-skills) |
| app-store-screenshots | AI-generated App Store screenshots — device frames + marketing copy (3.2K stars) | [GitHub](https://github.com/ParthJadhav/app-store-screenshots) |

#### Community skill packs (install via `npx skills add`)

| Source | Skills | Count |
|--------|--------|-------|
| greensock/gsap-skills | gsap-core, timeline, scrolltrigger, plugins, utils, react, performance, frameworks | 8 |
| freshtechbro/claudedesignskills | threejs-webgl, react-three-fiber, modern-web-design + 19 others | 22 |
| Leonxlnx/taste-skill | design-taste-frontend, output-enforcement, soft, minimalist, brutalist, redesign, stitch | 7 |

#### MCP servers (add to `.mcp.json`)

| Server | What | Package |
|--------|------|---------|
| 21st.dev magic | UI component search/generation | `@21st-dev/magic@latest` |
| shadcn | shadcn/ui component library | `shadcn-mcp@latest` |
| gsap-master | Full GSAP API, intent analysis, production patterns | `bruzethegreat-gsap-master-mcp-server@2.2.0` |
| playwright | Browser automation/screenshots | Plugin (built-in) |
| context7 | Library docs lookup | Plugin (built-in) |

#### Design & asset resources

- **[React Bits](https://reactbits.dev)** — 110+ animated React components, copy-paste or `jsrepo` install · open-source (MIT + Commons Clause) · [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)
- **[Unicorn.Studio](https://www.unicorn.studio)** — no-code WebGL/shader editor, ship premium hero sections without writing GLSL · freemium
- **[Cosmos](https://www.cosmos.so)** — curated visual moodboards with color/vibe search · freemium
- **[Free Faces](https://www.freefaces.gallery)** — curated directory of free typefaces · licenses vary per font, check each
- **[Pixolite](https://pixolite.ru)** — free 3D icons, letters (EN/RU), backgrounds and textures (RU-language site) · verify terms before commercial use
- **[21st.dev](https://21st.dev)** — AI agent deployment platform + community UI component library
- **[SkillsMP](https://skillsmp.com)** — 500K+ agent-skill marketplace with keyword + AI semantic search API

#### Repos & platforms

| Resource | What | Link |
|----------|------|------|
| oh-my-claudecode | TypeScript plugin with 19 agents, 31 skills, smart model routing, auto-learner, HUD statusline | [GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) |
| Get Shit Done (gsd-pi) | Meta-prompting framework with plan validation, goal-backward verification (gsd-2 now archived → open-gsd/gsd-pi) | [GitHub](https://github.com/open-gsd/gsd-pi) |
| Everything Claude Code | 28 agents, 125 skills, 60 commands — comprehensive harness performance system | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| Awesome MCP Servers | Curated list of MCP servers — 300+ servers across all categories | [GitHub](https://github.com/punkpeye/awesome-mcp-servers) |

#### Language-specific skill packs

| Plugin | Focus | Skills | Install |
|--------|-------|--------|---------|
| [cc-skills-golang](https://github.com/samber/cc-skills-golang) | Production-grade Go patterns | 40 skills | `npx skills add https://github.com/samber/cc-skills-golang --skill '*'` |

</details>

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## 📚 More

- **[Design & tool recommendations](docs/recommendations.md)** — curated list of App Store, 3D, and animation tools
- **[Troubleshooting](TROUBLESHOOTING.md)** — common issues and FAQ
- **[Detailed install guide](docs/INSTALL-CLAUDE-CODE.md)** — step-by-step setup with prerequisites

## 📄 License

MIT

---

<div align="center">

Made with ❤️ for the Claude Code community

</div>
