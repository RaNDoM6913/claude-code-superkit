# Chapter 1: Getting Started

## What is claude-code-superkit?

claude-code-superkit is a collection of production-tested agents, commands, hooks, rules, and skills for Claude Code. It gives Claude structured review processes, automated safety checks, and orchestrated development workflows out of the box. Extracted from a real monorepo with 68+ endpoints and 50 database migrations, every component has been battle-tested against real code.

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

The installer walks you through four steps:

1. **[1/4] Stack selection** — Go, TypeScript, Python, Rust (pick any combination)
2. **[2/4] Extras** — bot reviewer, design system reviewer
3. **[3/4] Hook profile** — fast, standard, or strict
4. **[4/4] Plugins** — 4 base (superpowers, github, context7, code-review) + 3 optional

It copies the right files into `.claude/`, builds `settings.json` with plugins, and creates a starter `CLAUDE.md`.

**After setup.sh finishes, run `/superkit-init` in Claude Code** — it scans your codebase and auto-fills CLAUDE.md, architecture docs, and rules with your real project paths. No more manual TODO filling.

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
| `/superkit-init` | Scan codebase → generate filled docs → configure rules with real paths |
| `/dev <task>` | Full 12-phase orchestrator: understand, plan, implement, cleanup, verify, test, review, critic, document, report |
| `/commit` | Analyzes changes, scans for secrets, creates a conventional commit |

## Verify Installation

After setup, confirm everything landed correctly:

```bash
# Expected: 24+ core + stack agents
ls .claude/agents/*.md | wc -l

# Expected: 13 commands
ls .claude/commands/*.md | wc -l

# Expected: 12+ core + stack hooks
ls .claude/scripts/hooks/*.sh | wc -l

# Expected: 6 rules
ls .claude/rules/*.md | wc -l

# Expected: 4 skill directories
ls .claude/skills/*/SKILL.md | wc -l

# settings.json exists with hook wiring + plugins
cat .claude/settings.json | jq '.hooks | keys'
cat .claude/settings.json | jq '.enabledPlugins | keys'
```

## Next Steps

1. Run `/superkit-init` in Claude Code — auto-generates filled CLAUDE.md and architecture docs from your code
2. Install plugins: `/plugins` → install superpowers, github, context7, code-review
3. Set your hook profile: `export CLAUDE_HOOK_PROFILE=standard`
4. Try `/review --full` or `/dev <task>`
5. Read Chapter 2 to understand how the component types work together
