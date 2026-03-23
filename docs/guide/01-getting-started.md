# Chapter 1: Getting Started

## What is claude-code-superkit?

claude-code-superkit is a collection of production-tested agents, commands, hooks, rules, and skills for Claude Code. It gives Claude structured review processes, automated safety checks, and orchestrated development workflows out of the box. Extracted from a real monorepo with 60+ endpoints and 48 database migrations, every component has been battle-tested against real code.

## Prerequisites

Before installing, make sure you have:

| Tool | Why | Install |
|------|-----|---------|
| **Claude Code CLI** | The runtime that loads `.claude/` configuration | `npm install -g @anthropic-ai/claude-code` |
| **git** | Hooks and commands rely on git state | Comes with Xcode CLI tools / your OS |
| **jq** | Hooks parse JSON on stdin; setup.sh assembles settings.json | `brew install jq` (macOS) or `apt install jq` (Linux) |

## 5-Minute Quickstart

```bash
# 1. Clone the superkit somewhere on your machine
git clone https://github.com/RaNDoM6913/claude-code-superkit.git ~/claude-code-superkit

# 2. Navigate to your project
cd /path/to/your-project

# 3. Run the interactive installer
bash ~/claude-code-superkit/setup.sh
```

The installer walks you through three choices:

1. **Stack selection** -- Go, TypeScript, Python, Rust (pick any combination)
2. **Extras** -- bot reviewer, design system reviewer
3. **Hook profile** -- fast, standard, or strict

It copies the right files into `.claude/`, builds `settings.json`, and creates a starter `CLAUDE.md`.

## Manual Installation

If you prefer full control, copy files directly:

```bash
PROJECT=.claude
SUPERKIT=~/claude-code-superkit/packages

# Core components
cp -r $SUPERKIT/core/agents/   $PROJECT/agents/
cp -r $SUPERKIT/core/commands/ $PROJECT/commands/
cp -r $SUPERKIT/core/rules/    $PROJECT/rules/
cp -r $SUPERKIT/core/skills/   $PROJECT/skills/
mkdir -p $PROJECT/scripts/hooks
cp $SUPERKIT/core/hooks/*.sh   $PROJECT/scripts/hooks/
cp $SUPERKIT/core/settings.json $PROJECT/settings.json

# Stack-specific (example: Go + TypeScript)
cp $SUPERKIT/stack-agents/go/go-reviewer.md        $PROJECT/agents/
cp $SUPERKIT/stack-agents/typescript/ts-reviewer.md $PROJECT/agents/
cp $SUPERKIT/stack-hooks/go/*.sh                    $PROJECT/scripts/hooks/
cp $SUPERKIT/stack-hooks/typescript/*.sh            $PROJECT/scripts/hooks/

# Make hooks executable
chmod +x $PROJECT/scripts/hooks/*.sh

# Starter CLAUDE.md
cp $SUPERKIT/core/CLAUDE.md ./CLAUDE.md
```

After manual install, edit `settings.json` to wire stack hooks into the `PostToolUse` array (see Chapter 5 for the format).

## First Commands to Try

Launch Claude Code in your project and try these:

| Command | What happens |
|---------|-------------|
| `/review` | Detects changed files, dispatches matching reviewer agents, produces a unified report |
| `/audit` | Runs up to 4 audit agents in parallel (frontend, backend, infra, security) |
| `/test` | Auto-detects your test runner and executes tests |
| `/dev <task>` | Full 8-phase orchestrator: understand, plan, implement, verify, test, review, document, report |
| `/commit` | Analyzes changes, scans for secrets, creates a conventional commit |

## Verify Installation

After setup, confirm everything landed correctly:

```bash
# Expected: 16 core + stack agents
ls .claude/agents/*.md | wc -l

# Expected: 8 commands
ls .claude/commands/*.md | wc -l

# Expected: 7 core + stack hooks
ls .claude/scripts/hooks/*.sh | wc -l

# Expected: 3 rules
ls .claude/rules/*.md | wc -l

# Expected: 3 skill directories
ls .claude/skills/*/SKILL.md | wc -l

# settings.json exists with hook wiring
cat .claude/settings.json | jq '.hooks | keys'
```

## Next Steps

1. Edit `CLAUDE.md` -- replace the TODO placeholders with your project's stack, structure, and conventions
2. Edit `.claude/skills/project-architecture/SKILL.md` -- describe your architecture so agents have context
3. Set your hook profile: `export CLAUDE_HOOK_PROFILE=standard`
4. Read Chapter 2 to understand how the five component types work together
