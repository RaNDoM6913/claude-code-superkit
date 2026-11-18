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
bash setup.sh
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--stacks=go,typescript` | Pre-select stacks (go, typescript, python, rust, frontend-3d, frontend-ui); unknown names are rejected before anything is written |
| `--profile=strict` | Set hook profile (fast/standard/strict) — written to `.claude/settings.json` → `env.CLAUDE_HOOK_PROFILE` |
| `--extras=bot-reviewer` | Include extra agents (bot-reviewer, design-system-reviewer, red-blue-auditor); unknown names are rejected |
| `--codex` | Also install Codex CLI support |
| `--no-docs` | Skip doc scaffolding |
| `--no-superpowers` | Skip superpowers plugin |
| `--defaults` | Non-interactive mode for CI/CD (an existing `.claude/` is merged) |

### What the installer does

1. **Checks prerequisites** — Node.js 18+, git, Claude CLI
2. **Installs superpowers plugin** — auto-clones from GitHub if missing
3. **Handles existing .claude/** — merge (add new, skip existing), overwrite (backup to `.claude.bak/` + replace), or abort. Merge never rebuilds `settings.json` from defaults: your keys and values win, superkit only adds missing hooks (deduped by matcher + command), plugins (an existing `true`/`false` is kept) and `env.CLAUDE_HOOK_PROFILE` (kept if you already set it); the previous file is saved as `.claude/settings.json.bak-<timestamp>`, and an invalid `settings.json` is left untouched with a warning. Existing permissions are never changed.
4. **[1/4] Asks your stack** — Go, TypeScript, Python, Rust, Frontend 3D, Frontend UI (multi-select)
5. **[2/4] Asks extras** — bot-reviewer, design-system-reviewer (red-blue-auditor is flag-only via `--extras=red-blue-auditor`, which also installs its `scan.sh` + `patterns/` in `.claude/scripts/red-blue-auditor/`)
6. **[3/4] Asks hook profile** — fast (minimal), standard (balanced), strict (everything); the default is a valid `CLAUDE_HOOK_PROFILE` already exported in your shell, else standard
7. **[4/4] Asks plugins** — 4 base (superpowers, github, context7, code-review) + 3 optional (code-simplifier, playwright, frontend-design)
8. **Copies files**:
   - 31 core agents + up to 22 stack/package agents (9 stack + 4 frontend-3d + 6 frontend-ui + 3 extras) → `.claude/agents/`. `ui-reviewer.md` exists in core and in frontend-ui; exactly one is installed (the frontend-ui umbrella when Frontend UI is selected, otherwise core). In merge mode an existing unmodified superkit copy is refreshed (same variant) or upgraded from core to the umbrella; an umbrella is never downgraded to core, and a customised copy is kept and reported as a conflict
   - 16 commands (15 core + 1 frontend-3d) → `.claude/commands/`
   - 26 core hooks + up to 16 stack/package hooks (9 stack + 4 frontend-3d + 3 frontend-ui) → `.claude/scripts/hooks/`
   - 7 rules + up to 12 stack/package rules (2 stack + 3 frontend-3d + 7 frontend-ui) → `.claude/rules/`
   - 11 core skills + up to 7 package skills (6 frontend-3d + 1 frontend-ui) → `.claude/skills/`
   - `settings.json` with hook wiring (stack/package hooks go into the `PostToolUse` group whose matcher covers `Edit` and `Write`) + enabledPlugins + `env.CLAUDE_HOOK_PROFILE`
   - `CLAUDE.md` template
9. **Scaffolds docs** (optional) — `docs/architecture/` templates + project tree
10. **Validates** — checks JSON, hook permissions, file presence
11. **Optionally installs for Codex CLI** — copies 83 skills to `.codex/skills/`

### Hook Profiles

| Profile | What runs | Best for |
|---------|-----------|----------|
| `fast` | Critical safety only: git guard, secret scan, settings audit, doc-check commit gate | Quick iteration, large diffs |
| `standard` | All core + stack hooks | Daily development (default) |
| `strict` | Everything + go vet/cargo check per edit | Pre-release, critical code |

The installer writes your choice to `.claude/settings.json` → `env.CLAUDE_HOOK_PROFILE`. Claude Code applies settings `env` over the shell in most sessions, so change the profile there (or, for yourself only, in `.claude/settings.local.json`) rather than with a shell `export`. See [Chapter 15](guide/15-env-vars-and-hook-profiles.md).

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
# cp $SUPERKIT/packages/extras/red-blue-auditor/agent.md .claude/agents/red-blue-auditor.md
# mkdir -p .claude/scripts/red-blue-auditor && cp -R $SUPERKIT/packages/extras/red-blue-auditor/scan.sh $SUPERKIT/packages/extras/red-blue-auditor/patterns .claude/scripts/red-blue-auditor/

# Make hooks executable
chmod +x .claude/scripts/hooks/*.sh
```

## Post-Installation

### 1. Check the hook profile

The installer already pinned it in `.claude/settings.json`:
```bash
jq -r '.env.CLAUDE_HOOK_PROFILE' .claude/settings.json   # fast | standard | strict
```
To change it, edit that value (or set `env.CLAUDE_HOOK_PROFILE` in `.claude/settings.local.json` for a personal override).

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
bash setup.sh
# Choose [m] merge — adds new files, keeps your existing customizations
```

Merge adds missing files and merges `settings.json`; it does not refresh files you already have (apart from refreshing or upgrading an unmodified `ui-reviewer.md`, see above). Unmodified superkit files are refreshed by the `superkit-update.sh` SessionStart hook when `.claude/.superkit-meta` points at a superkit clone with a newer `VERSION`: it covers core, stack, the selected frontend-ui / frontend-3d packages and the recorded extras (including `.claude/scripts/red-blue-auditor/`), and preserves and lists every file you customised.

## Troubleshooting

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
