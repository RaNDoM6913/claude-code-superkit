---
name: dev-orchestrator
description: Full-stack development orchestrator -- always-on, 16 phases (0-15): read-docs -> understand -> architect -> pseudocode -> plan -> contract -> validate -> implement -> evaluate -> verify -> test -> goals -> review -> critic -> document -> report
user-invocable: true
---

# Development Orchestrator

Run the full development cycle for the user's request as 16 numbered phases (0-15). You are the orchestrator AND the executor: Codex has no subagents, so wherever this skill says "perform X following the <name> skill", read `.codex/skills/<name>/SKILL.md` and execute its process inline yourself, then apply its verdict exactly as that skill defines it.

## Task

Parse the user's request to determine scope and parameters.

## Hard Rules

1. Execute phases in order 0 -> 15. Skip a phase ONLY when the Skip Matrix says so for the task's declared complexity class.
2. A phase is complete only when its **Done when** condition holds. If a phase produces errors, fix them before advancing.
3. Consume gate verdicts exactly as produced: plan-checker -> PASS/REVISE/BLOCK; evaluator -> PROCEED/ITERATE/ESCALATE; goal-verifier -> PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION; critic -> APPROVE/CONCERN/BLOCK.
4. Every gate is performed inline by following the named skill in `.codex/skills/<name>/SKILL.md`. On a failed gate or retry, state what you are retrying and what changed since the last attempt -- never silently re-run the same approach.
5. Never claim completion while compilation or tests fail. The Phase 15 report is emitted only after every non-skipped phase has run.
6. If the task is ambiguous, ask the user before Phase 7 (Implement) -- not after.
7. Always read existing patterns before writing new code -- search first, reuse the closest implementation as reference.

## Phase Overview & Skip Matrix

Complexity (Simple / Standard / Complex) is decided in Phase 1 and never changes mid-run.

| # | Phase | Simple | Standard | Complex | Gate skill |
|---|-------|:------:|:--------:|:-------:|-----------|
| 0 | Read Docs | yes | yes | yes | - |
| 1 | Understand | yes | yes | yes | - |
| 2 | Architect | - | - | yes | architect |
| 3 | Pseudocode | - | - | yes | - |
| 4 | Plan | yes | yes | yes | - |
| 5 | Contract | - | yes | yes | - |
| 6 | Validate Plan | - | yes | yes | plan-checker |
| 7 | Implement | yes | yes | yes | - |
| 8 | Evaluate | - | yes (max 2 passes) | yes (max 3 passes) | evaluator |
| 9 | Verify | yes | yes | yes | health-checker |
| 10 | Test | yes | yes | yes | test-generator |
| 11 | Verify Goals | - | yes | yes | goal-verifier |
| 12 | Review | yes | yes | yes | reviewer skills |
| 13 | Critic | - | - | yes | critic |
| 14 | Document | yes | yes | yes | docs-reviewer |
| 15 | Report | yes | yes | yes | - |

Simple skips phases 2, 3, 5, 6, 8, 11, 13. Standard skips 2, 3, 13. Complex runs all 16.

## Phase 0 -- Read Docs

Read `docs/architecture/` files relevant to the task scope:
- Backend task -> `backend-layers.md`, `api-reference.md`, `database-schema.md`
- Frontend task -> `frontend-state.md`
- Auth task -> `auth-and-sessions.md`
- Full-stack -> all available docs

Missing docs are not an error -- note what was absent and continue.
**Done when:** relevant existing docs are read (or confirmed absent).

## Phase 1 -- Understand

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

3. **Assess complexity** -- score each of 5 factors, majority column wins (ties -> Standard):

   | Factor | Simple | Standard | Complex |
   |--------|--------|----------|---------|
   | File count | 1 | 2-5 | 6+ |
   | Line changes | < 100 | 100-500 | 500+ |
   | Novelty | Existing pattern | New pattern in existing area | New subsystem |
   | Risk | Internal, no data changes | API change, DB migration | Auth, payments, security |
   | Ambiguity | Clear spec | Some unknowns | Exploratory/open-ended |

4. **Search the codebase** for existing related patterns: grep domain terms, endpoint paths, function names; read files that will be modified; check routing files and API specs (OpenAPI, GraphQL schema).

5. **Identify the closest existing implementation** and read it -- it is the reference pattern for Phase 7.

**Done when:** stack detected, complexity class declared, reference pattern read.

## Phase 2 -- Architect (Complex only)

Perform an architecture design pass inline following the **architect** skill:
```
Design the architecture for this task:
Task: [description]
Current architecture: [from Phase 0 docs]
Affected components: [from Phase 1]
Propose 2-3 approaches with trade-offs.
```
Use the recommendation to shape Phase 4.
**Done when:** one approach chosen, with a stated reason.

## Phase 3 -- Pseudocode (Complex only)

Draft language-agnostic pseudocode for the core logic (algorithm, state machine, data pipeline): input/output contract, main control flow, error paths, data transformations. 30-50 lines maximum -- longer means the task needs decomposition. No file paths, no framework syntax.

Present to the user: "Here's the pseudocode for [core logic]. Does this match your expectations?"
**Done when:** user approves (or explicitly waives) the pseudocode; it becomes the Phase 4 skeleton.

## Phase 4 -- Plan

Produce a checklist plan organized by component -- include only relevant sections. Use `update_plan` to track progress.

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

## Phase 5 -- Contract (Standard: 5-10 criteria; Complex: 10-20)

Write testable acceptance criteria -- Phase 8 evaluates exactly these:

```
## Sprint Contract
| # | Criterion | Test Method | Priority |
|---|-----------|-------------|----------|
| 1 | [specific, testable outcome] | [grep / curl / test / read] | MUST |
| 2 | ... | ... | MUST/SHOULD |
```

Good criteria are testable, specific ("returns 200 with user.id in JSON", not "endpoint works"), independent, and measurable. Never include subjective items ("code is clean") or unmeasurable ones ("performance is good").
**Done when:** every criterion has a concrete test method.

## Phase 6 -- Validate Plan

Validate the Phase 4 plan plus Phase 5 contract inline following the **plan-checker** skill.
- **PASS** -> Phase 7.
- **REVISE** -> fix the blocking issues, re-validate (max 2 iterations, then treat as BLOCK).
- **BLOCK** -> stop; present the issues to the user.
**Done when:** verdict is PASS.

## Phase 7 -- Implement

Execute the plan in dependency order; for each step, read the reference pattern first, then implement.

1. **Migration** -- next number in the project's migration directory; up + down files; parameterized DDL, `IF NOT EXISTS`, appropriate types.
2. **Data layer** -- follow the project's existing data-access patterns (Go: pgx/sqlx/gorm, nil-safe repos, `fmt.Errorf("Context.Method: %w", err)`; Python: SQLAlchemy/Django ORM; TypeScript: Prisma/TypeORM/Drizzle).
3. **Business logic** -- constructor DI via interfaces; Go: `context.Context` first param, domain errors; Python: type hints, async where applicable; TypeScript: strict types.
4. **Transport** -- follow existing handler patterns (chi, gin, echo, express, FastAPI, etc.); input validation at the boundary; errors mapped to proper status codes.
5. **Routes** -- register endpoints, apply auth/middleware.
6. **Frontend** -- read existing components first (animation library, styling, state); API client and types matching the backend contract.

**Done when:** every Phase 4 checklist item is implemented (no placeholders/TODOs left).

## Phase 8 -- Evaluate

Score the implementation against the Sprint Contract inline following the **evaluator** skill, passing the changed-file list and pass number.
- **PROCEED** -> Phase 9.
- **ITERATE** -> fix the critique, re-evaluate as pass N+1 with the full critique in context (Hard Rule 4). If passes exceed the matrix budget (Standard 2 / Complex 3) -> proceed with the warning "Evaluation budget exhausted after N passes. Remaining issues: [list]". If the score did not improve vs the previous pass -> proceed with an escalation note.
- **ESCALATE** -> perform a design review inline following the **architect** skill, apply its recommendation, restart from Phase 7.
**Done when:** verdict is PROCEED, or budget exhausted with an explicit warning.

## Phase 9 -- Verify

Follow the **health-checker** skill if present; otherwise run compilation checks directly:
- Go: `go vet ./...`
- TypeScript: `npx tsc --noEmit`
- Python: `mypy` / `pyright` / `python -m py_compile`
- Rust: `cargo check`

**Done when:** compilation/static checks pass with zero errors.

## Phase 10 -- Test

Generate tests for new/changed backend code following the **test-generator** skill: happy path, validation errors, not-found/conflict, boundary values, edge cases -- matching project test patterns. Then run the project's test command and fix failures.
**Done when:** the test suite runs green (paste the actual final summary line).

## Phase 11 -- Verify Goals

Verify results against the Phase 4 goals inline following the **goal-verifier** skill, passing the changed-file list. It checks 4 levels: EXISTS -> SUBSTANTIVE -> WIRED -> DATA-FLOW.
- **PASS** -> Phase 12.
- **NEEDS-ATTENTION** -> fix the listed gaps in place, re-verify.
- **NEEDS-REMEDIATION** -> critical artifacts missing; return to Phase 7 (or Phase 4 if the plan itself was wrong).
**Done when:** verdict is PASS.

## Phase 12 -- Review

First, a 30-second inline self-pass on the diff: (a) no placeholders/TODOs/`unimplemented`, (b) types/signatures consistent with callers, (c) every acceptance criterion has a corresponding change. Fix the obvious now.

Then perform each matching review inline, one skill at a time -- every row whose pattern matches changed files AND whose skill exists in `.codex/skills/`:

| Changed files | Skill |
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

For each skill, review the changed-file list against the task description, applying that skill's two-stage discipline (discover, then triage by Severity + Confidence).

Triage findings -- route, don't drop:
- CRITICAL or WARNING at HIGH/MEDIUM confidence -> fix before proceeding.
- LOW confidence / ambiguous -> carry into the **Open Questions** section of the Phase 15 report.
- A clean review (0 findings) is a valid result -- do not pad it.

**Done when:** all CRITICAL/WARNING findings fixed or explicitly deferred with reason.

## Phase 13 -- Critic (Complex only)

Perform a final quality gate inline following the **critic** skill, over all changed files, the original task, and the Phase 12 findings summary. It reviews from security, new-hire, and ops perspectives.
- **APPROVE** -> Phase 14.
- **CONCERN** -> address; proceed if explicitly non-blocking.
- **BLOCK** -> fix blocking issues, re-run the critic pass.
**Done when:** verdict is APPROVE, or CONCERN with all concerns addressed/answered.

## Phase 14 -- Document

Verify documentation completeness for the changed files following the **docs-reviewer** skill. Also update directly:
1. **API spec** (OpenAPI/GraphQL) if endpoints changed.
2. **Architecture docs** if system behavior changed.
3. **README** if setup, commands, or structure changed.
**Done when:** the docs-reviewer pass reports no MISSING items for this change.

## Phase 15 -- Report

Emit only after all non-skipped phases completed:

```
## Development Report

### Task
[Original task description]

### Phases Executed
| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Read Docs | done | N docs read |
| 1 | Understand | done | [components], [complexity] |
| 2 | Architect | done/skipped | [approach chosen / not Complex] |
| 3 | Pseudocode | done/skipped | |
| 4 | Plan | done | N items |
| 5 | Contract | done/skipped | N criteria |
| 6 | Validate Plan | done/skipped | PASS after N iterations |
| 7 | Implement | done | N created, M modified |
| 8 | Evaluate | done/skipped | PROCEED at pass N |
| 9 | Verify | done | compilation clean |
| 10 | Test | done | X tests green |
| 11 | Verify Goals | done/skipped | PASS (4/4 levels) |
| 12 | Review | done | [skills]: N findings fixed |
| 13 | Critic | done/skipped | APPROVE |
| 14 | Document | done | [docs updated] |
| 15 | Report | done | this report |

### Changes Made
| File | Action | Description |
|------|--------|-------------|

### Open Questions (LOW-confidence review items -- surfaced, not dropped)
- file:line -- suspicion + what would confirm it (omit section if none)

### Metrics
| Metric | Value |
|--------|-------|
| Complexity | Simple / Standard / Complex |
| Skill passes | N (list) |
| Evaluator passes | N (ITERATE -> ... -> PROCEED) |
| Sprint contract | X/Y criteria met |

### Suggested Commit Message
type(scope): description
```

Co-authorship trailers are optional; do not add one unless the project explicitly requires it.

## Recap -- non-negotiables

- Phases run in order 0 -> 15; the Skip Matrix is the only source of skips.
- Gate verdicts consumed verbatim (plan-checker PASS/REVISE/BLOCK, evaluator PROCEED/ITERATE/ESCALATE, goal-verifier PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION, critic APPROVE/CONCERN/BLOCK); failed gate -> retry with the critique in context and say so.
- No completion claims over failing builds/tests; report only after all non-skipped phases.
- LOW-confidence findings go to Open Questions, never silently dropped.
- Conventional commits: `feat|fix|docs|refactor|chore|test|perf(scope): description`.
