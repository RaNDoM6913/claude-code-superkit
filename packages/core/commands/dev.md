---
description: Full-stack development orchestrator — always-on, 16 phases (0–15): read-docs → understand → architect → pseudocode → plan → contract → validate → implement → evaluate → verify → test → goals → review → critic → document → report
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Development Orchestrator

Run the full development cycle for the task below as 16 numbered phases. You are the orchestrator: you execute phases yourself and dispatch specialist agents at the gates.

## Task

$ARGUMENTS

## Hard Rules

1. Execute phases in order 0 → 15. Skip a phase ONLY when the Skip Matrix says so for the task's complexity class.
2. A phase is complete only when its **Done when** condition holds. If a phase produces errors, fix them before advancing.
3. Consume gate verdicts exactly as produced: plan-checker → PASS/REVISE/BLOCK · evaluator → PROCEED/ITERATE/ESCALATE · goal-verifier → PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION · critic → APPROVE/CONCERN/BLOCK.
4. On any failed gate or retry, escalate effort to `max` for the next attempt and say you are doing so — never silently re-run at the same effort.
5. Never claim completion while compilation or tests fail. The Phase 15 report is emitted only after every non-skipped phase has run.
6. If the task is ambiguous, ask the user before Phase 7 (Implement) — not after.
7. Always read existing patterns before writing new code — search first, reuse the closest implementation as reference.

## Phase Overview & Skip Matrix

Complexity (Simple / Standard / Complex) is decided in Phase 1 and never changes mid-run.

| # | Phase | Simple | Standard | Complex | Gate agent |
|---|-------|:------:|:--------:|:-------:|-----------|
| 0 | Read Docs | ✓ | ✓ | ✓ | — |
| 1 | Understand | ✓ | ✓ | ✓ | — |
| 2 | Architect | — | — | ✓ | architect |
| 3 | Pseudocode | — | — | ✓ | — |
| 4 | Plan | ✓ | ✓ | ✓ | — |
| 5 | Contract | — | ✓ | ✓ | — |
| 6 | Validate Plan | — | ✓ | ✓ | plan-checker |
| 7 | Implement | ✓ | ✓ | ✓ | — |
| 8 | Evaluate | — | ✓ (max 2 passes) | ✓ (max 3 passes) | evaluator |
| 9 | Verify | ✓ | ✓ | ✓ | health-checker |
| 10 | Test | ✓ | ✓ | ✓ | test-generator |
| 11 | Verify Goals | — | ✓ | ✓ | goal-verifier |
| 12 | Review | ✓ | ✓ | ✓ | reviewers (parallel) |
| 13 | Critic | — | — | ✓ | critic |
| 14 | Document | ✓ | ✓ | ✓ | docs-reviewer |
| 15 | Report | ✓ | ✓ | ✓ | — |

## Phase 0 — Read Docs

Read `docs/architecture/` files relevant to the task scope:
- Backend task → `backend-layers.md`, `api-reference.md`, `database-schema.md`
- Frontend task → `frontend-state.md`
- Auth task → `auth-and-sessions.md`
- Full-stack → all available docs

Missing docs are not an error — note what was absent and continue.
**Done when:** relevant existing docs are read (or confirmed absent).

## Phase 1 — Understand

1. **Detect the stack** by scanning the repository root and subdirectories:

   | Marker file | Stack |
   |---|---|
   | `go.mod` | Go backend |
   | `package.json` + `tsconfig.json` | TypeScript (check for React, Vue, Svelte, etc.) |
   | `pyproject.toml` / `setup.py` / `requirements.txt` | Python |
   | `Cargo.toml` | Rust |
   | `pom.xml` / `build.gradle` | Java/Kotlin |
   | `docker-compose.yml` | Docker infrastructure |
   | `migrations/` or `db/migrate/` | Database migrations |

2. **Parse the task**: affected components (backend, frontend, infra, bots, docs); feature / enhancement / bug fix / refactor; inputs and expected outputs.

3. **Assess complexity** — score each of 5 factors, majority column wins (ties → Standard):

   | Factor | Simple | Standard | Complex |
   |--------|--------|----------|---------|
   | File count | 1 | 2–5 | 6+ |
   | Line changes | < 100 | 100–500 | 500+ |
   | Novelty | Existing pattern | New pattern in existing area | New subsystem |
   | Risk | Internal, no data changes | API change, DB migration | Auth, payments, security |
   | Ambiguity | Clear spec | Some unknowns | Exploratory/open-ended |

4. **Search the codebase** for existing related patterns: grep domain terms, endpoint paths, function names; read files that will be modified; check routing files and API specs.

5. **Identify the closest existing implementation** and read it — it is the reference pattern for Phase 7.

**Done when:** stack detected, complexity class declared, reference pattern read.

## Phase 2 — Architect (Complex only)

Dispatch **architect**:
```
Design the architecture for this task:
Task: [description]
Current architecture: [from Phase 0 docs]
Affected components: [from Phase 1]
Propose 2-3 approaches with trade-offs.
```
Use the recommendation to shape Phase 4.
**Done when:** one approach chosen, with a stated reason.

## Phase 3 — Pseudocode (Complex only)

Draft language-agnostic pseudocode for the core logic (algorithm, state machine, data pipeline): input/output contract, main control flow, error paths, data transformations. 30–50 lines maximum — longer means the task needs decomposition. No file paths, no framework syntax.

Present to the user: "Here's the pseudocode for [core logic]. Does this match your expectations?"
**Done when:** user approves (or explicitly waives) the pseudocode; it becomes the Phase 4 skeleton.

## Phase 4 — Plan

Produce a checklist plan organized by component — include only relevant sections:

```
## Implementation Plan
### Database
- [ ] Migration: NNNN_description
### Backend
- [ ] Repository/data layer: path
- [ ] Service/business logic: path
- [ ] DTOs/schemas: path
- [ ] Handler/controller: path
- [ ] Routes: path
- [ ] Tests: path
### Frontend
- [ ] Types / API client / state / component: paths
### Infrastructure
- [ ] Docker/config changes
### Documentation
- [ ] API spec, architecture docs, README
```

**Done when:** every planned item names a concrete file path.

## Phase 5 — Contract (Standard: 5–10 criteria · Complex: 10–20)

Write testable acceptance criteria — the evaluator checks exactly these in Phase 8:

```
## Sprint Contract
| # | Criterion | Test Method | Threshold | Priority |
|---|-----------|-------------|-----------|----------|
| 1 | [specific, testable outcome] | [grep / curl / test / read] | Score ≥ 7 | MUST |
| 2 | ... | ... | ... | MUST/SHOULD |
```

Threshold uses the evaluator's 0–10 scale — default 7 unless a criterion warrants stricter. Good criteria are testable, specific ("returns 200 with user.id in JSON", not "endpoint works"), independent, and measurable. Never include subjective items ("code is clean") or unmeasurable ones ("performance is good").
**Done when:** every criterion has a concrete test method.

## Phase 6 — Validate Plan

Dispatch **plan-checker** with the Phase 4 plan and Phase 5 contract.
- **PASS** → Phase 7.
- **REVISE** → fix the blocking issues, re-dispatch (max 2 iterations, then treat as BLOCK).
- **BLOCK** → stop; present the issues to the user.
**Done when:** verdict is PASS.

## Phase 7 — Implement

Execute the plan in dependency order; for each step, read the reference pattern first, then implement.

1. **Migration** — next number in the project's migration directory; up + down files; parameterized DDL, `IF NOT EXISTS`, appropriate types.
2. **Data layer** — follow the project's existing data-access patterns (Go: pgx/sqlx/gorm, nil-safe repos, `fmt.Errorf("Context.Method: %w", err)`; Python: SQLAlchemy/Django ORM; TypeScript: Prisma/TypeORM/Drizzle).
3. **Business logic** — constructor DI via interfaces; Go: `context.Context` first param, domain errors; Python: type hints, async where applicable; TypeScript: strict types.
4. **Transport** — follow existing handler patterns (chi, gin, echo, express, FastAPI, …); input validation at the boundary; errors mapped to proper status codes.
5. **Routes** — register endpoints, apply auth/middleware.
6. **Frontend** — read existing components first (animation library, styling, state); API client and types matching the backend contract.

**Done when:** every Phase 4 checklist item is implemented (no placeholders/TODOs left).

## Phase 8 — Evaluate

Dispatch **evaluator** with the Sprint Contract, changed-file list, pass number, and — on pass 2+ — the previous evaluation report.
- **PROCEED** → Phase 9.
- **ITERATE** → escalate effort to `max` (Hard Rule 4), fix the critique, re-dispatch as pass N+1. If passes exceed the matrix budget (Standard 2 / Complex 3) → proceed with the warning "Evaluation budget exhausted after N passes. Remaining issues: [list]". If the score did not improve vs the previous pass → proceed with an escalation note.
- **ESCALATE** → dispatch **architect** for design review, apply its recommendation, restart from Phase 7.
**Done when:** verdict is PROCEED, or budget exhausted with an explicit warning.

## Phase 9 — Verify

Dispatch **health-checker** if available; otherwise run compilation checks directly:
Go `go vet ./...` · TypeScript `npx tsc --noEmit` · Python `mypy`/`pyright`/`python -m py_compile` · Rust `cargo check`.
**Done when:** compilation/static checks pass with zero errors.

## Phase 10 — Test

Dispatch **test-generator** if available — otherwise write the tests yourself — for new/changed backend code: happy path, validation errors, not-found/conflict, boundary values, edge cases — following project test patterns. Then run the project's test command yourself and fix failures.
**Done when:** the test suite runs green (paste the actual final summary line).

## Phase 11 — Verify Goals

Dispatch **goal-verifier** with the Phase 4 goals and changed files. It checks 4 levels: EXISTS → SUBSTANTIVE → WIRED → DATA-FLOW.
- **PASS** → Phase 12.
- **NEEDS-ATTENTION** → fix the listed gaps in place, re-verify.
- **NEEDS-REMEDIATION** → critical artifacts missing; return to Phase 7 (or Phase 4 if the plan itself was wrong).
**Done when:** verdict is PASS.

## Phase 12 — Review

First, a 30-second inline self-pass on the diff: (a) no placeholders/TODOs/`unimplemented`, (b) types/signatures consistent with callers, (c) every acceptance criterion has a corresponding change. Fix the obvious now.

Then dispatch reviewer agents **in parallel** — every row whose pattern matches changed files AND whose agent exists in `.claude/agents/`:

| Changed files | Agent |
|---|---|
| `*.go` (not migrations, not tests) | **go-reviewer**, **security-scanner** |
| `*.sql` migrations | **migration-reviewer**, **database-reviewer** |
| Data-access files (`*_repo.go`, repositories) | **database-reviewer** |
| `*.ts`, `*.tsx` | **ts-reviewer** |
| `*.py` | **py-reviewer**, **security-scanner** |
| `*.rs` | **rs-reviewer** |
| Bot code | **bot-reviewer** |
| UI components | **design-system-reviewer**, **ui-reviewer** |
| OpenAPI/GraphQL spec changed | **api-contract-sync** |
| Any changed code | **silent-failure-hunter**, **comment-rot-analyzer** |

Pass each agent the changed-file list and task description. Each runs its own two-stage discipline (discover, then triage by Severity + Confidence).

Go path, opt-in: if a gopls MCP server is registered, Go edits use `go_symbol_references` (blast radius) before touching a definition and `go_diagnostics` after — never assume the server is wired.

Triage findings — route, don't drop:
- CRITICAL or WARNING at HIGH/MEDIUM confidence → fix before proceeding.
- LOW confidence / ambiguous → carry into the **Open Questions** section of the Phase 15 report.
- A clean review (0 findings) is a valid result — do not pad it.

**Done when:** all CRITICAL/WARNING findings fixed or explicitly deferred with reason.

## Phase 13 — Critic (Complex only)

Dispatch **critic** with all changed files, the original task, and the Phase 12 findings summary. It reviews from security, new-hire, and ops perspectives.
- **APPROVE** → Phase 14.
- **CONCERN** → address; proceed if explicitly non-blocking.
- **BLOCK** → fix blocking issues, re-dispatch.
**Done when:** verdict is APPROVE, or CONCERN with all concerns addressed/answered.

## Phase 14 — Document

Dispatch **docs-reviewer** to verify documentation completeness for the changed files. Also update directly:
1. **API spec** (OpenAPI/GraphQL) if endpoints changed.
2. **Architecture docs** if system behavior changed.
3. **README** if setup, commands, or structure changed.
**Done when:** docs-reviewer reports no MISSING items for this change.

## Phase 15 — Report

Emit only after all non-skipped phases completed:

```
## Development Report

### Task
[Original task description]

### Phases Executed
| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Read Docs | ✅ | N docs read |
| 1 | Understand | ✅ | [components], [complexity] |
| 2 | Architect | ⏭/✅ | [skipped: not Complex / approach chosen] |
| 3 | Pseudocode | ⏭/✅ | |
| 4 | Plan | ✅ | N items |
| 5 | Contract | ⏭/✅ | N criteria |
| 6 | Validate Plan | ⏭/✅ | PASS after N iterations |
| 7 | Implement | ✅ | N created, M modified |
| 8 | Evaluate | ⏭/✅ | PROCEED at pass N |
| 9 | Verify | ✅ | compilation clean |
| 10 | Test | ✅ | X tests green |
| 11 | Verify Goals | ⏭/✅ | PASS (4/4 levels) |
| 12 | Review | ✅ | [agents]: N findings fixed |
| 13 | Critic | ⏭/✅ | APPROVE |
| 14 | Document | ✅ | [docs updated] |
| 15 | Report | ✅ | this report |

### Changes Made
| File | Action | Description |
|------|--------|-------------|

### Open Questions (LOW-confidence review items — surfaced, not dropped)
- file:line — suspicion + what would confirm it (omit section if none)

### Metrics
| Metric | Value |
|--------|-------|
| Complexity | Simple / Standard / Complex |
| Agent dispatches | N (list) |
| Evaluator passes | N (ITERATE → … → PROCEED) |
| Sprint contract | X/Y criteria met |

### Suggested Commit Message
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Recap — non-negotiables

- Phases run in order; Skip Matrix is the only source of skips.
- Gate verdicts consumed verbatim; failed gate → retry at `max` effort, say so.
- No completion claims over failing builds/tests; report only after all non-skipped phases.
- LOW-confidence findings go to Open Questions, never silently dropped.
- Conventional commits: `feat|fix|docs|refactor|chore|test|perf(scope): description`.
