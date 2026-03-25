# Claude Code — Detailed Installation Guide

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| git | Yes | System package manager |
| jq | Yes | `brew install jq` (macOS) / `sudo apt install jq` (Linux) |
| Claude Code CLI | Yes | `npm install -g @anthropic-ai/claude-code` |
| Plugins | Recommended | Auto-enabled by setup.sh: superpowers, github, context7, code-review. Install via Claude Code → `/plugins` |
| tree | Optional | `brew install tree` — nicer project tree generation |

## Option 1: Interactive Setup (recommended)

```bash
# Clone the superkit
git clone https://github.com/RaNDoM6913/claude-code-superkit.git

# Navigate to YOUR project (not the superkit!)
cd /path/to/your-project

# Run the installer
bash /path/to/claude-code-superkit/setup.sh
```

### What setup.sh does

1. **Checks prerequisites** — git, jq, Claude CLI
2. **Installs superpowers plugin** — auto-clones from GitHub if missing
3. **Handles existing .claude/** — merge (add new, skip existing), overwrite (backup + replace), or abort
4. **[1/4] Asks your stack** — Go, TypeScript, Python, Rust (multi-select)
5. **[2/4] Asks extras** — bot-reviewer, design-system-reviewer
6. **[3/4] Asks hook profile** — fast (minimal), standard (balanced), strict (everything)
7. **[4/4] Asks plugins** — 4 base (superpowers, github, context7, code-review) + 3 optional (code-simplifier, playwright, frontend-design)
8. **Copies files**:
   - 21 core agents → `.claude/agents/`
   - Up to 4 stack agents → `.claude/agents/`
   - 11 commands → `.claude/commands/`
   - 12+ hooks → `.claude/scripts/hooks/`
   - 6 rules → `.claude/rules/`
   - 3 skills → `.claude/skills/`
   - `settings.json` with hook wiring + enabledPlugins
   - `CLAUDE.md` template
9. **Scaffolds docs** (optional) — `docs/architecture/` templates + project tree
10. **Validates** — checks JSON, hook permissions, file presence
11. **Optionally installs for Codex CLI** — copies 37 skills to `.codex/skills/`

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

### 1. Fill in CLAUDE.md

Open `CLAUDE.md` and replace all `TODO:` placeholders with your project info:
- Tech stack table
- Project structure
- Key commands
- Conventions
- Architecture references

### 2. Fill in project-architecture skill

Edit `.claude/skills/project-architecture/SKILL.md` — describe your modules, layers, and data flow.

### 3. Set hook profile

Add to `~/.zshrc` or `~/.bashrc`:
```bash
export CLAUDE_HOOK_PROFILE=standard
```

### 4. Install plugins

Open Claude Code → type `/plugins` → install each enabled plugin:
- **superpowers** — TDD, brainstorming, debugging, verification
- **github** — PR comments, issue tracking
- **context7** — library documentation lookup
- **code-review** — enhanced code review workflows
- Plus any optional plugins you selected during setup

### 5. Verify

```bash
claude
# Then type: /review --full
# Expected: agents dispatched, findings report shown
```

## Updating

```bash
cd /path/to/claude-code-superkit
git pull

# Re-run setup.sh with merge mode
cd /path/to/your-project
bash /path/to/claude-code-superkit/setup.sh
# Choose [m] merge — adds new files, keeps your existing customizations
```

## Troubleshooting

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
