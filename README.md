# claude-code-superkit

Production-tested agents, commands, hooks & skills for [Claude Code](https://claude.ai/claude-code). Extracted and generalized from a real Telegram Mini App with 60+ endpoints, 21 agents, and 48 database migrations.

## What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| **Core Agents** | 16 | Code review, security scan, testing, audit, debugging, health checks |
| **Stack Agents** | 4 | Go, TypeScript, Python, Rust specific reviewers |
| **Extra Agents** | 2 | Bot reviewer (Telegram/Discord/Slack), design system reviewer |
| **Commands** | 8 | `/dev`, `/review`, `/audit`, `/test`, `/lint`, `/migrate`, `/new-migration`, `/commit` |
| **Hooks** | 7 + Stop | Git safety, format-on-edit, typecheck, context injection, session continuity |
| **Rules** | 3 | Coding style, security, git workflow |
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

## Showcase

See `packages/showcase/` for a real production example — a Telegram dating app with 21 agents, 14 commands, 11 hooks, 11 skills, and 3 rules.

## Using with Superpowers Plugin

This toolkit is **complementary** to the [Superpowers plugin](https://github.com/obra/superpowers):

- **superkit** = infrastructure (agents, hooks, commands, review pipeline)
- **superpowers** = process (TDD, debugging, brainstorming, verification)

Install both for the complete experience.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new stacks, agents, and hooks.

## License

MIT
