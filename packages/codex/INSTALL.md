# Codex CLI — Installation Guide

## Quick Install

### Step 1: Clone the superkit

```bash
git clone https://github.com/YOUR_ORG/claude-code-superkit.git
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

## What Gets Installed

### 8 Command Skills (user-invocable)

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | Full development cycle: understand, plan, implement, verify, test, review, document |
| `review-orchestrator` | Detect changes, dispatch reviewers in parallel, collect findings |
| `audit-orchestrator` | Parallel audit across frontend, backend, infra, security |
| `test-runner` | Auto-detect project test runner and execute tests |
| `lint-runner` | Auto-detect linters, run with optional --fix mode |
| `commit-helper` | Conventional commit with secret detection |
| `new-migration` | Scaffold migration file pair with auto-numbering |
| `migrate` | Apply or rollback database migrations |

### 16 Agent Skills (auto-dispatched by orchestrators)

These are converted from core agents. They are dispatched automatically by orchestrator skills (dev, review, audit) based on file patterns and project stack:

| Skill | Category |
|-------|----------|
| `code-reviewer` | Quality — generic code review |
| `security-scanner` | Security — OWASP + 18 checks |
| `audit-frontend` | Audit — frontend code quality |
| `audit-backend` | Audit — backend code quality |
| `audit-infra` | Audit — infrastructure security |
| `migration-reviewer` | Quality — SQL migration review |
| `test-generator` | Productivity — generate tests |
| `e2e-test-generator` | Productivity — Playwright/Cypress tests |
| `health-checker` | DevOps — compilation checks |
| `pre-deploy-validator` | DevOps — pre-deploy checklist |
| `dependency-checker` | DevOps — dependency audit |
| `debug-observer` | Observability — debug analysis |
| `docs-checker` | Quality — documentation completeness |
| `api-contract-sync` | Quality — API spec sync |
| `scaffold-endpoint` | Productivity — new endpoint scaffolding |
| `ui-reviewer` | Quality — UI/UX review |

### Stack-Specific Agents (add from stack-agents/)

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

### Total: up to 28 skills

- 8 command skills (user-invocable)
- 16 core agent skills (auto-dispatched)
- 4 stack-specific agent skills (optional, per language)

## What's NOT Available in Codex

Codex CLI does not support these Claude Code features:

| Feature | Claude Code | Codex | Workaround |
|---------|-------------|-------|------------|
| **Hooks** | Pre/PostToolUse, Stop, UserPromptSubmit | Not supported | Inline checks in AGENTS.md rules |
| **Session continuity** | SessionStart hook restores context | Not supported | Rely on AGENTS.md for context |
| **Stop verification** | Auto-verifies compile + docs before end | Not supported | Manually run lint/test skills |
| **Format-on-edit** | Auto-formats after file edits | Not supported | Run lint-runner with --fix |
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

# Check config
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

### Re-generate agent skills from latest core agents

```bash
# Run the conversion script to regenerate all agent skills
bash /path/to/claude-code-superkit/tools/convert-agents-to-codex-skills.sh
```

This reads `packages/core/agents/*.md` and regenerates `packages/codex/skills/*/SKILL.md` with Codex-compatible frontmatter.
