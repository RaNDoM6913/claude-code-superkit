# Codex CLI — Installation Guide

## Quick Install

### Option A: Via superkit installer (recommended)

```bash
bash setup.sh --codex
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

The default coordinator is **gpt-6-astra / high**, with **gpt-5.6-sol / medium** as the subagent fallback. For an existing configuration, merge the model and agent settings rather than replacing your custom settings. The installer preserves existing project config and approval rules; applying new defaults to an existing installation requires an explicit merge.

> **MCP hygiene:** `config.toml` can register MCP servers under `[mcp_servers.*]` (see the commented `playwright` / `context7` examples). Add them sparingly — every registered server costs tool-schema tokens on **every** turn and widens your supply-chain / attack surface. Before adding one, apply the two-part test: the integration must be universally useful *and* genuinely need a live, stateful session (a running browser, a long-lived connection). If it's really just a lookup or a one-shot command, a skill is the better shape. Pin every server you keep to a concrete version — never bare `@latest` — and note one line of rationale for why it earns its per-turn cost.

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

Track the project's non-secret `AGENTS.md` and `.codex/config.toml` so collaborators receive the same instructions and configuration. Instructions guide behavior; runtime permissions and approval rules provide separate controls. Do not commit credentials or machine-specific secrets.

## What Gets Installed

### 9 Command Skills (user-invocable)

| Skill | Description |
|-------|-------------|
| `dev-orchestrator` | 16-phase development cycle: read-docs, understand, architect, pseudocode, plan, contract, validate, implement, evaluate, verify, test, verify-goals, review, critic, document, report |
| `review-orchestrator` | Detect changes, gather git context, dispatch reviewer agents in parallel, collect and deduplicate findings |
| `audit-orchestrator` | Parallel audit across frontend, backend, infra, security |
| `test-runner` | Auto-detect project test runner and execute tests |
| `lint-runner` | Auto-detect linters, run with optional --fix mode |
| `commit-helper` | Conventional commit with secret detection |
| `new-migration` | Scaffold migration file pair with auto-numbering |
| `migrate` | Apply or rollback database migrations |
| `benchmark` | Run Go benchmarks with benchstat comparison |

### 36 Agent Skills (auto-dispatched by orchestrators)

These include converted core/extras roles and native GPT roles. The Astra-authored decision/acceptance group is `architect`, `plan-checker`, `evaluator`, `goal-verifier`, `critic`, and `reality-checker`. The delivery group is `minimal-change-engineer`, `codebase-onboarding-engineer`, `scaffold-endpoint`, and `ai-slop-cleaner`. `native-skills.txt` protects these ten roles and the dev/review callers (12 entries) from conversion overwrites. This is source ownership, not proof of behavioral acceptance. Dispatch depends on the task, user authorization, and available runtime tools. **v1.4.0 added 4 specialist roles:**

- `minimal-change-engineer` — surgical implementation, refuses scope creep
- `reality-checker` — checks readiness claims against applicable evidence and reports external blockers
- `codebase-onboarding-engineer` — task-focused repository brief with verified facts and explicit unknowns
- `behavioral-nudge-engine` — retention psychology, habit loops

| Skill | Category |
|-------|----------|
| `code-reviewer` | Quality — generic code review |
| `comment-rot-analyzer` | Quality |
| `security-scanner` | Security — OWASP top-10 + 18 generic checks |
| `silent-failure-hunter` | Quality |
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
| `goal-verifier` | Quality — 4-level goal substantiation, 3-state verdict (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION) |
| `evaluator` | Quality — calibrated QA scoring against Sprint Contract |
| `project-architecture` | Knowledge — project architecture reference |
| `ai-slop-cleaner` | Quality — detect and fix AI-generated code patterns |
| `critic` | Quality — multi-perspective final quality gate |
| `visual-reviewer` | Quality — UI consistency scoring, design system compliance |
| `tree-generator` | Productivity — generate project tree files |
| `writing-agents` | Knowledge — how to write agents |
| `writing-commands` | Knowledge — how to write command orchestrators |

### Frontend UI Skills (add for 2D UI / landing-page / dashboard projects)

```bash
# Umbrella + 5 specialist reviewers (auto-dispatched)
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-typography-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-color-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-motion-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-interaction-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-ui-design-critic .codex/skills/

# 1 opt-in craft skill (user-invocable — /impeccable-craft)
cp -r claude-code-superkit/packages/codex/skills/impeccable-craft .codex/skills/
```

### Frontend 3D Skills (add for R3F/Three.js/GSAP projects)

```bash
# 4 reviewer skills (auto-dispatched)
cp -r claude-code-superkit/packages/codex/skills/presentation-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/r3f-scene-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/ui-design-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/frontend-perf-reviewer .codex/skills/

# 6 knowledge skills (auto-activated by description matching)
cp -r claude-code-superkit/packages/codex/skills/threejs-color-management .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/r3f-scroll-driven-3d .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/gltf-debugging .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/html-to-3d-texture .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/product-3d-lighting .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/output-enforcement .codex/skills/
```

### Stack-Specific Reviewers (add per language)

Copy only the ones matching your stack:

```bash
# Go projects (6 reviewers: general + error, concurrency, performance, modernizer, observability)
cp -r claude-code-superkit/packages/codex/skills/go-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-error-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-concurrency-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-performance-reviewer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-modernizer .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-observability-reviewer .codex/skills/

# 5 Go knowledge skills (auto-activated by description matching — samber libs, gRPC, benchmarking)
cp -r claude-code-superkit/packages/codex/skills/go-samber-do .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-samber-oops .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-samber-lo .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-grpc-patterns .codex/skills/
cp -r claude-code-superkit/packages/codex/skills/go-benchmark .codex/skills/

# TypeScript projects
cp -r claude-code-superkit/packages/codex/skills/ts-reviewer .codex/skills/

# Python projects
cp -r claude-code-superkit/packages/codex/skills/py-reviewer .codex/skills/

# Rust projects
cp -r claude-code-superkit/packages/codex/skills/rs-reviewer .codex/skills/
```

### Total: 82 skills

- 9 command skills (user-invocable, including benchmark)
- 36 agent + knowledge skills (auto-dispatched) — incl. v1.4.0: minimal-change-engineer, reality-checker, codebase-onboarding-engineer, behavioral-nudge-engine
- 10 frontend 3D skills (optional, for R3F/Three.js/GSAP projects)
- 7 frontend UI skills (optional, for 2D UI / landing-page / dashboard projects)
- 9 stack-specific reviewer skills (optional, per language)
- 5 Go knowledge skills (optional, samber-do/oops/lo, grpc-patterns, benchmark-methodology)
- 6 TGApp / production skills (telegram-bot-builder, nextjs-supabase-auth, drizzle-orm-expert, ru-text, postgresql-optimization, redis-patterns)

Plus 1 Codex approval rules file (`packages/codex/rules/default.rules`) + 3 GAN agents (optional, requires Playwright).

## Model Configuration

The default `config.toml` separates coordinator and subagent models:

```toml
model = "gpt-6-astra"
model_reasoning_effort = "high"
web_search = "live"

[features]
multi_agent = true

[agents]
default_subagent_model = "gpt-5.6-sol"
default_subagent_reasoning_effort = "medium"
```

Skills are instructions used by the agent that loads them; skill frontmatter does not select the execution model. The agent defaults apply when a dispatch omits model or effort. Explicit task routing should select the intended model and effort, with substantive Sol review at `high` and critical decisions accepted by Astra. The supported effort levels and model availability depend on the installed runtime and account.

These settings were checked against Codex CLI `0.162.0-alpha.17.2` and the [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). They declare routing; they do not prove a live task ran on that model. Model behavioral acceptance remains pending. The owner-required Astra authorship rule for Superkit contributors is documented in [WORKING_AGREEMENT.md](../../docs/WORKING_AGREEMENT.md).

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

# Check coordinator and subagent defaults (or your preserved custom settings)
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
