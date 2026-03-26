# ⚡ claude-code-superkit

<div align="center">

[![Stars](https://img.shields.io/github/stars/RaNDoM6913/claude-code-superkit?style=for-the-badge&logo=github)](https://github.com/RaNDoM6913/claude-code-superkit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
![Agents](https://img.shields.io/badge/31_agents-Opus_4.6-8A2BE2?style=for-the-badge&logo=anthropic&logoColor=white)
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
| **Core Agents** | 24 | Code review, security, testing, audit, debugging, health, tree gen, DB review, architecture, docs review, plan validation, goal verification, AI slop cleanup, critic, visual review — all on **Opus** |
| **Stack Agents** | 4 | Go, TypeScript, Python, Rust specialized reviewers |
| **Extra Agents** | 3 | Bot reviewer (Telegram/Discord/Slack), design system reviewer, red-blue auditor |
| **Extra Skills** | 1 | [SkillsMP](https://skillsmp.com) search — 500K+ community skills marketplace |
| **Commands** | 11 | `/dev`, `/review`, `/audit`, `/workflow`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit`, `/docs-init`, `/security-scan` |
| **Hooks** | 11 + 5 stack + Stop | Git safety, doc-check-on-commit, config-protection, loop-guard, context-monitor, format-on-edit, typecheck, context inject, session continuity |
| **Rules** | 6 | Coding style, security, git workflow, documentation (4-layer enforcement with BLOCKING hook), auto dev workflow, auto command triggers |
| **Skills** | 3 + 1 extra | Project architecture, writing-agents guide, writing-commands guide + SkillsMP search |
| **Plugins** | 4 base + 3 optional | superpowers, github, context7, code-review + code-simplifier, playwright, frontend-design |

## 🆕 What's New (v1.3.2)

- 📄 **Smart doc-check hook** — maps specific file types to required docs (migrations → schema, handlers → API ref, frontend → arch docs), not just "any .md"
- 📋 **15-point documentation rule** — explicit trigger-to-doc mapping table, subagent delegation instructions, dual-repo sync advisory
- 🔧 **Generalized core hook** — project-agnostic patterns (no app-specific paths), with full TGApp version in showcase

See [full changelog](CHANGELOG.md) for v1.0.0 → v1.3.2 history.

## 🔄 How `/dev` Works

```mermaid
graph LR
    P -->|" "| E -->|" "| Q

    P["📐 <b>Planning</b><br/><br/>1 · Understand<br/>2 · Architect<br/>3 · Plan<br/>4 · Validate"]
    E["⚡ <b>Execution</b><br/><br/>5 · Implement<br/>6 · Cleanup<br/>7 · Verify<br/>8 · Test"]
    Q["🔍 <b>Quality</b><br/><br/>9 · Review ×4<br/>10 · Critic<br/>11 · Docs<br/>12 · Report"]

    style P fill:#e3f2fd,stroke:#1976D2,stroke-width:2px,color:#333
    style E fill:#fff3e0,stroke:#F57C00,stroke-width:2px,color:#333
    style Q fill:#e8f5e9,stroke:#388E3C,stroke-width:2px,color:#333
```

## 🚀 Installation

### Claude Code (recommended)

```bash
git clone https://github.com/RaNDoM6913/claude-code-superkit.git
cd your-project/
bash /path/to/claude-code-superkit/setup.sh
```

Interactive installer: selects your stack, hook profile, plugins (github, context7, code-review + optional), auto-installs superpowers. See [detailed guide](docs/INSTALL-CLAUDE-CODE.md).

### Codex CLI

Tell Codex:
```
Fetch and follow instructions from https://raw.githubusercontent.com/RaNDoM6913/claude-code-superkit/main/packages/codex/INSTALL.md
```

Or run `setup.sh` and select "Y" for Codex. Model: **gpt-5.4** + **extra_high** reasoning.

### After Installation

1. Edit `CLAUDE.md` — fill in your project details (replace TODO placeholders)
2. Edit `.claude/skills/project-architecture/SKILL.md` — describe your architecture
3. Run `claude` → `/plugins` → install enabled plugins (superpowers, github, context7, code-review)
4. Try: `/review --full` or `/audit`

### ✅ Verify

Start a new Claude Code session and run `/review --full`. You should see agents dispatched and a findings report.

## ⌨️ Key Commands

| Command | What it does |
|---------|-------------|
| `/dev <task>` | 12-phase orchestrator: understand → architect → plan → validate → implement → cleanup → verify → test → review ×4 → critic → docs → report |
| `/dev --quick <task>` | Lightweight mode: skips architect, plan validation, slop cleanup, critic, docs — for small fixes |
| `/workflow <template>` | Predefined workflows: `bugfix`, `hotfix`, `spike`, `refactor`, `dep-upgrade`, `security-audit` |
| `/review [--comment]` | Detect changes → dispatch reviewers → **double-verify** findings → unified report (optionally post GitHub PR comments) |
| `/audit` | Parallel audit: up to 4 agents (frontend, backend, infra, security) |
| `/audit --health` | Quick health dashboard — dispatches only health-checker (~30s vs ~5min) |
| `/test` | Auto-detect stack and run tests |
| `/lint` | Auto-detect stack and run linters |
| `/commit` | Conventional commit with secret scanning |
| `/new-migration` | Create migration file pair (up + down) |
| `/migrate` | Apply or rollback database migrations |
| `/docs-init` | Scaffold architecture documentation |
| `/security-scan` | Run security scan on .claude/ configs |

## 🔧 Hook Profiles

Set `CLAUDE_HOOK_PROFILE` environment variable:

| Profile | Behavior |
|---------|----------|
| `fast` | Only git safety + console.log warning |
| `standard` (default) | All core hooks + stack formatters |
| `strict` | Everything + go vet on every edit + stop verification |

## ❓ Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues, platform-specific guidance, and FAQ.

## 🛡️ Security Scanning

Scan your `.claude/` configurations for vulnerabilities with [AgentShield](https://github.com/affaan-m/agentshield):

```bash
npx ecc-agentshield scan          # Quick scan (102 rules)
npx ecc-agentshield scan --fix    # Auto-fix safe issues
```

Or use the built-in command: `/security-scan`

CI integration included — see `.github/workflows/security.yml`.

## 🏗️ Showcase

See [`packages/showcase/`](packages/showcase/) for a real production example — a production social app with 28 agents, 16 commands, 13 hooks, 11 skills, and 6 rules.

<details>
<summary>📖 Documentation (12 chapters + 3 examples)</summary>

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
| Agents / Skills | 31 agents | 41 skills (8 commands + 29 agents + 4 stack) |
| Commands | 11 (slash commands) | 8 (user-invocable skills) |
| Hooks | 16 + Stop | — (inline rules in AGENTS.md) |
| Rules | 6 (separate files) | Inline in AGENTS.md |
| Knowledge Skills | 3 + 1 extra | 3 (project-architecture, writing-agents, writing-commands) |
| Session continuity | Yes (hooks) | — |
| Subagent dispatch | Agent tool | spawn_agent |

`setup.sh` will ask: "Also install for Codex CLI?" — copies 41 skills and creates AGENTS.md + config.toml (`gpt-5.4`, `extra_high`).

See [Codex Installation Guide](packages/codex/INSTALL.md) for manual setup.

</details>

## ⚡ Using with Superpowers Plugin

This toolkit is **complementary** to the [Superpowers plugin](https://github.com/obra/superpowers):

- **superkit** = infrastructure (agents, hooks, commands, review pipeline)
- **superpowers** = process (TDD, debugging, brainstorming, verification)

Install both for the complete experience.

<details>
<summary>🧩 Recommended Companion Tools</summary>

### Skills (install separately)

| Skill | What | Link |
|-------|------|------|
| ui-ux-pro-max | Design system generation (161 rules, 71 styles, 73 fonts) | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| app-store-preflight | iOS/macOS App Store review validator | [GitHub](https://github.com/truongduy2611/app-store-preflight-skills) |
| app-store-screenshots | AI-generated App Store screenshots — device frames + marketing copy (3.2K stars) | [GitHub](https://github.com/ParthJadhav/app-store-screenshots) |

### MCP Servers (add to .mcp.json)

| Server | What | Package |
|--------|------|---------|
| 21st.dev magic | UI component search/generation | `@21st-dev/magic@latest` |
| shadcn | shadcn/ui component library | `shadcn-mcp@latest` |
| playwright | Browser automation/screenshots | Plugin (built-in) |
| context7 | Library docs lookup | Plugin (built-in) |

### Repos & Platforms

| Resource | What | Link |
|----------|------|------|
| Everything Claude Code | 28 agents, 125 skills, 60 commands — comprehensive harness performance system | [GitHub](https://github.com/affaan-m/everything-claude-code) |
| Get Shit Done (GSD) | 41K stars — meta-prompting framework with plan validation, goal-backward verification | [GitHub](https://github.com/gsd-build/get-shit-done) |
| Awesome MCP Servers | Curated list of MCP servers — 300+ servers across all categories | [GitHub](https://github.com/punkpeye/awesome-mcp-servers) |
| SkillsMP | 500K+ agent skills marketplace with search API | [skillsmp.com](https://skillsmp.com) |
| 21st.dev | AI agent deployment + community UI components | [21st.dev](https://21st.dev) |

</details>

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## 📄 License

MIT

---

<div align="center">

Made with ❤️ for the Claude Code community

</div>
