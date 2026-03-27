# Codex CLI — Installation Guide

## Quick Install

### Option A: Via superkit installer (recommended)

```bash
npx claude-code-superkit --codex
```

This installs both Claude Code and Codex CLI support in one command.

### Option B: Manual setup

### Step 1: Clone the superkit

```bash
git clone https://github.com/RaNDoM6913/claude-code-superkit.git
cd claude-code-superkit
```

### Step 2: Symlink skills into your project

```bash
# From your project root
mkdir -p .codex/skills

# Copy agent-based skills (auto-activated by description matching)
cp -r claude-code-superkit/packages/codex/skills/* .codex/skills/

# Or symlink for auto-updates
ln -s /path/to/claude-code-superkit/packages/codex/skills/* .codex/skills/
```

### Step 3: Copy config

```bash
# Project-level config
cp claude-code-superkit/packages/codex/config.toml .codex/config.toml

# Or global config (applies to all projects)
cp claude-code-superkit/packages/codex/config.toml ~/.codex/config.toml
```

The default model is **gpt-5.4** with **extra_high** reasoning effort (maximum). Edit `config.toml` to change.

### Step 4: Set up AGENTS.md

```bash
# Copy the template
cp claude-code-superkit/packages/codex/AGENTS.md ./AGENTS.md

# Edit AGENTS.md to fill in your project details:
# - Project name and description
# - Tech stack
# - Project structure
# - Key commands
# - Conventions
# - Architecture references
```

> ⚠️ **Critical:** `AGENTS.md` and `.codex/config.toml` MUST be tracked in git. These files are Codex's enforcement mechanism (documentation rules, coding standards, architecture references). If they're not committed, anyone who clones the repo gets zero enforcement. Unlike Claude Code which uses hook scripts, Codex relies entirely on these files for project context.

## What Gets Installed

### 8 Command Skills (user-invocable)

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | Full development cycle: understand, plan, implement, verify, test, review, document |
| `review-orchestrator` | Detect changes, dispatch reviewers, **double-verify** findings, collect report |
| `audit-orchestrator` | Parallel audit across frontend, backend, infra, security |
| `test-runner` | Auto-detect project test runner and execute tests |
| `lint-runner` | Auto-detect linters, run with optional --fix mode |
| `commit-helper` | Conventional commit with secret detection |
| `new-migration` | Scaffold migration file pair with auto-numbering |
| `migrate` | Apply or rollback database migrations |

### 29 Agent Skills (auto-dispatched by orchestrators)

These are converted from core + extras agents. They are dispatched automatically by orchestrator skills (dev, review, audit) based on file patterns and project stack:

| Skill | Category |
|-------|----------|
| `code-reviewer` | Quality — generic code review |
| `security-scanner` | Security — OWASP + 47 checks |
| `audit-frontend` | Audit — frontend code quality (15 checks) |
| `audit-backend` | Audit — backend code quality (15 checks) |
| `audit-infra` | Audit — infrastructure security (12 checks) |
| `migration-reviewer` | Quality — SQL migration review |
| `test-generator` | Productivity — generate tests |
| `e2e-test-generator` | Productivity — Playwright/Cypress tests |
| `health-checker` | DevOps — compilation checks |
| `pre-deploy-validator` | DevOps — pre-deploy checklist (9 points) |
| `dependency-checker` | DevOps — dependency audit |
| `debug-observer` | Observability — debug analysis |
| `docs-reviewer` | Quality — documentation freshness, accuracy, coverage |
| `api-contract-sync` | Quality — API spec ↔ routes sync |
| `scaffold-endpoint` | Productivity — new endpoint scaffolding |
| `ui-reviewer` | Quality — UI/UX design system review |
| `bot-reviewer` | Quality — bot code review (Telegram/Discord/Slack) |
| `design-system-reviewer` | Quality — design system compliance |
| `database-reviewer` | Quality — PostgreSQL specialist |
| `architect` | Quality — system design advisor |
| `plan-checker` | Quality — 8-dimension plan validation |
| `goal-verifier` | Quality — 4-level goal substantiation |
| `project-architecture` | Knowledge — project architecture reference |
| `ai-slop-cleaner` | Quality — detect and fix AI-generated code patterns |
| `critic` | Quality — multi-perspective final quality gate |
| `visual-reviewer` | Quality — UI consistency scoring, design system compliance |
| `tree-generator` | Productivity — generate project tree files |
| `writing-agents` | Knowledge — how to write agents |
| `writing-commands` | Knowledge — how to write command orchestrators |

### Stack-Specific Reviewers (add per language)

Copy only the ones matching your stack:

```bash
# Go projects
cp -r claude-code-superkit/packages/codex/skills/go-reviewer .codex/skills/

# TypeScript projects
cp -r claude-code-superkit/packages/codex/skills/ts-reviewer .codex/skills/

# Python projects
cp -r claude-code-superkit/packages/codex/skills/py-reviewer .codex/skills/

# Rust projects
cp -r claude-code-superkit/packages/codex/skills/rs-reviewer .codex/skills/
```

### Total: up to 41 skills

- 8 command skills (user-invocable)
- 29 agent + knowledge skills (auto-dispatched)
- 4 stack-specific reviewer skills (optional, per language)

## Model Configuration

The default `config.toml` uses **gpt-5.4** with **extra_high** reasoning — maximum performance:

```toml
model = "gpt-5.4"
model_reasoning_effort = "extra_high"
```

Available reasoning levels: `low`, `medium`, `high`, `extra_high`. We use `extra_high` for maximum accuracy.

All skills inherit this model. Unlike Claude Code (where each agent has its own `model:` field), Codex uses a single global model from config.toml.

## What's NOT Available in Codex

Codex CLI does not support these Claude Code features:

| Feature | Claude Code | Codex | Workaround |
|---------|-------------|-------|------------|
| **Hooks** | Pre/PostToolUse, Stop, UserPromptSubmit | Not supported | Inline checks in AGENTS.md rules |
| **Session continuity** | SessionStart hook restores context | Not supported | Rely on AGENTS.md for context |
| **Stop verification** | Auto-verifies compile + docs before end | Not supported | Manually run lint/test skills |
| **Format-on-edit** | Auto-formats after file edits | Not supported | Run lint-runner with --fix |
| **Doc-check-on-commit** | Warns when committing without docs | Not supported | Documentation rule in AGENTS.md |
| **Migration safety hook** | Auto-validates migration naming | Not supported | migration-reviewer skill checks post-hoc |
| **Bundle import check** | Warns on missing package.json deps | Not supported | dependency-checker skill |
| **Hook profiles** | fast/standard/strict profiles | Not supported | Single configuration via AGENTS.md |

## Verification

After installation, verify your setup:

```bash
# Check AGENTS.md exists
ls -la AGENTS.md

# Check skills are installed
ls .codex/skills/

# Check config (should show gpt-5.4)
cat .codex/config.toml

# Run Codex to test
codex "List the available skills and summarize the project"
```

## Updating

To update skills when the superkit is updated:

```bash
# If using symlinks — already auto-updated via git pull on superkit

# If using copies
cd /path/to/claude-code-superkit
git pull

# Re-copy skills
cp -r packages/codex/skills/* /path/to/your-project/.codex/skills/
```
