# ⚡ claude-code-superkit

<div align="center">

[![Stars](https://img.shields.io/github/stars/RaNDoM6913/claude-code-superkit?style=for-the-badge&logo=github)](https://github.com/RaNDoM6913/claude-code-superkit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
![Agents](https://img.shields.io/badge/49_agents-Opus_4.7_(1M)-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-gpt--5.4-00A67E?style=for-the-badge&logo=openai&logoColor=white)

**Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI.**
**All agents on Opus. Maximum accuracy. Zero compromises.**

[🚀 Quick Start](#-installation) · [⌨️ Commands](#%EF%B8%8F-key-commands) · [📖 Guide](docs/guide/) · [❓ Troubleshooting](TROUBLESHOOTING.md) · [📋 Changelog](CHANGELOG.md)

</div>

---

Battle-tested in a production app with 68+ endpoints and 50 database migrations. Features double-verification code review, 4-layer documentation enforcement, AgentShield security scanning, and [SkillsMP](https://skillsmp.com) marketplace integration.

<table>
<tr>
<td width="50%">

### 🔍 Double-Verification Review
Every finding validated by an independent agent.
False positives eliminated before you see them.
Post inline comments on GitHub PRs with `--comment`.

</td>
<td width="50%">

### 📄 4-Layer Doc Enforcement
Rule + BLOCKING hook + auto-commands + Stop hook.
Smart file-to-doc mapping — blocks commits.
15-point checklist — docs before "done".

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Security Scanning
AgentShield (102 rules) + Red/Blue adversarial audit.
Config protection hook guards your standards.
CI integration included.

</td>
<td width="50%">

### 🔎 SkillsMP Integration
Search 500K+ community skills before building.
Keyword + AI semantic search via API.
Don't reinvent — discover and adapt.

</td>
</tr>
</table>

---

## 📦 What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| **Core Agents** | 27 | Code review, security, testing, audit, debugging, health, tree gen, DB review, architecture, docs review, plan validation, goal verification, evaluation, AI slop cleanup, critic, visual review, **comment-rot analyzer**, **silent-failure hunter** — all on **Opus** |
| **Stack Agents** | 19 | Go (6: reviewer, error, concurrency, performance, modernizer, observability), TypeScript, Python, Rust, Frontend-3D (4: presentation-reviewer, r3f-scene-reviewer, ui-design-reviewer, frontend-perf-reviewer), **Frontend-UI (6: ui-reviewer umbrella + typography / color / motion / interaction / design-critic)** |
| **Extra Agents** | 3 | Bot reviewer (Telegram/Discord/Slack), design system reviewer, red-blue auditor |
| **Extra Skills** | 1 | [SkillsMP](https://skillsmp.com) search — 500K+ community skills marketplace |
| **Commands** | 16 | `/dev`, `/review`, `/audit`, `/workflow`, `/superkit-init`, `/superkit-evolve`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit`, `/docs-init`, `/security-scan`, `/benchmark`, `/pair`, **`/capture-screen`** |
| **Hooks** | 22 + 16 stack + Stop | Git safety, doc-check-on-commit, config-protection, loop-guard, context-monitor, security-patterns, evolve-check, format-on-edit, typecheck, session continuity, Go error/context/safety/golangci-lint, **gsap-pattern-check, r3f-color-check, tailwind-version-guard, bundle-size-warn**, **ui-banned-fonts-check, ui-color-check, ui-animation-easing-check**, **`/dev` hard-enforce (edit-counter + marker-set + required-on-commit)**, **audit-settings-source (CVE-2025-59536)**, **audit-trail (hash-chained forensics)**, **plan-completion-gate**, **user-intent-detect**, **subagent-stop-validate**, **compact-state-inject** |
| **Rules** | 7 + 12 stack | Coding style, security (path-scoped), git workflow, documentation, auto dev workflow, auto command triggers, frontend-aesthetics (path-scoped), go-conventions, go-safety, **gsap-conventions**, **threejs-conventions**, **frontend-aesthetics-3d**, **frontend-design-aesthetics, typography-guidelines, color-and-contrast, spatial-and-layout, motion-and-animation, interaction-polish, ui-anti-patterns** |
| **Skills** | 5 + 6 frontend-3d + 1 frontend-ui + 1 extra | Project architecture, project-scanner, writing-agents guide, writing-commands guide, writing-hooks guide + threejs-color-management, r3f-scroll-driven-3d, gltf-debugging, html-to-3d-texture, product-3d-lighting, output-enforcement + **impeccable-craft** + SkillsMP search |
| **Plugins** | 4 base + 3 optional | superpowers, github, context7, code-review + code-simplifier, playwright, frontend-design |

## 🆕 What's New (v1.3.9)

- 🎨 **Frontend UI package** — self-contained 2D UI design/polish package alongside Frontend 3D. 6 agents, 7 rules, 3 hooks, 1 skill — auto-dispatch, no slash commands.
- 🧑‍🎨 **ui-reviewer umbrella + 5 specialists** — typography, color, motion, interaction, design-critic. Each agent has explicit dispatch rules so Claude routes UI audits to the right specialist.
- 📐 **7 path-scoped rules** — design aesthetics, typography (with full banned-fonts list), color (OKLCH, tinted neutrals), spatial (4pt scale), motion (custom easing), interaction polish, anti-patterns.
- 🪝 **3 advisory UI hooks** — banned-fonts detection, color checks (pure `#000`/`#fff`, purple→blue gradients), animation-easing (`ease-in` on UI, `transition: all`).
- 🛠️ **impeccable-craft skill** — opt-in 4-stage shape-then-build flow (Shape → Refine → Implement → Polish) for building UI from scratch.
- 🧠 **Opus 4.7 + 1M context** — badge, template, and hooks updated. `model: opus` alias auto-routes to the latest Opus release.
- 🛡️ **Hooks V2-B hardening (11 shipped)** — CVE-2025-59536 mitigation (`audit-settings-source`), hash-chained audit trail, plan-completion gate, user-intent detection, subagent-stop validation, compact-state survival, `/dev` hard-enforcement, override budget + anti-reset-cycle detection, block-dangerous-git bypass patterns.
- 🐛 **Critical hook-JSON-path fix** — `doc-check-on-commit`, `superkit-counts-verify`, `config-protection`, `security-patterns`, `loop-guard` silently exited 0 since inception because of wrong JSON path. All now read `.tool_input.<field>` first. Covered by regression tests.
- 🤖 **7 Codex skills** — full frontend-ui port (6 specialists + impeccable-craft).

See [full changelog](CHANGELOG.md) for v1.0.0 → v1.3.9 history.

## 🔄 How `/dev` Works

<p align="center">
  <img src="docs/dev-flow.svg" alt="/dev — 15-phase development orchestrator: Planning (6 steps) → Execution (5 steps) → Quality (4 steps)" width="960">
</p>

## 🚀 Installation

### Claude Code (recommended)

```bash
# One command — works on macOS, Linux, Windows:
npx claude-code-superkit

# With explicit options:
npx claude-code-superkit --stacks=go,typescript --profile=strict --codex

# Non-interactive (CI/CD):
npx claude-code-superkit --defaults
```

`npx claude-code-superkit` — interactive installer: selects your stack, hook profile, plugins. Zero dependencies beyond Node.js. See [detailed guide](docs/INSTALL-CLAUDE-CODE.md).

```bash
# 3. Open Claude Code
claude

# 4. Install plugins
/plugins
# → install: superpowers, github, context7, code-review

# 5. Run intelligent setup (auto-fills docs from your code!)
/superkit-init

# 6. Verify
/review --full
```

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

Or run `npx claude-code-superkit --codex` to install both Claude Code and Codex CLI support in one command. Model: **gpt-5.4** + **extra_high** reasoning.

## ⌨️ Key Commands

| Command | What it does |
|---------|-------------|
| `/dev <task>` | 15-phase orchestrator: understand → architect → pseudocode → plan → contract → validate → implement → evaluate → verify → test → goals → review → critic → docs → report |
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

## 🎨 Frontend & 3D Development

Self-contained package for quality frontend, 3D, and animation development. Built from 12+ hours of battle-tested experience building scroll-driven 3D product showcases with GSAP ScrollTrigger, React Three Fiber, and Three.js.

```bash
npx claude-code-superkit
# Select "Frontend 3D" when prompted for stacks
```

### 🔍 Agents (4)

- **presentation-reviewer** *(16 checks)* — GSAP ScrollTrigger, phone frames, combined sections, 3D textures
- **r3f-scene-reviewer** *(15 checks)* — color management, performance, GLB handling, R3F patterns
- **ui-design-reviewer** *(16 checks)* — typography, color, layout, motion, states, glassmorphism
- **frontend-perf-reviewer** *(12 checks)* — bundle size, lazy loading, CSS containment, web vitals

### 📚 Skills (6)

- **threejs-color-management** — sRGB vs Linear, toneMapping, debug checklist
- **r3f-scroll-driven-3d** — GSAP → Zustand → R3F bridge pattern
- **gltf-debugging** — runtime GLB inspection, UV debugging
- **html-to-3d-texture** — capture HTML as PNG for 3D models
- **product-3d-lighting** — studio lighting for product showcases
- **output-enforcement** — anti-laziness, complete code generation

### 🪝 Hooks (4)

- **gsap-pattern-check** — `scrub: true`, missing `invalidateOnRefresh`, no `tl.set` extension, no `gsap.context()`
- **r3f-color-check** — deprecated `sRGBEncoding`, missing `colorSpace`, wrong material for screens
- **tailwind-version-guard** — v3/v4 syntax mismatches (`@tailwind` vs `@import`, config format)
- **bundle-size-warn** — heavy imports: moment, lodash, THREE namespace, MUI, antd, framer-motion

### 📏 Rules (3) & Command (1)

- **gsap-conventions** — `scrub` as number, `invalidateOnRefresh`, `tl.set({},{},1.0)`, `gsap.context()` cleanup
- **threejs-conventions** — `meshBasicMaterial` for screens, UV copy on texture swap, `getState()` in `useFrame`
- **frontend-aesthetics-3d** — anti-center bias, spring physics, staggered reveals, 3D atmosphere
- **`/capture-screen [port]`** — capture React components as PNG textures for 3D model screens (Playwright + sharp)

Full reference: **[docs/FRONTEND-3D.md](docs/FRONTEND-3D.md)** · Guide: **[Chapter 13](docs/guide/13-frontend-3d.md)**

### 🎨 External Design & Asset Resources

Personal pick-list of resources worth keeping around when shipping polished frontend work. Grouped by intent so the list scales cleanly as it grows.

<details>
<summary><b>Expand — components · inspiration · assets · platforms · skills</b></summary>

#### Components & tools

- **[React Bits](https://reactbits.dev)** — 110+ animated React components, copy-paste or `jsrepo` install · open-source (MIT + Commons Clause) · [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)
- **[Unicorn.Studio](https://www.unicorn.studio)** — no-code WebGL/shader editor, ship premium hero sections without writing GLSL · freemium (free: 70 effects + 10 publishes; paid adds commercial license)

#### Inspiration & references

- **[Cosmos](https://www.cosmos.so)** — curated visual moodboards with color/vibe search · freemium (~500 free saves, Premium ~$8/mo)

#### Assets (fonts, graphics)

- **[Free Faces](https://www.freefaces.gallery)** — curated directory of free typefaces (Cursive / Display / Mono / Sans / Serif / Slab) · licenses vary per font, check each
- **[Pixolite](https://pixolite.ru)** — free 3D icons, letters (EN/RU), backgrounds and textures (RU-language site) · free per-asset, verify terms before commercial use

#### Platforms & skill marketplaces

- **[21st.dev](https://21st.dev)** — AI agent deployment platform + community UI component library
- **[SkillsMP](https://skillsmp.com)** — 500K+ agent-skill marketplace with keyword + AI semantic search API

#### Community skill packs (install via `npx skills add`)

| Source | Skills | Count |
|--------|--------|-------|
| greensock/gsap-skills | gsap-core, timeline, scrolltrigger, plugins, utils, react, performance, frameworks | 8 |
| freshtechbro/claudedesignskills | threejs-webgl, react-three-fiber, modern-web-design + 19 others | 22 |
| Leonxlnx/taste-skill | design-taste-frontend, output-enforcement, soft, minimalist, brutalist, redesign, stitch | 7 |

#### MCP server

| Server | Package | Purpose |
|--------|---------|---------|
| gsap-master | `bruzethegreat-gsap-master-mcp-server@2.2.0` | Full GSAP API, intent analysis, production patterns |

</details>

---

## 🏗️ Showcase

See [`packages/showcase/`](packages/showcase/) for a real production example — a production social app with 28 agents, 17 commands, 13 hooks, 11 skills, and 6 rules.

<details>
<summary>📖 Documentation (13 chapters + 3 examples)</summary>

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
| Model | Opus (per agent) | **gpt-5.4** (global config) |
| Agents / Skills | 49 agents | 67 skills (9 commands + 32 agents + 9 stack + 10 frontend-3d + 7 frontend-ui) |
| Commands | 16 (slash commands) | 9 (user-invocable skills) |
| Hooks | 38 + Stop | — (inline rules in AGENTS.md) |
| Rules | 19 (7 core + 12 stack) | Inline in AGENTS.md |
| Knowledge Skills | 5 + 6 frontend-3d + 1 frontend-ui + 1 extra | 3 (project-architecture, writing-agents, writing-commands) |
| Session continuity | Yes (hooks) | — |
| Subagent dispatch | Agent tool | spawn_agent |

`npx claude-code-superkit --codex` will install for Codex CLI — copies 67 skills and creates AGENTS.md + config.toml (`gpt-5.4`, `extra_high`).

See [Codex Installation Guide](packages/codex/INSTALL.md) for manual setup.

</details>

## ⚡ Using with Superpowers Plugin

This toolkit is **complementary** to the [Superpowers plugin](https://github.com/obra/superpowers):

- **superkit** = infrastructure (agents, hooks, commands, review pipeline)
- **superpowers** = process (TDD, debugging, brainstorming, verification)

Install both for the complete experience.

### 🧩 Recommended Companion Tools

Skills, MCP servers, and repos that complement Superkit's orchestration. Superkit provides the pipeline (hooks, commands, `/dev`); these add depth.

<details>
<summary><b>Expand — skills · MCP servers · repos · language packs</b></summary>

#### Skills (install separately)

| Skill | What | Link |
|-------|------|------|
| ui-ux-pro-max | Design system generation (161 rules, 71 styles, 73 fonts) | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| app-store-preflight | iOS/macOS App Store review validator | [GitHub](https://github.com/truongduy2611/app-store-preflight-skills) |
| app-store-screenshots | AI-generated App Store screenshots — device frames + marketing copy (3.2K stars) | [GitHub](https://github.com/ParthJadhav/app-store-screenshots) |

#### MCP servers (add to `.mcp.json`)

| Server | What | Package |
|--------|------|---------|
| 21st.dev magic | UI component search/generation | `@21st-dev/magic@latest` |
| shadcn | shadcn/ui component library | `shadcn-mcp@latest` |
| playwright | Browser automation/screenshots | Plugin (built-in) |
| context7 | Library docs lookup | Plugin (built-in) |

#### Repos & platforms

| Resource | What | Link |
|----------|------|------|
| oh-my-claudecode | 11.6K stars — TypeScript plugin with 19 agents, 31 skills, smart model routing, auto-learner, HUD statusline | [GitHub](https://github.com/Yeachan-Heo/oh-my-claudecode) |
| Get Shit Done (GSD-2) | 41K stars — meta-prompting framework with plan validation, goal-backward verification | [GitHub](https://github.com/gsd-build/gsd-2) |
| Everything Claude Code | 28 agents, 125 skills, 60 commands — comprehensive harness performance system | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| Awesome MCP Servers | Curated list of MCP servers — 300+ servers across all categories | [GitHub](https://github.com/punkpeye/awesome-mcp-servers) |

> Design-focused platforms (21st.dev, SkillsMP) live in **[External Design & Asset Resources](#-external-design--asset-resources)** above.

#### Language-specific skill packs

| Plugin | Focus | Skills | Install |
|--------|-------|--------|---------|
| [cc-skills-golang](https://github.com/samber/cc-skills-golang) | Production-grade Go patterns | 40 skills | `npx skills add https://github.com/samber/cc-skills-golang --skill '*'` |

</details>

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## 📄 License

MIT

---

<div align="center">

Made with ❤️ for the Claude Code community

</div>
