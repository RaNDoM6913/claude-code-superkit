# claude-code-superkit Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the claude-code-superkit monorepo with 16 core agents, 8 commands, 7+Stop hooks, 3 rules, 3 skills, stack-agents/hooks, extras, setup.sh — all ready for `git push`.

**Architecture:** Monorepo with `packages/` containing `core/`, `stack-agents/`, `stack-hooks/`, `extras/`. Core is the installable unit — `setup.sh` copies it to `.claude/` in any project. All agents/commands/hooks are generalized from TGApp production code (spec: `docs/superpowers/specs/2026-03-23-claude-code-superkit-design.md`).

**Tech Stack:** Bash (hooks, setup.sh), Markdown (agents, commands, skills, rules, docs), JSON (settings.json), Git.

**Spec Reference:** `/Users/ivankudzin/cursor/tgapp/docs/superpowers/specs/2026-03-23-claude-code-superkit-design.md`

**Source Reference (TGApp originals):** `/Users/ivankudzin/cursor/tgapp/.claude/`

---

## File Structure

```
claude-code-superkit/                  # NEW REPO (already created on GitHub)
├── packages/
│   ├── core/
│   │   ├── agents/                    # 16 .md files
│   │   ├── commands/                  # 8 .md files
│   │   ├── hooks/                     # 7 .sh files
│   │   ├── rules/                     # 3 .md files
│   │   ├── skills/                    # 3 dirs with SKILL.md each
│   │   ├── settings.json
│   │   └── CLAUDE.md                  # Template
│   ├── stack-agents/
│   │   ├── go/go-reviewer.md
│   │   ├── typescript/ts-reviewer.md
│   │   ├── python/py-reviewer.md
│   │   └── rust/rs-reviewer.md
│   ├── stack-hooks/
│   │   ├── go/format-on-edit.sh
│   │   ├── go/go-vet-on-edit.sh
│   │   ├── typescript/typecheck-on-edit.sh
│   │   ├── python/ruff-on-edit.sh
│   │   └── rust/cargo-check-on-edit.sh
│   └── extras/
│       ├── bot-reviewer.md
│       └── design-system-reviewer.md
├── setup.sh
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

Total files to create: ~45

---

## Task 1: Initialize repo and directory structure

**Files:**
- Clone: `claude-code-superkit/` from GitHub
- Create: all directories (empty)
- Create: `LICENSE` (MIT, already created by gh)
- Create: `README.md` (placeholder)

- [ ] **Step 1: Clone the repo**

```bash
cd /Users/ivankudzin/cursor
git clone https://github.com/RaNDoM6913/claude-code-superkit.git
cd claude-code-superkit
```

- [ ] **Step 2: Create all directories**

```bash
mkdir -p packages/core/{agents,commands,hooks,rules,skills/{project-architecture,writing-agents,writing-commands}}
mkdir -p packages/stack-agents/{go,typescript,python,rust}
mkdir -p packages/stack-hooks/{go,typescript,python,rust}
mkdir -p packages/extras
mkdir -p docs/{guide,examples}
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 3: Create placeholder README.md**

```markdown
# claude-code-superkit

Production-tested agents, commands, hooks & skills for Claude Code.

> Full documentation coming soon. See `docs/guide/` for the complete guide.

## Quick Start

```bash
# Clone this repo
git clone https://github.com/RaNDoM6913/claude-code-superkit.git

# Run setup in your project
cd your-project/
bash /path/to/claude-code-superkit/setup.sh
```

## What's Inside

| Component | Count | Description |
|-----------|-------|-------------|
| Core Agents | 16 | Code review, security scan, testing, audit, debugging |
| Stack Agents | 4 | Go, TypeScript, Python, Rust specific reviewers |
| Extra Agents | 2 | Bot reviewer, design system reviewer |
| Commands | 8 | /dev, /review, /audit, /test, /lint, /migrate, /new-migration, /commit |
| Hooks | 7+Stop | Git safety, typecheck, format, context injection, session continuity |
| Rules | 3 | Coding style, security, git workflow |
| Skills | 3 | Project architecture template, writing-agents, writing-commands |

## License

MIT
```

- [ ] **Step 4: Create CONTRIBUTING.md**

```markdown
# Contributing to claude-code-superkit

## Adding a New Stack

1. Create `packages/stack-agents/your-stack/your-stack-reviewer.md`
2. Create `packages/stack-hooks/your-stack/your-hook.sh`
3. Update `setup.sh` to include the new stack in selection
4. Submit a PR

## Adding a New Agent

1. Follow the agent format in `docs/guide/03-writing-agents.md`
2. Place in `packages/core/agents/` (universal) or `packages/extras/` (specialized)
3. Submit a PR

## Agent Format

See any existing agent in `packages/core/agents/` for the standard format:
- YAML frontmatter (name, description, model, allowed-tools)
- 2-phase review process
- Severity/confidence output format

## Reporting Issues

Use GitHub Issues with the appropriate template.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: init monorepo directory structure"
```

---

## Task 2: Core Hooks (7 shell + Stop prompt)

**Files:**
- Create: `packages/core/hooks/block-dangerous-git.sh` (copy from TGApp, no changes)
- Create: `packages/core/hooks/console-log-warning.sh` (copy, no changes)
- Create: `packages/core/hooks/migration-safety.sh` (generalize migrations dir)
- Create: `packages/core/hooks/bundle-import-check.sh` (copy, no changes)
- Create: `packages/core/hooks/user-prompt-context.sh` (generalize agent hints)
- Create: `packages/core/hooks/pre-compact-save.sh` (change path to generic)
- Create: `packages/core/hooks/session-context-restore.sh` (change path to generic)
- Source: `/Users/ivankudzin/cursor/tgapp/.claude/scripts/hooks/`

- [ ] **Step 1: Copy hooks that need no changes**

Copy these 3 verbatim from TGApp (already universal):
- `block-dangerous-git.sh`
- `console-log-warning.sh`
- `bundle-import-check.sh`

- [ ] **Step 2: Generalize migration-safety.sh**

Source: TGApp `migration-safety.sh`. Change: remove `backend/migrations/` hardcode. Instead detect any `*/migrations/*.sql` path pattern.

- [ ] **Step 3: Generalize user-prompt-context.sh**

Source: TGApp `user-prompt-context.sh`. Changes:
- Remove TGApp-specific hints (routes.go, tgbots/)
- Keep generic extension-based hints:
  - `*.go` changed → "consider running code-reviewer agent"
  - `*.sql` changed → "consider running migration-reviewer agent"
  - `*.ts/*.tsx` changed → "consider running code-reviewer agent"
  - `security|auth|payment` in paths → "consider running security-scanner agent"

- [ ] **Step 4: Generalize pre-compact-save.sh and session-context-restore.sh**

Source: TGApp versions. Changes:
- Path: `~/.config/tgapp/claude-code/` → `~/.config/claude-superkit/`
- Otherwise identical logic

- [ ] **Step 5: Make all hooks executable**

```bash
chmod +x packages/core/hooks/*.sh
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/hooks/
git commit -m "feat(core): add 7 universal hooks"
```

---

## Task 3: Core Rules (3)

**Files:**
- Create: `packages/core/rules/coding-style.md`
- Create: `packages/core/rules/security.md`
- Create: `packages/core/rules/git-workflow.md`
- Source: `/Users/ivankudzin/cursor/tgapp/.claude/rules/`

- [ ] **Step 1: Create coding-style.md**

Source: TGApp `coding-style.md` + `testing.md` + `search-first.md` merged. Remove Go/TS specific items. Keep universal principles.

```markdown
# Coding Style

## General
- Format: use language-standard formatter (gofmt, prettier, ruff, rustfmt)
- No magic numbers — use named constants
- No commented-out code — git has history
- Prefer early returns over deep nesting
- Maximum function length: ~50 lines (split if larger)
- No global state — inject dependencies via constructors

## Error Handling
- Wrap errors with context (caller + method name)
- Don't swallow errors — handle or propagate
- Use language-idiomatic error patterns (Result<T>, error interface, exceptions)

## Testing
- Tests required for: new API endpoints, bug fixes, business logic, complex queries
- Tests optional for: pure UI components, config changes, documentation
- Test naming: "should [behavior] when [condition]"
- Prefer table-driven / parameterized tests

## Search First
- Before writing new code, check: does a similar function already exist in the codebase?
- Before adding a dependency, check: is there a well-maintained package?
- Thin wrappers over packages are preferred over reimplementation
```

- [ ] **Step 2: Create security.md**

Source: TGApp `security.md`. Generalize SQL syntax examples.

```markdown
# Security

- **SQL**: Always parameterized queries. NEVER string interpolation in SQL.
  - Go/pgx: `$1, $2`
  - Node/MySQL: `?` placeholders
  - Python/SQLAlchemy: `:param` or `%s` with params tuple
- **XSS**: No `dangerouslySetInnerHTML`. If needed, sanitize with DOMPurify.
- **Secrets**: No hardcoded tokens, passwords, or API keys. Use env vars.
- **Auth**: All API endpoints require auth middleware. Document exceptions.
- **Input validation**: Validate at system boundaries. Trust internal code.
- **File uploads**: Validate MIME type and size server-side.
- **CORS**: Explicit origin allowlist, no wildcards in production.
```

- [ ] **Step 3: Create git-workflow.md**

Copy from TGApp — already universal. No changes needed.

- [ ] **Step 4: Commit**

```bash
git add packages/core/rules/
git commit -m "feat(core): add 3 enforcement rules"
```

---

## Task 4: Core Agents — Code Review (4 core + 1 extras)

**Files:**
- Create: `packages/core/agents/code-reviewer.md`
- Create: `packages/core/agents/ui-reviewer.md`
- Create: `packages/core/agents/migration-reviewer.md`
- Create: `packages/core/agents/api-contract-sync.md`
- Create: `packages/extras/bot-reviewer.md`
- Source: TGApp agents (generalize each)

- [ ] **Step 1: Create code-reviewer.md**

Source: TGApp `go-reviewer.md`. Generalize:
- Remove chi/pgx/domain-error specifics
- Keep: 2-phase review, 8 checklist items (layer violations, error handling, naming, DI, test coverage, SQL safety, context propagation, auth)
- Add `## Stack-Specific Rules` placeholder section
- Add dispatch priority note: "If a stack-specific reviewer exists, it handles matching files instead of this agent"
- Severity/confidence output format (unchanged from TGApp)

- [ ] **Step 2: Create ui-reviewer.md**

Source: TGApp `onyx-ui-reviewer.md`. Remove:
- ONYX palette (#060609, #6A5CFF)
- Glass components, specific z-index values
- motion/react references

Keep/generalize:
- Semantic HTML check
- Accessibility (ARIA, color contrast, keyboard nav)
- Z-index discipline (define layers, no random values)
- Animation performance (no layout thrash, prefer transform/opacity)
- Responsive design
- Design token usage (not hardcoded colors)

- [ ] **Step 3: Create migration-reviewer.md**

Source: TGApp `migration-reviewer.md`. Mostly universal already. Remove:
- TGApp migration range (000001..000048)
- Specific table references

Keep: naming, down.sql matching, FK ON DELETE, indexes, TIMESTAMPTZ, idempotency, data loss risk assessment.

- [ ] **Step 4: Create api-contract-sync.md**

Source: TGApp `api-contract-sync.md`. Generalize:
- Remove `routes.go` hardcode
- Auto-detect: OpenAPI/Swagger spec file location
- Auto-detect: routes registration file by framework

- [ ] **Step 5: Create extras/bot-reviewer.md**

Source: Merge TGApp `bot-reviewer.md` (22 checks) + `audit-bots.md` (12 checks). Deduplicate to ~22 checks. Generalize from Telegram to any chat bot platform.

- [ ] **Step 6: Commit**

```bash
git add packages/core/agents/code-reviewer.md packages/core/agents/ui-reviewer.md packages/core/agents/migration-reviewer.md packages/core/agents/api-contract-sync.md packages/extras/bot-reviewer.md
git commit -m "feat(core): add 4 code review agents + bot-reviewer extra"
```

---

## Task 5: Core Agents — Security & Audit (4)

**Files:**
- Create: `packages/core/agents/security-scanner.md`
- Create: `packages/core/agents/audit-frontend.md`
- Create: `packages/core/agents/audit-backend.md`
- Create: `packages/core/agents/audit-infra.md`
- Source: TGApp agents (generalize each)

- [ ] **Step 1: Create security-scanner.md**

Source: TGApp `security-scanner.md` (47 checks). Reduce to 18 universal checks (spec Section 3.2). Remove:
- Dating-specific checks (10-41): photo privacy, phone isolation, location privacy, moderation gates, swipe limits, perceptual hash, CSAM, etc.

Keep: OWASP core (1-9) + generic app checks (42-47). Add `## App-Specific Checks` placeholder.

- [ ] **Step 2: Create audit-frontend.md**

Source: TGApp `audit-frontend.md` (15 checks). Reduce to 12 universal. Remove:
- Russian name detection
- motion/react specific
- TGApp deleted file list
- Zustand useShallow (too specific)

Keep: hardcoded values, console.log, TypeScript strict, dead imports, query key centralization, bundle size, error boundaries, dev-only guards.

- [ ] **Step 3: Create audit-backend.md**

Source: TGApp `audit-backend.md` (15 checks). Reduce to 12 universal. Remove:
- XTR currency check
- TGApp large table list
- Specific public endpoint whitelist

Keep: SQL injection, DELETE without WHERE, unbounded SELECT, swallowed errors, debug prints, error wrapping, stub endpoints, auth coverage, PII leaks, env docs.

- [ ] **Step 4: Create audit-infra.md**

NEW agent. Merge from TGApp `audit-bots.md` (infra checks) + `audit-security.md` (cross-cutting). 12 checks per spec Section 3.2.

- [ ] **Step 5: Commit**

```bash
git add packages/core/agents/security-scanner.md packages/core/agents/audit-frontend.md packages/core/agents/audit-backend.md packages/core/agents/audit-infra.md
git commit -m "feat(core): add 4 security & audit agents"
```

---

## Task 6: Core Agents — Productivity (5)

**Files:**
- Create: `packages/core/agents/test-generator.md`
- Create: `packages/core/agents/e2e-test-generator.md`
- Create: `packages/core/agents/scaffold-endpoint.md`
- Create: `packages/core/agents/docs-checker.md`
- Create: `packages/core/agents/health-checker.md`
- Source: TGApp agents + commands (generalize)

- [ ] **Step 1: Create test-generator.md**

Source: TGApp `test-generator.md`. Model: opus. Remove pgx/httptest specifics. Keep: table-driven pattern, "should X when Y" naming, edge case heuristics (boundary, nil, concurrent, expired, SQL), mock interfaces pattern. Add multi-stack examples.

- [ ] **Step 2: Create e2e-test-generator.md**

Source: TGApp `playwright-test-generator.md`. Model: opus. Remove admin-specific selectors. Keep: Page Object Model, data-testid, network mocking, viewport testing, Playwright patterns.

- [ ] **Step 3: Create scaffold-endpoint.md**

Source: TGApp `/new-endpoint` command. Convert to agent format. Key change: instead of hardcoded architecture, Phase 1 reads existing project patterns, Phase 2 generates by analogy.

- [ ] **Step 4: Create docs-checker.md**

Source: TGApp `/docs-check` command. Convert to agent format. Logic: `git diff --name-only HEAD~N` → map changed files → find referencing docs → flag stale.

- [ ] **Step 5: Create health-checker.md**

Source: TGApp `/health` command. Convert to agent format. 9 checks with auto-detect (go.mod? → go vet; package.json? → tsc/eslint; migrations/? → check pairs). Dashboard output format.

- [ ] **Step 6: Commit**

```bash
git add packages/core/agents/test-generator.md packages/core/agents/e2e-test-generator.md packages/core/agents/scaffold-endpoint.md packages/core/agents/docs-checker.md packages/core/agents/health-checker.md
git commit -m "feat(core): add 5 productivity agents"
```

---

## Task 7: Core Agents — Observability & DevOps (3)

**Files:**
- Create: `packages/core/agents/debug-observer.md`
- Create: `packages/core/agents/dependency-checker.md`
- Create: `packages/core/agents/pre-deploy-validator.md`
- Source: TGApp agents (generalize)

- [ ] **Step 1: Create debug-observer.md**

Source: TGApp `debug-observer.md`. Remove TGApp paths. Add auto-detect: Docker? → container logs. Redis config? → key inspection. SQL? → diagnostic queries.

- [ ] **Step 2: Create dependency-checker.md**

Source: TGApp `dependency-checker.md`. Already mostly universal. Add Python (pip-audit) and Rust (cargo-audit) support.

- [ ] **Step 3: Create pre-deploy-validator.md**

Source: TGApp `pre-deploy-validator.md`. Generalize: auto-detect stack, remove hardcoded paths/thresholds. 9-point checklist per spec.

- [ ] **Step 4: Commit**

```bash
git add packages/core/agents/debug-observer.md packages/core/agents/dependency-checker.md packages/core/agents/pre-deploy-validator.md
git commit -m "feat(core): add 3 observability & devops agents"
```

---

## Task 8: Core Commands (8)

**Files:**
- Create: `packages/core/commands/dev.md`
- Create: `packages/core/commands/review.md`
- Create: `packages/core/commands/audit.md`
- Create: `packages/core/commands/test.md`
- Create: `packages/core/commands/lint.md`
- Create: `packages/core/commands/new-migration.md`
- Create: `packages/core/commands/migrate.md`
- Create: `packages/core/commands/commit.md`
- Source: TGApp commands (generalize) + spec Section 4

- [ ] **Step 1: Create dev.md**

Source: TGApp `/dev`. 8-phase orchestrator. Remove hardcoded paths. Add auto-detect stack in Phase 1. Dispatch: health-checker (Phase 4), test-generator (Phase 5), code-reviewer + security-scanner (Phase 6), docs-checker (Phase 7).

- [ ] **Step 2: Create review.md**

Source: Merge TGApp `/review` + `/review-pr` + `/review-with-context`. Unified command. Auto git context injection. Agent mapping by file extension.

- [ ] **Step 3: Create audit.md**

Source: TGApp `/audit`. Update agent names: audit-frontend, audit-backend, audit-infra, security-scanner. Keep parallel dispatch pattern.

- [ ] **Step 4: Create test.md**

New command with auto-detect. Check go.mod → `go test`, package.json → vitest/jest, pytest.ini → pytest, Cargo.toml → cargo test.

- [ ] **Step 5: Create lint.md**

New command with auto-detect. Go → gofmt + go vet, TS → eslint + tsc, Python → ruff, Rust → cargo clippy. Support `--fix` flag.

- [ ] **Step 6: Create new-migration.md and migrate.md**

Source: TGApp versions. Generalize: auto-detect migrations dir and migration tool.

- [ ] **Step 7: Create commit.md**

New command. Logic: git status + git diff → analyze changes → suggest conventional commit message → check for secrets → create commit.

- [ ] **Step 8: Commit**

```bash
git add packages/core/commands/
git commit -m "feat(core): add 8 orchestrator commands"
```

---

## Task 9: Core Skills (3) and Template CLAUDE.md

**Files:**
- Create: `packages/core/skills/project-architecture/SKILL.md`
- Create: `packages/core/skills/writing-agents/SKILL.md`
- Create: `packages/core/skills/writing-commands/SKILL.md`
- Create: `packages/core/CLAUDE.md`
- Source: spec Section 7

- [ ] **Step 1: Create project-architecture/SKILL.md**

Template with TODO placeholders. Include: system overview diagram placeholder, module map, data flow examples, key config files. Use `!` shell commands for dynamic counts.

- [ ] **Step 2: Create writing-agents/SKILL.md**

Meta-skill. Content: standard agent format, 2-phase review process, severity/confidence system, grep patterns, anti-rationalization rule, step-by-step guide.

- [ ] **Step 3: Create writing-commands/SKILL.md**

Meta-skill. Content: command format, orchestrator pattern, agent dispatch, auto-detection patterns, settings.json integration, step-by-step guide.

- [ ] **Step 4: Create packages/core/CLAUDE.md**

Template with TODO sections: Project name, Tech Stack, Project Structure, Key Commands, Conventions, Architecture Reference. Each section has `TODO:` placeholders.

- [ ] **Step 5: Commit**

```bash
git add packages/core/skills/ packages/core/CLAUDE.md
git commit -m "feat(core): add 3 meta-skills and CLAUDE.md template"
```

---

## Task 10: Core settings.json

**Files:**
- Create: `packages/core/settings.json`

- [ ] **Step 1: Create settings.json**

Base settings with all 7 core hooks wired. Stack hooks will be added by setup.sh. Include: permissions (Bash, Read, Edit, Write, Glob, Grep), all hook events (PreToolUse, PostToolUse, UserPromptSubmit, PreCompact, SessionStart, Stop).

- [ ] **Step 2: Commit**

```bash
git add packages/core/settings.json
git commit -m "feat(core): add base settings.json with hooks wiring"
```

---

## Task 11: Stack Agents (4)

**Files:**
- Create: `packages/stack-agents/go/go-reviewer.md`
- Create: `packages/stack-agents/typescript/ts-reviewer.md`
- Create: `packages/stack-agents/python/py-reviewer.md`
- Create: `packages/stack-agents/rust/rs-reviewer.md`
- Source: TGApp go-reviewer/ts-reviewer (generalize), new py/rs

- [ ] **Step 1: Create go-reviewer.md**

Source: TGApp `go-reviewer.md`. Keep all Go-specific patterns but remove TGApp architecture (chi, pgx specifics → generic Go patterns). Focus on: error wrapping, interface DI, context.Context, nil safety, naming, gofmt.

- [ ] **Step 2: Create ts-reviewer.md**

Source: TGApp `ts-reviewer.md`. Remove ONYX/motion/react specifics. Keep: TypeScript strict mode, React hooks rules, TanStack Query patterns (generic), Zustand patterns (generic), import organization.

- [ ] **Step 3: Create py-reviewer.md**

NEW agent. Go-reviewer pattern adapted for Python: type hints, async/await patterns, Django/FastAPI conventions, error handling, testing (pytest), import organization, PEP 8 compliance.

- [ ] **Step 4: Create rs-reviewer.md**

NEW agent. Pattern: ownership & borrowing, lifetime annotations, error handling (Result/Option), unsafe usage audit, Clippy compliance, module organization.

- [ ] **Step 5: Commit**

```bash
git add packages/stack-agents/
git commit -m "feat(stack): add 4 stack-specific code reviewers"
```

---

## Task 12: Stack Hooks (5 files)

**Files:**
- Create: `packages/stack-hooks/go/format-on-edit.sh` (copy from TGApp)
- Create: `packages/stack-hooks/go/go-vet-on-edit.sh` (generalize)
- Create: `packages/stack-hooks/typescript/typecheck-on-edit.sh` (generalize)
- Create: `packages/stack-hooks/python/ruff-on-edit.sh` (new)
- Create: `packages/stack-hooks/rust/cargo-check-on-edit.sh` (new)
- Source: TGApp hooks + new

- [ ] **Step 1: Copy and generalize Go hooks**

`format-on-edit.sh` — copy from TGApp, remove `backend/` path check (format any .go file).
`go-vet-on-edit.sh` — copy from TGApp, remove `backend/` hardcode, find nearest go.mod.

- [ ] **Step 2: Generalize typescript/typecheck-on-edit.sh**

Source: TGApp version. Remove `frontend/src/` and `adminpanel/frontend/src/` hardcodes. Instead: find nearest tsconfig.json and run tsc there. Keep SHA256 hash cache.

- [ ] **Step 3: Create python/ruff-on-edit.sh**

New hook. Pattern: same as format-on-edit but runs `ruff check --fix` + `ruff format` on .py files. Profile-aware (skip on fast).

- [ ] **Step 4: Create rust/cargo-check-on-edit.sh**

New hook. Pattern: runs `cargo check` in nearest Cargo.toml directory on .rs file edit. Profile-aware.

- [ ] **Step 5: Make executable and commit**

```bash
chmod +x packages/stack-hooks/**/*.sh
git add packages/stack-hooks/
git commit -m "feat(stack): add 5 stack-specific edit hooks"
```

---

## Task 13: Extras — Design System Reviewer

**Files:**
- Create: `packages/extras/design-system-reviewer.md`

- [ ] **Step 1: Create design-system-reviewer.md**

Source: TGApp `onyx-ui-reviewer.md`. Generalize: instead of ONYX palette, Phase 1 reads project's design tokens (CSS variables, Tailwind config, tokens.json, theme file). Phase 2 checks components use tokens not hardcoded values. Checklist: color usage, spacing, typography, z-index layers, animation consistency.

- [ ] **Step 2: Commit**

```bash
git add packages/extras/design-system-reviewer.md
git commit -m "feat(extras): add parameterized design system reviewer"
```

---

## Task 14: setup.sh

**Files:**
- Create: `setup.sh`

- [ ] **Step 1: Write setup.sh**

Interactive installer per spec Section 8. Features:
- Prerequisite check (bash 4+, git, jq)
- .git/ verification
- .claude/ conflict handling (merge/backup/abort)
- Stack selection (sequential yes/no)
- Extras selection
- Hook profile selection
- Copy core → .claude/
- Copy selected stack-agents → .claude/agents/
- Copy selected stack-hooks → .claude/scripts/hooks/
- Build settings.json with selected hooks
- Copy CLAUDE.md template
- Print next steps

- [ ] **Step 2: Make executable**

```bash
chmod +x setup.sh
```

- [ ] **Step 3: Test setup.sh locally**

```bash
cd /tmp && mkdir test-project && cd test-project && git init
bash /Users/ivankudzin/cursor/claude-code-superkit/setup.sh
# Verify: .claude/ created, settings.json has correct hooks, CLAUDE.md exists
```

- [ ] **Step 4: Commit**

```bash
git add setup.sh
git commit -m "feat: add interactive setup.sh installer"
```

---

## Task 15: GitHub templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug-report.md`
- Create: `.github/ISSUE_TEMPLATE/feature-request.md`
- Create: `.github/ISSUE_TEMPLATE/new-stack-template.md`

- [ ] **Step 1: Create issue templates**

Standard GitHub issue templates for: bug reports, feature requests, new stack contributions.

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "chore: add GitHub issue templates"
```

---

## Task 16: Validation and push

- [ ] **Step 1: Run shellcheck on all hooks**

```bash
shellcheck packages/core/hooks/*.sh packages/stack-hooks/**/*.sh setup.sh
```

Fix any issues.

- [ ] **Step 2: Verify file counts**

```bash
find packages/core/agents -name "*.md" | wc -l  # expect 16
find packages/core/commands -name "*.md" | wc -l  # expect 8
find packages/core/hooks -name "*.sh" | wc -l    # expect 7
find packages/core/rules -name "*.md" | wc -l    # expect 3
find packages/core/skills -name "SKILL.md" | wc -l # expect 3
find packages/stack-agents -name "*.md" | wc -l  # expect 4
find packages/stack-hooks -name "*.sh" | wc -l   # expect 5
find packages/extras -name "*.md" | wc -l        # expect 2
```

- [ ] **Step 3: Verify root files exist**

```bash
ls -la packages/core/settings.json  # settings with hooks wiring
ls -la packages/core/CLAUDE.md      # template with TODOs
ls -la setup.sh                     # must be executable
ls -la README.md CONTRIBUTING.md LICENSE
test -x setup.sh && echo "setup.sh is executable" || echo "FAIL: setup.sh not executable"
```

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 5: Verify on GitHub**

Open https://github.com/RaNDoM6913/claude-code-superkit — verify all files visible.

---

## Scope Note

**This plan covers Plan 1 (Superkit Core) only.** Two additional plans will follow:
- **Plan 2: TGApp Refactor** — delete/merge commands, convert to agents, merge rules in TGApp `.claude/`
- **Plan 3: Docs & Showcase** — 9-chapter guide (`docs/guide/`), 3 examples (`docs/examples/`), sanitized showcase (`packages/showcase/`), full README
