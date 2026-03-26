# Claude Code — Detailed Installation Guide

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| git | Yes | System package manager |
| Node.js 18+ | Yes | [nodejs.org](https://nodejs.org) or `brew install node` |
| Claude Code CLI | Yes | `npm install -g @anthropic-ai/claude-code` |
| Plugins | Recommended | Auto-enabled by setup.sh: superpowers, github, context7, code-review. Install via Claude Code → `/plugins` |
| tree | Optional | `brew install tree` — nicer project tree generation |

## Option 1: npx (recommended)

```bash
npx claude-code-superkit
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--stacks=go,typescript` | Pre-select language stacks |
| `--profile=strict` | Set hook profile (fast/standard/strict) |
| `--extras=bot-reviewer` | Include extra agents |
| `--codex` | Also install Codex CLI support |
| `--no-docs` | Skip doc scaffolding |
| `--no-superpowers` | Skip superpowers plugin |
| `--defaults` | Non-interactive mode for CI/CD |

### What the installer does

1. **Checks prerequisites** — Node.js 18+, git, Claude CLI
2. **Installs superpowers plugin** — auto-clones from GitHub if missing
3. **Handles existing .claude/** — merge (add new, skip existing), overwrite (backup + replace), or abort
4. **[1/4] Asks your stack** — Go, TypeScript, Python, Rust (multi-select)
5. **[2/4] Asks extras** — bot-reviewer, design-system-reviewer
6. **[3/4] Asks hook profile** — fast (minimal), standard (balanced), strict (everything)
7. **[4/4] Asks plugins** — 4 base (superpowers, github, context7, code-review) + 3 optional (code-simplifier, playwright, frontend-design)
8. **Copies files**:
   - 24 core agents → `.claude/agents/`
   - Up to 4 stack agents → `.claude/agents/`
   - 13 commands → `.claude/commands/`
   - 13+ hooks → `.claude/scripts/hooks/`
   - 6 rules → `.claude/rules/`
   - 4 skills → `.claude/skills/`
   - `settings.json` with hook wiring + enabledPlugins
   - `CLAUDE.md` template
9. **Scaffolds docs** (optional) — `docs/architecture/` templates + project tree
10. **Validates** — checks JSON, hook permissions, file presence
11. **Optionally installs for Codex CLI** — copies 41 skills to `.codex/skills/`

### Hook Profiles

| Profile | What runs | Best for |
|---------|-----------|----------|
| `fast` | Git safety + console.log warning | Quick iteration, large diffs |
| `standard` | All core + stack hooks | Daily development (default) |
| `strict` | Everything + go vet/cargo check per edit | Pre-release, critical code |

Set in your shell: `export CLAUDE_HOOK_PROFILE=standard`

## Option 2: Manual Copy

```bash
# Set path to your cloned superkit
SUPERKIT="/path/to/claude-code-superkit"

# Core (required)
mkdir -p .claude/{agents,commands,scripts/hooks,rules,skills}
cp $SUPERKIT/packages/core/agents/*.md .claude/agents/
cp $SUPERKIT/packages/core/commands/*.md .claude/commands/
cp $SUPERKIT/packages/core/hooks/*.sh .claude/scripts/hooks/
cp $SUPERKIT/packages/core/rules/*.md .claude/rules/
cp -r $SUPERKIT/packages/core/skills/*/ .claude/skills/
cp $SUPERKIT/packages/core/settings.json .claude/settings.json
cp $SUPERKIT/packages/core/CLAUDE.md ./CLAUDE.md

# Stack agents (pick your languages)
cp $SUPERKIT/packages/stack-agents/go/go-reviewer.md .claude/agents/
cp $SUPERKIT/packages/stack-agents/typescript/ts-reviewer.md .claude/agents/
# cp $SUPERKIT/packages/stack-agents/python/py-reviewer.md .claude/agents/
# cp $SUPERKIT/packages/stack-agents/rust/rs-reviewer.md .claude/agents/

# Stack hooks (pick your languages)
cp $SUPERKIT/packages/stack-hooks/go/*.sh .claude/scripts/hooks/
cp $SUPERKIT/packages/stack-hooks/typescript/*.sh .claude/scripts/hooks/

# Extras (optional)
# cp $SUPERKIT/packages/extras/bot-reviewer.md .claude/agents/
# cp $SUPERKIT/packages/extras/design-system-reviewer.md .claude/agents/
# cp $SUPERKIT/packages/extras/red-blue-auditor.md .claude/agents/

# Make hooks executable
chmod +x .claude/scripts/hooks/*.sh
```

## Post-Installation

### 1. Set hook profile

Add to `~/.zshrc` or `~/.bashrc`:
```bash
export CLAUDE_HOOK_PROFILE=standard
```

### 2. Install plugins

Open Claude Code → type `/plugins` → install each enabled plugin:
- **superpowers** — TDD, brainstorming, debugging, verification
- **github** — PR comments, issue tracking
- **context7** — library documentation lookup
- **code-review** — enhanced code review workflows
- Plus any optional plugins you selected during setup

### 3. Run `/superkit-init` (recommended)

```bash
claude
# Then type:
/superkit-init
```

This scans your codebase and **auto-generates filled documentation**:

| What it generates | From what |
|-------------------|-----------|
| `CLAUDE.md` (populated) | README, go.mod/package.json, Makefile |
| `docs/architecture/*.md` (filled) | Actual source code analysis |
| `docs/trees/*.md` | `tree` command on your project |
| `.claude/rules/` (configured) | Real project file paths |

**No more manual TODO filling.** The command reads your code and writes docs for you.

Options:
- `--non-interactive` — skip all checkpoints, generate everything automatically
- Scaffold Mode — for empty projects, asks your stack and creates minimal structure

### 4. Verify

```bash
# In Claude Code:
/review --full
# Expected: agents dispatched, findings report shown
```

### 5. Keep docs fresh with `/superkit-evolve`

Run anytime to detect and fix documentation drift:
```bash
/superkit-evolve
```

Detects: migration counter drift, missing docs for new components, stale trees, broken rule paths. Use `--fix-all` for automatic fixing.

The `evolve-check` hook also runs at session start (every 24h) and suggests `/superkit-evolve` if drift is detected.

## Updating

```bash
# Just re-run:
npx claude-code-superkit@latest
# Choose [m] merge — adds new files, keeps your existing customizations
```

## Troubleshooting

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
