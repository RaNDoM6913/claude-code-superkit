---
name: dev-orchestrator
description: Coordinate development across planning, implementation, verification, and review gates when a task needs multiple dependent steps or consequential decisions.
user-invocable: true
tokens: 4029
---

# Development Orchestrator

Run the development cycle for the user's request as 16 numbered phases (0-15). Read each referenced skill and preserve its authority and verdict contract. Use available, authorized delegation with explicit model/effort and scoped clean-context packets following project routing; otherwise execute suitable roles inline and disclose self-review. Do not waive a required independent or Astra acceptance gate when that capability is unavailable.

## Task

Parse the user's request to determine scope and parameters.

## Hard Rules

1. Execute phases in order 0 -> 15. Skip a phase ONLY when the Skip Matrix says so for the task's declared complexity class.
2. A phase is complete only when its **Done when** condition holds. If a phase produces errors, fix them before advancing.
3. Consume gate verdicts exactly as produced: plan-checker -> PASS/REVISE/BLOCK; evaluator -> PROCEED/ITERATE/ESCALATE; goal-verifier -> PASS/NEEDS-ATTENTION/NEEDS-REMEDIATION; critic -> APPROVE/CONCERN/BLOCK.
4. Gate roles review only. The coordinator assigns separately authorized implementation work for corrections. Reuse evidence bound to unchanged relevant code, inputs, environment, and command/results; rerun for relevant changes or concrete uncertainty. On retry, state what changed; a missing tool or evidence is not an observed defect.
5. Never claim completion while mandatory criteria fail or remain unverified. Issue an incomplete checkpoint whenever blocked; the completion report requires every non-skipped phase to pass. Retry exhaustion is not acceptance.
6. If the task is ambiguous, ask the user before Phase 7 (Implement) -- not after.
7. Always read existing patterns before writing new code -- search first, reuse the closest implementation as reference.

## Phase Overview & Skip Matrix

Complexity (Simple / Standard / Complex) is decided in Phase 1 by risk and dependencies. Reassess it if new evidence changes the scope or risk; do not skip a required gate to preserve the original classification.

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
- Full-stack -> relevant cross-component contracts and architecture docs

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

3. **Assess complexity** by consequences, coupling, and uncertainty. Simple means a narrow low-risk change following a proven pattern. Standard needs coordinated implementation and behavioral acceptance. Complex includes consequential architecture, security/authority, data-loss or irreversible changes, or unresolved design risk. File and line counts may inform effort, but cannot reduce risk or waive a mandatory gate.

4. **Search the codebase** for existing related patterns: grep domain terms, endpoint paths, function names; read files that will be modified; check routing files and API specs (OpenAPI, GraphQL schema).

5. **Identify the closest existing implementation** and read it -- it is the reference pattern for Phase 7.

**Done when:** stack detected, complexity class declared, reference pattern read.

## Phase 2 -- Architect (Complex only)

Perform an architecture design pass following the **architect** skill:
```
Design the architecture for this task:
Task: [description]
Current architecture: [from Phase 0 docs]
Affected components: [from Phase 1]
Compare viable approaches and explain relevant trade-offs; do not invent alternatives.
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

## Phase 5 -- Contract

Write testable acceptance criteria -- Phase 8 evaluates exactly these:

```
## Sprint Contract
| # | Criterion | Test Method | Threshold | Priority |
|---|-----------|-------------|-----------|----------|
| 1 | [specific, testable outcome] | [grep / curl / test / read] | Score >= 7 | MUST |
| 2 | ... | ... | ... | MUST/SHOULD |
```

Threshold uses the evaluator's 0-10 scale -- default 7 unless a criterion warrants stricter. Good criteria are testable, specific ("returns 200 with user.id in JSON", not "endpoint works"), independent, and measurable. Never include subjective items ("code is clean") or unmeasurable ones ("performance is good").
**Done when:** every criterion has a concrete test method.

## Phase 6 -- Validate Plan

Validate the Phase 4 plan plus Phase 5 contract following the **plan-checker** skill.
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

Assess implementation against the Sprint Contract following the **evaluator** skill, passing the changed scope, bound evidence, pass number, and prior report. Preserve UNVERIFIED and N/A criterion results; never turn missing evidence into a zero score or a pass.
- **PROCEED** -> Phase 9.
- **ITERATE** -> assign the local correction or authorized evidence collection, then re-evaluate affected criteria as pass N+1. If the matrix budget is exhausted (Standard 2 / Complex 3), or correction makes no meaningful progress, stop this loop and report the unresolved mandatory criteria and next decision. Do not advance on a warning alone.
- **ESCALATE** -> route the stated cause: architect/Astra for design or consequential acceptance; contract owner for requirements; appropriate owner for missing authorization, tool, or external evidence. Resume at the affected phase only after resolution.
**Done when:** verdict is PROCEED and mandatory evidence is sufficient. Otherwise report incomplete.

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

Verify results against Phase 4 goals following the **goal-verifier** skill, passing changed scope and bound evidence. It assesses applicable levels: EXISTS -> SUBSTANTIVE -> WIRED -> DATA-FLOW; preserve justified N/A and unresolved UNVERIFIED results.
- **PASS** -> Phase 12.
- **NEEDS-ATTENTION** -> distinguish local fixes from missing evidence. Assign bounded corrections/checks, or report the dependency; never repeatedly retry an unavailable capability.
- **NEEDS-REMEDIATION** -> substantive goal mismatch or missing capability; return to Phase 7 (or Phase 4 if the plan itself was wrong).
**Done when:** verdict is PASS.

## Phase 12 -- Review

First, a 30-second inline self-pass on the diff: (a) no placeholders/TODOs/`unimplemented`, (b) types/signatures consistent with callers, (c) every acceptance criterion has a corresponding change. Fix the obvious now.

Then perform matching reviews with available skills and authorized delegation; inline passes are self-review. Use the mapping below to identify relevant expertise, and scope each pass to actual risk and requirements:

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

Perform a final quality gate following the **critic** skill over the changed scope, original task, and Phase 12 findings/evidence. Use relevant security, maintainer, and operations perspectives without a findings or predictions quota.
- **APPROVE** -> Phase 14.
- **CONCERN** -> address or document explicit non-blocking disposition; advance only when Progression is ALLOWED and no mandatory evidence/acceptance is missing.
- **BLOCK** -> resolve the stated defect, evidence gap, or acceptance dependency. Recheck affected scope; if it cannot be resolved within authority/capability, report incomplete.
**Done when:** verdict is APPROVE, or CONCERN with ALLOWED progression and justified non-blocking disposition. Repeated unsuccessful correction requires a bounded escalation, not an endless review loop.

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
| 11 | Verify Goals | done/skipped | PASS (all applicable mandatory levels) |
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
- No completion claims over failed or unverified mandatory criteria; report incomplete at a blocker instead of advancing or hiding it behind exhausted retries.
- LOW-confidence findings go to Open Questions, never silently dropped.
- Conventional commits: `feat|fix|docs|refactor|chore|test|perf(scope): description`.
