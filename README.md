# claude-code-superkit

Production-tested agents, commands, hooks & skills for [Claude Code](https://claude.ai/claude-code). Battle-tested in production apps with 60+ endpoints, 21 agents, and 48 database migrations.

## What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| **Core Agents** | 17 | Code review, security scan, testing, audit, debugging, health checks, tree generation |
| **Stack Agents** | 4 | Go, TypeScript, Python, Rust specific reviewers |
| **Extra Agents** | 2 | Bot reviewer (Telegram/Discord/Slack), design system reviewer |
| **Commands** | 9 | `/dev`, `/review`, `/audit`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit`, `/docs-init` |
| **Hooks** | 7 + Stop | Git safety, format-on-edit, typecheck, context injection, session continuity |
| **Rules** | 4 | Coding style, security, git workflow, documentation |
| **Skills** | 3 | Project architecture template, writing-agents guide, writing-commands guide |

## Quick Start

### Option 1: Interactive Setup

```bash
git clone https://github.com/RaNDoM6913/claude-code-superkit.git
cd your-project/
bash /path/to/claude-code-superkit/setup.sh
```

The installer will ask you to select your stack (Go, TypeScript, Python, Rust) and hook profile (fast/standard/strict).

### Option 2: Manual Copy

```bash
# Copy core files
cp -r /path/to/claude-code-superkit/packages/core/agents/ .claude/agents/
cp -r /path/to/claude-code-superkit/packages/core/commands/ .claude/commands/
cp -r /path/to/claude-code-superkit/packages/core/hooks/ .claude/scripts/hooks/
cp -r /path/to/claude-code-superkit/packages/core/rules/ .claude/rules/
cp -r /path/to/claude-code-superkit/packages/core/skills/ .claude/skills/
cp /path/to/claude-code-superkit/packages/core/settings.json .claude/settings.json
cp /path/to/claude-code-superkit/packages/core/CLAUDE.md ./CLAUDE.md

# Add stack-specific files (example: Go + TypeScript)
cp packages/stack-agents/go/go-reviewer.md .claude/agents/
cp packages/stack-agents/typescript/ts-reviewer.md .claude/agents/
cp packages/stack-hooks/go/*.sh .claude/scripts/hooks/
cp packages/stack-hooks/typescript/*.sh .claude/scripts/hooks/

# Make hooks executable
chmod +x .claude/scripts/hooks/*.sh
```

### After Installation

1. Edit `CLAUDE.md` — fill in your project details (replace TODO placeholders)
2. Edit `.claude/skills/project-architecture/SKILL.md` — describe your architecture
3. Run `claude` and try: `/review`, `/audit`, `/test`

## Key Commands

| Command | What it does |
|---------|-------------|
| `/dev <task>` | 8-phase orchestrator: understand → plan → implement → verify → test → review → document → report |
| `/review` | Detect changed files → dispatch reviewer agents → unified report |
| `/audit` | Parallel audit: up to 4 agents (frontend, backend, infra, security) |
| `/test` | Auto-detect stack and run tests |
| `/lint` | Auto-detect stack and run linters |
| `/commit` | Conventional commit with secret scanning |

## Hook Profiles

Set `CLAUDE_HOOK_PROFILE` environment variable:

| Profile | Behavior |
|---------|----------|
| `fast` | Only git safety + console.log warning |
| `standard` (default) | All core hooks + stack formatters |
| `strict` | Everything + go vet on every edit + stop verification |

## Documentation

### Guide (11 chapters)

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

### Examples

| Example | What you build |
|---------|---------------|
| [Agent from Scratch](docs/examples/agent-from-scratch.md) | Dockerfile reviewer agent (10 checks) |
| [Command Orchestrator](docs/examples/command-orchestrator.md) | /deploy command with 4 phases |
| [Hook Pipeline](docs/examples/hook-pipeline.md) | Format + lint on every edit |

## Showcase

See [`packages/showcase/`](packages/showcase/) for a real production example — a production social app with 21 agents, 14 commands, 11 hooks, 11 skills, and 3 rules.

## Codex CLI Support

superkit works with both **Claude Code** and **OpenAI Codex CLI**:

| Feature | Claude Code | Codex CLI |
|---------|:-:|:-:|
| Agents (as skills) | 23 | 23 |
| Commands / Orchestrators | 9 (slash commands) | 9 (user-invocable skills) |
| Hooks (auto-format, auto-lint) | 12 | — |
| Rules | 4 (separate files) | Inline in AGENTS.md |
| Skills | 3 | 3 |
| Session continuity | Yes | — |
| Subagent dispatch | Agent tool | spawn_agent |

`setup.sh` will ask: "Also install for Codex CLI?" — symlinks skills and creates AGENTS.md + config.toml.

See [Codex Installation Guide](packages/codex/INSTALL.md) for manual setup.

## Using with Superpowers Plugin

This toolkit is **complementary** to the [Superpowers plugin](https://github.com/obra/superpowers):

- **superkit** = infrastructure (agents, hooks, commands, review pipeline)
- **superpowers** = process (TDD, debugging, brainstorming, verification)

Install both for the complete experience.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## License

MIT
