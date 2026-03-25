# claude-code-superkit — Design Specification

**Date:** 2026-03-23
**Status:** Reviewed (v3 — all issues resolved)
**Author:** Ivan Kudzin + Claude Opus 4.6

## 1. Overview

**claude-code-superkit** — open-source монорепо с полным набором agents, commands, hooks, rules и skills для Claude Code. Проект извлекает и обобщает production-tested инфраструктуру из TGApp (Telegram Dating Mini App) в переиспользуемый toolkit.

### Goals

1. **Education** — 9-chapter гайд "как построить систему из 16 core агентов, 8 команд, 7 core хуков + Stop gate"
2. **Starter Kit** — готовый набор core + stack-specific компонентов с `setup.sh` установщиком
3. **Showcase** — реальный production пример (TGApp) как proof-of-concept
4. **Customization** — мета-скиллы (writing-agents, writing-commands) для создания своих компонентов

### Non-Goals

- CLI npm-пакет (overkill для v1)
- Framework lock-in (всё работает copy-paste)
- Дублирование superpowers plugin (complementary, not competing)

## 2. Monorepo Structure

```
claude-code-superkit/
│
├── packages/
│   ├── core/                          # Ядро — устанавливается всегда
│   │   ├── agents/                    # 16 universal agents
│   │   │   ├── code-reviewer.md
│   │   │   ├── ui-reviewer.md
│   │   │   ├── migration-reviewer.md
│   │   │   ├── api-contract-sync.md
│   │   │   ├── security-scanner.md
│   │   │   ├── audit-frontend.md
│   │   │   ├── audit-backend.md
│   │   │   ├── audit-infra.md
│   │   │   ├── test-generator.md
│   │   │   ├── e2e-test-generator.md
│   │   │   ├── scaffold-endpoint.md
│   │   │   ├── docs-checker.md
│   │   │   ├── health-checker.md
│   │   │   ├── debug-observer.md
│   │   │   ├── dependency-checker.md
│   │   │   └── pre-deploy-validator.md
│   │   │
│   │   ├── commands/                  # 8 slash commands
│   │   │   ├── dev.md
│   │   │   ├── review.md
│   │   │   ├── audit.md
│   │   │   ├── test.md
│   │   │   ├── lint.md
│   │   │   ├── new-migration.md
│   │   │   ├── migrate.md
│   │   │   └── commit.md
│   │   │
│   │   ├── hooks/                     # 7 core hooks
│   │   │   ├── block-dangerous-git.sh
│   │   │   ├── console-log-warning.sh
│   │   │   ├── migration-safety.sh
│   │   │   ├── bundle-import-check.sh
│   │   │   ├── user-prompt-context.sh
│   │   │   ├── pre-compact-save.sh
│   │   │   └── session-context-restore.sh
│   │   │
│   │   ├── rules/                     # 3 enforcement rules
│   │   │   ├── coding-style.md
│   │   │   ├── security.md
│   │   │   └── git-workflow.md
│   │   │
│   │   ├── skills/                    # 3 meta-skills
│   │   │   ├── project-architecture/
│   │   │   │   └── SKILL.md
│   │   │   ├── writing-agents/
│   │   │   │   └── SKILL.md
│   │   │   └── writing-commands/
│   │   │       └── SKILL.md
│   │   │
│   │   ├── settings.json              # Base settings with hooks wiring
│   │   └── CLAUDE.md                  # Template with TODO placeholders
│   │
│   ├── stack-agents/                  # Stack-specific code reviewers
│   │   ├── go/
│   │   │   └── go-reviewer.md
│   │   ├── typescript/
│   │   │   └── ts-reviewer.md
│   │   ├── python/
│   │   │   └── py-reviewer.md
│   │   └── rust/
│   │       └── rs-reviewer.md
│   │
│   ├── stack-hooks/                   # Stack-specific edit hooks
│   │   ├── go/
│   │   │   ├── format-on-edit.sh
│   │   │   └── go-vet-on-edit.sh
│   │   ├── typescript/
│   │   │   └── typecheck-on-edit.sh
│   │   ├── python/
│   │   │   └── ruff-on-edit.sh
│   │   └── rust/
│   │       └── cargo-check-on-edit.sh
│   │
│   ├── extras/                        # Optional advanced agents
│   │   ├── bot-reviewer.md
│   │   └── design-system-reviewer.md
│   │
│   └── showcase/                      # TGApp production example
│       ├── .claude/
│       │   ├── agents/                # 19 agents (core + TGApp-specific)
│       │   ├── commands/              # 14 commands (8 universal + 6 specific)
│       │   ├── hooks/                 # 11 hooks (7 core + 4 stack)
│       │   ├── skills/               # 9 knowledge skills
│       │   ├── rules/                # 3 rules
│       │   ├── scripts/              # Hook scripts + infra scripts
│       │   └── settings.json
│       ├── CLAUDE.md                  # Real production CLAUDE.md (sanitized)
│       └── README.md
│
├── docs/
│   ├── guide/
│   │   ├── 01-getting-started.md
│   │   ├── 02-architecture.md
│   │   ├── 03-writing-agents.md
│   │   ├── 04-writing-commands.md
│   │   ├── 05-writing-hooks.md
│   │   ├── 06-writing-skills.md
│   │   ├── 07-writing-rules.md
│   │   ├── 08-orchestration.md
│   │   └── 09-advanced-patterns.md
│   └── examples/
│       ├── agent-from-scratch.md
│       ├── command-orchestrator.md
│       └── hook-pipeline.md
│
├── setup.sh                           # Interactive installer
├── README.md                          # Landing page
├── CONTRIBUTING.md
├── LICENSE                            # MIT
└── .github/
    └── ISSUE_TEMPLATE/
        ├── bug-report.md
        ├── feature-request.md
        └── new-stack-template.md
```

## 3. Core Agents (16)

All agents follow a standard format:

```markdown
---
name: agent-name
description: One-line — used for dispatch matching
model: sonnet|opus|haiku
allowed-tools: Read, Grep, Glob, Bash, ...
---

# Agent Name

## Review Process
### Phase 1: Checklist (quick scan)
### Phase 2: Deep Analysis (think step by step)

## Checklist
[numbered items]

## Output Format
[SEVERITY/CONFIDENCE] file:line — description
  Evidence: <what I see>
  Fix: <suggested change>

IMPORTANT: Do NOT inflate severity to seem thorough.
```

### 3.1 Code Review Agents (4 core + 1 extras)

#### code-reviewer
- **Purpose**: Generic code review — any language, any framework
- **Checks**: layer violations, error handling patterns, naming conventions, DI patterns, test coverage, dead code, TODO/FIXME
- **Customization**: `## Stack-Specific Rules` section — placeholder for project-specific patterns
- **Dispatch priority**: If a stack-specific reviewer exists (e.g., `go-reviewer` for *.go), it is dispatched **instead of** `code-reviewer` for matching files. `code-reviewer` handles files not covered by any stack reviewer. In `/review`, both may run: stack-reviewer for *.go + code-reviewer for *.yaml, Dockerfile, etc.
- **Source**: Generalized from TGApp `go-reviewer` + `ts-reviewer`

#### ui-reviewer
- **Purpose**: UI/UX review — accessibility, responsive, performance
- **Checks**: semantic HTML, ARIA attributes, z-index discipline, animation performance (no layout thrash), color contrast, responsive breakpoints, image optimization
- **Source**: Generalized from TGApp `onyx-ui-reviewer` (removed ONYX-specific palette/glass)

#### migration-reviewer
- **Purpose**: SQL migration safety review
- **Checks**: naming convention, matching down.sql, FK ON DELETE clause, indexes, TIMESTAMPTZ, idempotency (IF NOT EXISTS), data loss risk, performance (large table ALTER)
- **Source**: TGApp `migration-reviewer` (already mostly universal)

#### api-contract-sync
- **Purpose**: OpenAPI/Swagger spec ↔ actual routes sync
- **Checks**: undocumented routes, stale docs, DTO/schema mismatch, error codes accuracy
- **Auto-detect**: routes file by framework (chi routes.go, Express app.ts, FastAPI main.py)
- **Source**: Generalized from TGApp `api-contract-sync`

#### bot-reviewer (extras/)
- **Purpose**: Chat bot review — Telegram, Discord, Slack
- **Checks**: 22 items — callback validation, state machines, rate limits, goroutine/thread safety, keyboard cleanup, error handling, role-based access, audit logging
- **Source**: Merged TGApp `bot-reviewer` + `audit-bots` (34 checks → deduplicated to 22)

### 3.2 Security & Audit Agents (4)

#### security-scanner
- **Purpose**: OWASP Top-10 + generic app security
- **Checks (18 core)**:
  1. SQL injection (parameterized queries)
  2. XSS (dangerouslySetInnerHTML)
  3. Secrets in code (regex patterns)
  4. Auth bypass (unprotected routes)
  5. CORS misconfiguration
  6. Rate limiting coverage
  7. Input validation spot-check
  8. Sensitive data exposure
  9. Dependency vulnerabilities
  10. IDOR / object-level authorization
  11. Resource consumption limits
  12. SSRF prevention
  13. Production hardening (no debug endpoints)
  14. Deprecated/dead endpoints
  15. External API validation
  16. Payment idempotency (if applicable)
  17. File upload validation
  18. Account enumeration prevention
- **Customization**: `## App-Specific Checks` section — add domain-specific checks (e.g., dating, fintech, healthcare)
- **Source**: TGApp `security-scanner` 47 checks → 18 universal core + placeholder for custom

#### audit-frontend
- **Purpose**: Frontend code quality audit
- **Checks (12)**: hardcoded values, console.log, TypeScript strict, dead imports, inline styles vs design tokens, query key centralization, state management patterns, bundle size, accessibility basics, i18n readiness, error boundaries, dev-only code guards
- **Source**: Generalized from TGApp `audit-frontend` (removed Russian name detection, motion/react specifics)

#### audit-backend
- **Purpose**: Backend code quality audit
- **Checks (12)**: SQL injection, DELETE without WHERE, unbounded SELECT, swallowed errors, debug prints, error wrapping consistency, stub endpoints, auth middleware coverage, PII in responses, env var documentation, dead code, TODO/FIXME density
- **Source**: Generalized from TGApp `audit-backend` (removed XTR currency, TGApp-specific large tables)

#### audit-infra
- **Purpose**: Infrastructure, dependencies, configuration audit
- **Checks (12)**: secrets in repo, .env.example completeness, Docker security (non-root), dependency vulnerabilities, outdated packages, CORS production config, webhook HTTPS, migration rollback safety, CI/CD pipeline checks, log level configuration, backup verification, monitoring/alerting gaps
- **Source**: NEW — merged from TGApp `audit-bots` (infra checks) + `audit-security` (cross-cutting)

### 3.3 Productivity Agents (5)

#### test-generator
- **Model**: opus (needs high-quality code generation)
- **Purpose**: Generate tests following project patterns
- **Pattern**: table-driven, "should [behavior] when [condition]" naming
- **Edge cases**: boundary values, nil/empty, concurrent access, expired state, SQL-specific
- **Auto-detect**: Go → `_test.go` + `httptest`, TS → `*.test.ts` + vitest/jest, Python → `test_*.py` + pytest
- **Source**: TGApp `test-generator` (removed pgx/httptest specifics, added multi-stack)

#### e2e-test-generator
- **Model**: opus
- **Purpose**: Generate Playwright/Cypress e2e tests
- **Pattern**: Page Object Model, data-testid selectors, network mocking, viewport testing
- **Source**: TGApp `playwright-test-generator` (removed admin-specific selectors)

#### scaffold-endpoint
- **Purpose**: Read existing project patterns → scaffold new endpoint/route/handler
- **Approach**: Phase 1 — find closest existing endpoint as reference. Phase 2 — generate by analogy.
- **NO hardcoded architecture** — reads project structure dynamically
- **Source**: Converted from TGApp `/new-endpoint` command

#### docs-checker
- **Purpose**: Compare git diff vs documentation, find outdated docs
- **Approach**: `git log --name-only -N` → map changed code files → find docs that reference them → flag stale
- **Source**: Converted from TGApp `/docs-check` command

#### health-checker
- **Purpose**: 9-point project health dashboard
- **Checks**: compilation, tests, stale TODOs, API spec drift, migration pairs, dependency freshness, security scan, doc freshness, bundle size
- **Auto-detect**: which checks apply based on project files
- **Source**: Converted from TGApp `/health` command

### 3.4 DevOps Agent (1)

#### pre-deploy-validator
- **Purpose**: Pre-deployment verification gate
- **Checks (9)**: compilation (all stacks), linting, test suite pass, migration consistency (up/down pairs, sequential numbering), API spec sync, debug artifacts (console.log, fmt.Print), environment config completeness, bundle size thresholds, secrets scan in staged files
- **Auto-detect**: which checks apply based on project files (go.mod → go vet, package.json → tsc + build)
- **Output**: 9-point checklist with PASS/WARN/FAIL per item + overall verdict
- **Source**: Generalized from TGApp `pre-deploy-validator`

### 3.5 Observability Agents (2)

#### debug-observer
- **Purpose**: Multi-source debugging — gather evidence before fixing
- **Sources**: container logs (Docker), DB state (diagnostic queries), cache state (Redis/Memcached), code trace (grep call chain), git blame (recent changes)
- **Auto-detect**: Docker? → check containers. Redis config? → check keys. SQL? → diagnostic queries.
- **Source**: Generalized from TGApp `debug-observer`

#### dependency-checker
- **Purpose**: Audit dependencies for security and freshness
- **Checks**: npm audit, govulncheck/pip-audit/cargo-audit, outdated packages, risk categorization
- **Output**: update plan ordered by risk (security → patch → minor → major)
- **Source**: TGApp `dependency-checker` (already mostly universal)

### 3.5 Design System Reviewer (extras/)

#### design-system-reviewer
- **Purpose**: Review UI against project's design system tokens
- **Approach**: Reads design tokens from project config (CSS variables, Tailwind config, or tokens.json). Checks that components use tokens, not hardcoded values.
- **Source**: Generalized from TGApp `onyx-ui-reviewer`

## 4. Core Commands (8)

### 4.1 /dev — Development Orchestrator

```
Phase 1: Understand  → grep codebase, find patterns, identify reference files
Phase 2: Plan        → structured checklist (auto-detect stack)
Phase 3: Implement   → execute in dependency order
Phase 4: Verify      → dispatch health-checker agent
Phase 5: Test        → dispatch test-generator → run tests
Phase 6: Review      → dispatch code-reviewer + security-scanner (parallel)
Phase 7: Document    → dispatch docs-checker → fix outdated docs
Phase 8: Report      → summary table + suggested commit message
```

- **Input**: `/dev <task-description>` — e.g., `/dev add user search endpoint`
- **Auto-detect**: stack from project files (go.mod, package.json, etc.)
- **Dispatches**: health-checker, test-generator, code-reviewer, security-scanner, docs-checker
- **Source**: Refactored TGApp `/dev` (removed hardcoded paths, added auto-detect)

### 4.2 /review — Unified Review Orchestrator

```
Input: /review              → diff HEAD~1
       /review main         → diff main...HEAD
       /review PR#123       → gh pr diff 123
       /review --full       → all files

Step 1: Detect changed files + auto-inject git diff context
Step 2: Map files → agents by extension/path
Step 3: Dispatch all triggered agents in parallel
Step 4: Collect → deduplicate → severity group → unified report
```

- **Absorbs**: TGApp `/review` + `/review-pr` + `/review-with-context`
- **Agent mapping**: configurable via file patterns (*.go → code-reviewer, *.sql → migration-reviewer, etc.)

### 4.3 /audit — Parallel Audit Orchestrator

```
Input: /audit              → all (4 agents in parallel)
       /audit frontend     → audit-frontend
       /audit backend      → audit-backend
       /audit security     → security-scanner
       /audit infra        → audit-infra
```

- **Output**: Grand summary table (agent × PASS/WARN/FAIL) + critical action items

### 4.4 /test — Auto-Detect Test Runner

```
Auto-detection:
  go.mod          → go test ./... -count=1 -short
  vitest/jest     → npm run test
  pytest          → pytest
  Cargo.toml      → cargo test

Input: /test, /test backend, /test e2e, /test --coverage
```

### 4.5 /lint — Auto-Detect Linter

```
Auto-detection:
  *.go            → gofmt + go vet (+ golangci-lint)
  *.ts/*.tsx       → eslint + tsc --noEmit
  *.py            → ruff check + ruff format --check
  *.rs            → cargo clippy

Input: /lint, /lint --fix
```

### 4.6 /new-migration — Scaffold Migration Pair

```
Input: /new-migration add_user_settings
Creates: 000NNN_add_user_settings.up.sql + .down.sql
Auto-detect: migrations directory from project structure
```

### 4.7 /migrate — Apply/Rollback

```
Input: /migrate up, /migrate down, /migrate down 3
Auto-detect: golang-migrate, dbmate, alembic, prisma
```

### 4.8 /commit — Conventional Commit Helper

```
Auto: git status + git diff → analyze → suggest type(scope): description
Checks: no secrets in staged files
Creates: commit with Co-Authored-By
```

## 5. Hooks

### 5.1 Core Hooks (7 — always installed)

| Hook | Event | Purpose |
|------|-------|---------|
| `block-dangerous-git.sh` | PreToolUse(Bash) | Block --no-verify, --force, reset --hard, branch -D |
| `console-log-warning.sh` | PostToolUse(Edit/Write) | Warn on console.log in .ts/.tsx |
| `migration-safety.sh` | PostToolUse(Edit/Write) | Validate SQL migration naming, down.sql, content |
| `bundle-import-check.sh` | PostToolUse(Edit/Write) | Check imports exist in package.json |
| `user-prompt-context.sh` | UserPromptSubmit | Inject git branch, diffstat, changed files, agent hints |
| `pre-compact-save.sh` | PreCompact | Save git state + modified files before context compaction |
| `session-context-restore.sh` | SessionStart | Restore previous session context (if <24h old) |

**Stop hook** (prompt-based, in settings.json):
```json
{
  "type": "prompt",
  "prompt": "Before finishing, verify: (1) All changed files pass stack linters. (2) If logic/API changed — check docs updated. Respond with {\"decision\": \"allow\"} or {\"decision\": \"block\", \"reason\": \"...\"}",
  "model": "haiku",
  "timeout": 30
}
```

### 5.2 Stack Hooks (installed by setup.sh based on stack selection)

| Stack | Hooks | What they do |
|-------|-------|-------------|
| Go | `format-on-edit.sh`, `go-vet-on-edit.sh` | gofmt -w, go vet on .go files |
| TypeScript | `typecheck-on-edit.sh` | tsc --noEmit with SHA256 hash cache |
| Python | `ruff-on-edit.sh` | ruff check + ruff format on .py files |
| Rust | `cargo-check-on-edit.sh` | cargo check on .rs files |

### 5.3 Hook Profiles

Environment variable `CLAUDE_HOOK_PROFILE=fast|standard|strict`:

| Profile | Active Hooks |
|---------|-------------|
| **fast** | block-dangerous-git + console-log-warning only |
| **standard** | All core + stack hooks (except go-vet) |
| **strict** | All core + all stack hooks + Stop verification |

Each hook checks `$CLAUDE_HOOK_PROFILE` and exits early if not in its profile.

## 6. Rules (3)

### coding-style.md
- No magic numbers — use named constants
- No commented-out code — git has history
- Early returns over deep nesting
- Max ~50 lines per function
- No global state — DI via constructors
- Search existing code before writing new utilities
- Tests required for: new endpoints, bug fixes, business logic, complex queries
- Tests optional for: pure UI, config changes, docs

### security.md
- SQL: always parameterized queries ($1 for pgx, ? for MySQL, %s for Python)
- XSS: no dangerouslySetInnerHTML without DOMPurify
- Secrets: no hardcoded tokens/passwords/keys — use env vars
- Auth: all API endpoints require auth middleware (document exceptions)
- Input: validate at system boundaries (handlers), trust internal code
- Files: validate MIME type and size server-side
- CORS: explicit origin allowlist, no wildcards in production

### git-workflow.md
- Conventional commits: type(scope): description
- Types: feat, fix, docs, refactor, chore, test, perf
- No --no-verify: fix hook issues, don't skip them
- No force push to main
- No git reset --hard: use stash or soft reset

## 7. Skills (3 meta-skills)

### project-architecture/SKILL.md
Template with TODO placeholders for project-specific architecture reference. Users fill in: system overview diagram, module map, data flow examples, key config files.

### writing-agents/SKILL.md
Meta-skill teaching how to write custom agents:
- Standard frontmatter format
- 2-phase review process (checklist + deep analysis)
- Severity/confidence rating system
- Grep patterns for automated detection
- Anti-rationalization: "Do NOT inflate severity"
- Examples from core agents

### writing-commands/SKILL.md
Meta-skill teaching how to write custom commands:
- Orchestrator pattern ($ARGUMENTS, phase-based execution)
- Agent dispatch from commands (parallel vs sequential)
- Auto-detection patterns (stack, tools, file structure)
- Settings.json integration

## 8. setup.sh — Interactive Installer

### 8.1 Prerequisites
- `bash` 4.0+
- `git` (must be run inside a git repo)
- `jq` (for settings.json assembly)

### 8.2 Flow

```bash
#!/bin/bash
# claude-code-superkit setup

# Flow:
# 1. Check prerequisites (bash version, git, jq)
# 2. Verify .git/ exists — abort if not a git repo
# 3. Check .claude/ — if exists, offer: (a) merge, (b) backup + overwrite, (c) abort
# 4. Select stacks — sequential yes/no per stack (Go, TypeScript, Python, Rust)
# 5. Select extras — sequential yes/no (Bot reviewer, Design system reviewer)
# 6. Select hook profile (fast/standard/strict)
# 7. Copy core → .claude/
# 8. Copy selected stack-agents → .claude/agents/
# 9. Copy selected stack-hooks → .claude/scripts/hooks/
# 10. Copy selected extras → .claude/agents/
# 11. Build settings.json with selected hooks
# 12. Create CLAUDE.md template
# 13. Print next steps
```

### 8.3 Error Handling
- Missing prerequisite (jq/git) → print install instructions, exit 1
- Not a git repo → print "Run from inside a git repository", exit 1
- Existing `.claude/` → interactive prompt: merge (add new, skip existing) / backup + overwrite / abort
- Any copy failure → print error, continue with remaining files, report at end
- Idempotent: re-running setup.sh on already-installed project is safe (merge mode)

### 8.4 Stack Detection Algorithm

Commands and agents auto-detect stack from project files. Detection order:

```
1. go.mod           → Go project
2. package.json     → Node.js/TypeScript project
   tsconfig.json    → confirms TypeScript (not plain JS)
3. pyproject.toml   → Python project
   requirements.txt → Python fallback
4. Cargo.toml       → Rust project
```

**Monorepo handling**: ALL matching stacks are detected. Commands scope by directory:
- `/lint` → runs linters for ALL detected stacks
- `/test` → runs tests for ALL detected stacks
- `/lint go` or `/test backend` → user override, forces single stack
- `/review` maps files to agents by extension regardless of stack count

### 8.5 Manual Fallback

```bash
# No setup.sh needed — just copy:
cp -r packages/core/.claude/ your-project/.claude/
cp packages/core/CLAUDE.md your-project/CLAUDE.md
# Add stack hooks manually if needed
```

## 9. Showcase (TGApp)

Sanitized copy of TGApp `.claude/` as production example (post-refactoring).

### What gets included

**Agents (21):**
- 16 core agents (same as superkit core, but with TGApp-specific additions in `## Stack-Specific Rules` sections)
- 2 stack agents: `go-reviewer`, `ts-reviewer`
- 1 extras agent: `onyx-ui-reviewer` (customized design-system-reviewer)
- 2 domain-specific agents: `events-discovery`, `content-curator`

**Commands (14):**
- 8 universal: dev, review, audit, test, lint, new-migration, migrate, commit
- 6 TGApp-specific: start, stop, stop-docker, run-admin (with args: demo/final), stop-admin, seed-reset

**Hooks (11):** 7 core + 3 stack (Go: format-on-edit, go-vet-on-edit; TS: typecheck-on-edit) + Stop prompt = 11

**Skills (11):** 3 core meta-skills (project-architecture, writing-agents, writing-commands) + 8 TGApp knowledge skills (admin-auth-guide, api-conventions, db-patterns, frontend-patterns, frontend-state-management, pagination-and-filtering, onyx-ui-standard, tg-miniapp)

**Rules (3):** coding-style, security, git-workflow

### What gets sanitized
- Remove real API keys, tokens, URLs
- Replace GitHub username with placeholder
- Replace domain names with example.com
- Keep all architecture, patterns, conventions

## 10. TGApp Refactoring

Changes to apply to our TGApp `.claude/` in parallel:

### Commands: 21 → 14

**Arithmetic:** 21 current - 6 deleted - 2 merged + 1 added = **14**

**Delete (6) — converted to agents:**
- `/health` → agent `health-checker`
- `/docs-check` → agent `docs-checker`
- `/new-endpoint` → agent `scaffold-endpoint`
- `/dev-backend` → use `/dev backend: <task>` instead
- `/review-pr` → absorbed by `/review PR#123`
- `/review-with-context` → absorbed by `/review` (auto git context)

**Merge (2) — into existing command with args:**
- `/run-admin-demo` → merged into `/run-admin demo`
- `/run-admin-final` → merged into `/run-admin final`

**Add (1):**
- `/commit` — conventional commit helper (new)

**Result (14):**
- 8 universal: dev, review, audit, test, lint, new-migration, migrate, commit
- 6 TGApp-specific: start, stop, stop-docker, run-admin (with args: demo/final), stop-admin, seed-reset

### Agents: 18 → 21

**Add (3) — converted from commands:**
- `health-checker.md` — from `/health`
- `docs-checker.md` — from `/docs-check`
- `scaffold-endpoint.md` — from `/new-endpoint`

### Commands updated (3):
- `/dev` — remove hardcoded paths, add auto-detect + Phase 4 (health-checker), Phase 7 (docs-checker)
- `/review` — merge logic from review-pr and review-with-context, add auto git context injection
- `/run-admin` — accept args: no arg = live, `demo` = demo mode, `final` = strict mode

### Rules: 5 → 3
- Merge `testing.md` → section in `coding-style.md`
- Merge `search-first.md` → section in `coding-style.md`
- Keep `coding-style.md`, `security.md`, `git-workflow.md`

### Skills: 9 → 11
- Keep all 9 TGApp knowledge skills
- Add 2 new meta-skills: `writing-agents`, `writing-commands`

## 11. Documentation (9-Chapter Guide)

### 01-getting-started.md
- What is claude-code-superkit
- 5-minute quickstart with setup.sh
- Manual installation alternative
- First commands to try: /health, /review, /dev

### 02-architecture.md
- How agents, commands, hooks, rules, skills relate
- Event flow: user prompt → hooks → command → agents → hooks → response
- Diagram: the full pipeline

### 03-writing-agents.md
- Standard agent format (frontmatter, phases, checklist, output)
- 2-phase review process pattern
- Severity/confidence system
- Grep patterns for automated detection
- Anti-inflation rule
- Step-by-step: writing a custom reviewer

### 04-writing-commands.md
- Command format ($ARGUMENTS, allowed-tools)
- Orchestrator pattern (multi-phase execution)
- Dispatching agents from commands
- Auto-detection patterns
- Step-by-step: writing a custom orchestrator

### 05-writing-hooks.md
- Hook types: PreToolUse, PostToolUse, UserPromptSubmit, PreCompact, SessionStart, Stop
- JSON protocol (stdin input, exit codes, stderr messages)
- Hook profiles (fast/standard/strict)
- Performance considerations (SHA256 caching)
- Step-by-step: writing a custom hook

### 06-writing-skills.md
- Skill format (SKILL.md, frontmatter)
- Knowledge skills vs process skills
- Dynamic content with `!` shell execution
- When to use skill vs rule vs agent
- Step-by-step: writing a knowledge skill

### 07-writing-rules.md
- Rules = always-in-context enforcement
- Keep rules short (<50 lines)
- Security rules, style rules, workflow rules
- Rules vs hooks (enforcement at different levels)

### 08-orchestration.md
- Combining everything: /dev → agents → hooks → report
- Parallel agent dispatch
- Review orchestrator pattern
- Audit orchestrator pattern
- Error handling in orchestration

### 09-advanced-patterns.md
- Hook profiles (fast/standard/strict)
- Session continuity (pre-compact save → session restore)
- Parallel agent dispatch patterns
- Using with Superpowers plugin
- Git worktrees integration
- CI/CD integration possibilities

## 12. Compatibility

### With Superpowers Plugin
claude-code-superkit (infrastructure) + superpowers (process) = complete system.
- superkit: agents, hooks, commands, review pipeline
- superpowers: TDD, debugging, brainstorming, verification
- No conflicts. Recommended to use together.

### With Other Plugins
- context7: documentation lookup — works alongside
- playwright: browser automation — used by e2e-test-generator
- code-review: basic review — superkit's review is more comprehensive

## 13. Summary Table

| Component | superkit core | stack | extras | showcase adds | Total in superkit | TGApp total |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Agents | 16 | 4 (go/ts/py/rs) | 2 (bot/design) | +2 domain (events/content) | **22** | **21** |
| Commands | 8 | — | — | +6 infra (start/stop/admin/seed) | **8** | **14** |
| Hooks (shell) | 7 core | 5 files (go:2/ts:1/py:1/rs:1) | — | — | **12** | **10** |
| Hook (prompt) | 1 Stop gate | — | — | — | **1** | **1** |
| Rules | 3 | — | — | — | **3** | **3** |
| Skills | 3 meta | — | — | +8 knowledge | **3** | **11** |

Hook totals: superkit = 7 core + 5 stack + 1 Stop = **13**. TGApp = 7 core + 3 stack (go:2, ts:1) + 1 Stop = **11**.

Notes:
- "superkit core" = what `setup.sh` installs by default
- "stack" = selected during setup based on project stacks
- "extras" = optional, selected during setup
- "showcase adds" = TGApp-specific additions visible only in showcase/
- TGApp agents (21) = 16 core + go-reviewer + ts-reviewer + onyx-ui-reviewer + events-discovery + content-curator

## 14. Versioning & Updates

### Release Strategy
- Semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`
- Git tags on releases
- CHANGELOG.md per release

### How Users Update
- `git pull` the superkit repo → re-run `setup.sh` in merge mode
- Or manually diff and copy changed files
- Breaking changes (agent format, hook protocol) → major version bump

### Compatibility Promise
- v1.x: agents, commands, hooks format stable
- Stack hooks may be added without major bump
- New agents/commands are additive (non-breaking)

## 15. Testing Strategy

### For superkit repo itself

**Hooks (shell tests):**
- Each hook gets a `tests/hooks/test_hookname.sh` with sample JSON input
- Verify: correct exit codes, stderr messages, no false positives
- Tool: `bats` (Bash Automated Testing System) or plain bash assertions

**Commands (smoke tests):**
- Create a test project (`tests/fixtures/sample-go-project/`)
- Run each command, verify it doesn't crash and produces expected output structure
- Deferred to v1.1 (v1.0 = manual testing)

**Agents (output validation):**
- Agent testing is inherently non-deterministic (LLM output)
- Validate: frontmatter is valid YAML, required sections exist, output format documented
- Linter script: `tools/validate-agents.sh` checks all .md files in agents/

**CI:**
- GitHub Actions: shellcheck on all .sh files, markdownlint on all .md files, validate-agents.sh

## 16. License

MIT — maximum adoption, no friction.

## 17. Success Criteria

1. A developer can install superkit in <5 minutes via setup.sh
2. All 8 commands work out-of-the-box after installation
3. /health reports meaningful results for any project with go.mod or package.json
4. /review dispatches correct agents based on file extensions
5. Guide is comprehensive enough to write custom agents without reading source
6. TGApp showcase demonstrates the full power of a production setup
7. setup.sh handles existing .claude/ gracefully (merge/backup/abort)
8. All hooks pass shellcheck without errors
