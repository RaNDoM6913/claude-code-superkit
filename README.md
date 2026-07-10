# ⚡ claude-code-superkit

> **The quality-first kit for Claude Code & Codex** — every one of 56 agents runs on Opus (now 4.8, 1M context). No Sonnet, no Haiku, no token-cost compromises on the work that ships your code. Every prompt hardened for the Opus executor by **Claude Fable 5**, a tier above Opus.

<div align="center">

[![Stars](https://img.shields.io/github/stars/RaNDoM6913/claude-code-superkit?style=for-the-badge&logo=github)](https://github.com/RaNDoM6913/claude-code-superkit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
![Agents](https://img.shields.io/badge/56_agents-Opus_4.8-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)
![Hardened by](https://img.shields.io/badge/prompts_hardened_by-Claude_Fable_5-FF6B35?style=for-the-badge&logo=anthropic&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-gpt--5.5-00A67E?style=for-the-badge&logo=openai&logoColor=white)

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

### 🤖 GAN Adversarial Loop
Optional three-agent harness: planner → generator → evaluator.
Your feature is attacked against binary rubrics before it ships (Playwright required).

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

## 📦 What's Inside

**One kit, two harnesses** — full parity for Claude Code (Opus 4.8) and Codex CLI (gpt-5.5, xhigh).

| Component | Count | What you get |
|-----------|-------|--------------|
| **Core Agents** | 31 | Code review, security, testing, audit, debugging, docs, planning gates (plan-checker · evaluator · goal-verifier · critic), health, scaffolding — all on **Opus** |
| **Stack Agents** | 19 | Go ×6 · TypeScript · Python · Rust · Frontend-3D ×4 · Frontend-UI ×6 |
| **GAN Agents** | 3 | planner → generator → evaluator adversarial loop (optional package, requires Playwright) |
| **Extra Agents** | 3 | bot-reviewer (Telegram/Discord/Slack) · design-system-reviewer · red-blue-auditor |
| **Extra Skills** | 1 | [SkillsMP](https://skillsmp.com) search — 500K+ community skills marketplace |
| **Commands** | 16 | `/dev`, `/review`, `/audit`, `/workflow`, `/superkit-init`, `/pair` + 10 more |
| **Hooks** | 42 shipped + 2 internal + Stop | 26 core · 9 stack · 4 frontend-3d · 3 frontend-ui — git safety, formatting, discipline, /dev enforcement, CVE-2025-59536 guard |
| **Rules** | 19 shipped + 1 internal | 7 core · 2 stack · 3 frontend-3d · 7 frontend-ui + Codex `default.rules` approval-policy DSL |
| **Skills** | 11 core + 6 frontend-3d + 1 frontend-ui + 3 GAN + 1 extra | authoring meta-skills, stack knowledge (Telegram bots · Supabase auth · Drizzle · PostgreSQL · Redis · Russian typography), 3D pipeline, GAN mirrors |
| **Plugins** | 4 base + 3 optional | superpowers · github · context7 · code-review (+ code-simplifier · playwright · frontend-design) |

<details>
<summary><b>Full component list</b> — every agent, command, hook, rule, and skill by name</summary>

- **Core agents (31):** code-reviewer, security-scanner, silent-failure-hunter, comment-rot-analyzer, ai-slop-cleaner, database-reviewer, migration-reviewer, docs-reviewer, api-contract-sync, ui-reviewer, visual-reviewer, test-generator, e2e-test-generator, audit-backend, audit-frontend, audit-infra, health-checker, pre-deploy-validator, dependency-checker, debug-observer, tree-generator, scaffold-endpoint, architect, plan-checker, evaluator, goal-verifier, critic, minimal-change-engineer, reality-checker, codebase-onboarding-engineer, behavioral-nudge-engine
- **Stack agents (19):** go-reviewer, go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer, ts-reviewer, py-reviewer, rs-reviewer, presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer, ui-reviewer (umbrella), ui-typography-reviewer, ui-color-reviewer, ui-motion-reviewer, ui-interaction-reviewer, ui-design-critic
- **Commands (16):** `/dev`, `/review`, `/audit`, `/workflow`, `/superkit-init`, `/superkit-evolve`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit`, `/docs-init`, `/security-scan`, `/benchmark`, `/pair`, `/capture-screen`
- **Hooks (42 shipped):** 26 core (incl. intake-classifier.py, gateguard pair, edit-streak, audit-trail, audit-settings CVE-2025-59536, plan-completion-gate, user-intent-detect, subagent-stop-validate, compact-state-inject, /dev hard-enforce trio) · 9 stack (Go error/context/safety/golangci-lint + format-on-edit per language) · 4 frontend-3d (gsap/r3f/tailwind/bundle-size) · 3 frontend-ui (banned-fonts/color/animation-easing)
- **Rules (19 shipped):** 7 core (coding style, security, git workflow, documentation, dev workflow, auto command triggers, frontend-aesthetics) · 2 Go · 3 frontend-3d (gsap/threejs/aesthetics-3d) · 7 frontend-ui (design-aesthetics, typography, color, spatial, motion, interaction, anti-patterns)
- **Skills (22):** project-architecture, project-scanner, writing-agents/commands/hooks, telegram-bot-builder, nextjs-supabase-auth, drizzle-orm-expert, ru-text, postgresql-optimization, redis-patterns · threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement · impeccable-craft · gan-planner/generator/evaluator · skillsmp-search

</details>

## 🆕 What's New

**v1.5.2 — the auto-sync integrity release: your customizations survive updates now** (see [CHANGELOG](CHANGELOG.md)):

- 🛡️ **`superkit-update` no longer overwrites your customized files.** A file is replaced only when its content matches a released tag's blob (your install baseline + the last 5 tags); anything you edited is **preserved and reported** at SessionStart — `N synced · M preserved (locally customized) · K skipped (internal)` — instead of silently reverted. A self-bootstrap step means the fixed updater applies itself *before* its first sync, and coverage now includes `stack-rules/`, the Go `references/`, and `hooks/lib/`.
- 🔒 **Repo-only files can't leak into your project anymore** — one shared `INTERNAL-FILES` manifest feeds the installer, the counts gate and the updater, with a **per-category fallback** so even a corrupted manifest can't ship `superkit-integrity.md` into consumers (proven failing-first, 31-case fixture suite).
- ✂️ **The two commit gates stop blocking their own advice**: `dev-required-on-commit` no longer penalizes `memory/`/`.claude/`-only commits (exempt check now runs FIRST) and override tags count only when they *open* a message line — prose mentioning `[no-dev:…]` is not an override; `block-dangerous-git` strips `-m`/`--message`/heredoc payloads before matching, so a commit message *describing* `--no-verify` or a force-push no longer trips the guard (chained real commands still block — 38-case matrix).
- 📄 **The ADR template actually installs now** (project-root `docs-templates/adr-template.md`, idempotent, never overwrites) — `/dev`'s Phase 2 nudge no longer dangles and degrades silently if you delete it.
- 📊 **Statusline, rebuilt visual language** — the ctx readout is a colour heat bar (`ctx ██████░░░░ 62%`), joined by **real 5-hour/weekly rate-limit bars** read from Claude Code's own `rate_limits` payload (the same numbers `/usage` shows — no estimated denominators) with time-to-reset; plus the **current model**, an intensity-coloured **effort** (`⚙xhigh`), a `⟁ULTRA` badge while ultracode is on, and your active task in readable bright white (`CLAUDE_STATUSLINE_THEME=light` for light terminals). All fail-open — older CLIs just show fewer segments.

Previous releases: [CHANGELOG](CHANGELOG.md) · [v1.5.1](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.5.1) · [v1.5.0](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.5.0) · [v1.4.2](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.2) · [v1.4.1](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.1) · [v1.4.0](https://github.com/RaNDoM6913/claude-code-superkit/releases/tag/v1.4.0)

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
| `/review [--comment]` | Detect changes → dispatch reviewers → **double-verify** findings → unified report (optionally post GitHub PR comments) |
| `/audit [--health]` | Parallel audit: up to 4 agents (frontend, backend, infra, security); `--health` = 30-second dashboard |
| `/workflow <template>` | Predefined flows: `bugfix`, `hotfix`, `spike`, `refactor`, `dep-upgrade`, `security-audit` |
| `/superkit-init` | Intelligent setup: scan codebase → generate **filled** docs → configure rules with real paths |
| `/superkit-evolve` | Detect and fix documentation drift (stale counters, missing docs, outdated trees) |
| `/pair` | AI pair programming — Driver, Navigator, TDD, Review, Debug modes |
| `/security-scan` | AgentShield scan of `.claude/` configs (102 rules) |
| `/commit` | Conventional commit with secret scanning |

All 16 commands with flags and examples: **[Chapter 1](docs/guide/01-getting-started.md)**.

## 🔧 Hook Profiles

> ⚠️ **Critical:** Hook scripts MUST be tracked in git. If your `.gitignore` contains `.claude/scripts/`, remove that line immediately. Without tracked hooks, other developers get zero enforcement. Check with `git ls-files .claude/scripts/hooks/ | head` — it must list your hook files.

Set `CLAUDE_HOOK_PROFILE` environment variable:

| Profile | Behavior |
|---------|----------|
| `fast` | Critical safety only: git guard, secret scan, settings audit, doc-check commit gate |
| `standard` (default) | All core hooks + stack formatters |
| `strict` | Everything + go vet on every edit + stop verification |

Disable specific hooks without editing `settings.json`: `CLAUDE_DISABLED_HOOKS=hook1,hook2`. Full env-var reference: **[Chapter 15](docs/guide/15-env-vars-and-hook-profiles.md)**.

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

## 🎨 Frontend Packages

Two self-contained sibling packages — install one or both during `bash setup.sh`. Both run entirely on auto-dispatch: rules load only when you edit matching files, so the kit stays weightless on backend work.

### 🖌️ `frontend-ui` — 2D UI & polish

Six reviewers (umbrella + typography / color / motion / interaction / design-critic), seven path-scoped rules, three advisory hooks, and the opt-in **impeccable-craft** shape-then-build skill. The stack that stops AI-reflex design: banned-font detection, OKLCH color discipline, Emil Kowalski's 4-question animation framework, an 11-item reflex audit with hard thresholds.

**6 agents · 7 rules · 3 hooks · 1 skill** — full reference: [docs/FRONTEND-UI.md](docs/FRONTEND-UI.md) · [Chapter 14](docs/guide/14-frontend-ui.md) · Credits: [Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) · [Emil Kowalski's skill](https://github.com/emilkowalski/skill)

### 🎬 `frontend-3d` — scroll-driven 3D & animation

Four reviewers (GSAP ScrollTrigger presentations, R3F scenes, 3D UI design, frontend perf), six skills distilled from 12+ hours of real debug pain (texture color distortion, timeline compression, UV mismatches), four hooks, three rules, and `/capture-screen` for turning React components into 3D-model textures.

**4 agents · 6 skills · 4 hooks · 3 rules · 1 command** — full reference: [docs/FRONTEND-3D.md](docs/FRONTEND-3D.md) · [Chapter 13](docs/guide/13-frontend-3d.md)

## 📚 Documentation, Showcase & Ecosystem

**Guide:** 15 chapters + 3 worked examples — from first install to writing your own agents, hooks, and orchestrators.

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

**Showcase:** [`packages/showcase/`](packages/showcase/) — a real production social app's `.claude/` setup: 28 agents, 17 commands, 13 hooks, 11 skills, 6 rules.

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

### ⚡ Superpowers plugin

Superkit is **complementary** to [Superpowers](https://github.com/obra/superpowers): superkit = infrastructure (agents, hooks, commands, review pipeline), superpowers = process (TDD, debugging, brainstorming, verification). Install both.

### 🧩 Ecosystem & companions

Curated skills, MCP servers, design/asset resources, community repos, and language packs that pair well with Superkit live in **[docs/recommendations.md](docs/recommendations.md)** — including the [SkillsMP](https://skillsmp.com) 500K+ skills marketplace searchable via the built-in `skillsmp-search` skill.

### 📎 More

- **[Troubleshooting](TROUBLESHOOTING.md)** — common issues, platform-specific guidance, FAQ
- **[Detailed install guide](docs/INSTALL-CLAUDE-CODE.md)** — step-by-step setup with prerequisites
- **[Design & tool recommendations](docs/recommendations.md)** — App Store, 3D, and animation tools

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## 📄 License

MIT

---

<div align="center">

Made with ❤️ for the Claude Code community

</div>
