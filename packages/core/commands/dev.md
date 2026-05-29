---
description: Full-stack development orchestrator — always-on, 16 phases: read-docs → understand → architect → pseudocode → plan → contract → validate → implement → evaluate → verify → test → goals → review → critic → document → report
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Development Orchestrator

Automate the full development cycle: understand → plan → contract → validate → implement → evaluate → verify → test → verify goals → review → document → report.

## Task

$ARGUMENTS

## Phase 0 — Read Project Docs

Before planning, read `docs/architecture/` files relevant to the task scope:
- Backend task? → read `backend-layers.md`, `api-reference.md`, `database-schema.md`
- Frontend task? → read `frontend-state.md`
- Auth task? → read `auth-and-sessions.md`
- Full-stack? → read all available docs

This ensures the plan follows existing project architecture.

## Phase 1 — Understand

1. **Detect project stack** by scanning the repository root and subdirectories:

   | Marker File | Stack |
   |---|---|
   | `go.mod` | Go backend |
   | `package.json` + `tsconfig.json` | TypeScript (check for React, Vue, Svelte, etc.) |
   | `pyproject.toml` / `setup.py` / `requirements.txt` | Python |
   | `Cargo.toml` | Rust |
   | `pom.xml` / `build.gradle` | Java/Kotlin |
   | `docker-compose.yml` | Docker infrastructure |
   | `migrations/` or `db/migrate/` | Database migrations |

   Record the detected stacks — they determine which tools, agents, and conventions apply.

2. **Parse the task description** to determine scope:
   - Which components are affected (backend, frontend, infra, bots, docs)?
   - Is this a new feature, enhancement, bug fix, or refactoring?
   - What are the inputs and expected outputs?

3. **Assess complexity** using 5 factors — this determines the workflow:

   | Factor | Simple | Standard | Complex |
   |--------|--------|----------|---------|
   | File count | 1 | 2-5 | 6+ |
   | Line changes | < 100 | 100-500 | 500+ |
   | Novelty | Existing pattern | New pattern in existing area | New subsystem |
   | Risk | Internal, no data changes | API change, DB migration | Auth, payments, security |
   | Ambiguity | Clear spec | Some unknowns | Exploratory/open-ended |

   Count how many factors fall in each column. Majority wins:
   - **Simple** (3+ factors in Simple) → skip Phases 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
   - **Standard** (default) → full workflow, max 2 evaluator passes
   - **Complex** (3+ factors in Complex) → full workflow + architect + critic, max 3 evaluator passes

4. **Search the codebase** for existing patterns related to the task:
   - Grep for relevant domain terms, endpoint paths, function names
   - Read existing files that will be modified or serve as templates
   - Check routing files for existing route patterns
   - Check API specs (OpenAPI, GraphQL schema) for contracts

5. **Identify the closest existing implementation** to use as a reference pattern. Always read it before writing new code.

## Phase 1.5 — Architect (complex tasks only)

**Only for complex tasks (5+ files, new subsystems, architectural decisions).**

Dispatch **architect** agent:
```
Design the architecture for this task:
Task: [description]
Current architecture: [from Phase 0 docs]
Affected components: [from Phase 1 analysis]

Propose 2-3 approaches with trade-offs.
```

Use the architect's recommendation to inform Phase 2 plan.

## Phase 1.7 — Pseudocode (complex tasks only)

**Only for complex tasks (5+ files, new subsystems, non-trivial algorithms).**

Before writing the full plan, draft pseudocode for the core algorithm or data flow. This validates the logical approach before committing to file paths and implementation details.

### Process

1. Identify the **core logic** that makes this task complex (e.g., the algorithm, state machine, data pipeline, coordination logic)
2. Write pseudocode that covers:
   - Input/output contract
   - Main control flow (loops, conditions, branching)
   - Error paths and edge cases
   - Data transformations
3. Present to user: "Here's the pseudocode for [core logic]. Does this match your expectations?"

### Format

```
FUNCTION processTask(input):
  VALIDATE input is not empty
  
  FOR EACH item IN input:
    result = transform(item)
    IF result.error:
      COLLECT error, CONTINUE
    STORE result
  
  IF errors > threshold:
    ROLLBACK all stored results
    RETURN failure(errors)
  
  RETURN success(results)
```

### Rules
- Keep pseudocode **language-agnostic** — no framework-specific syntax
- Focus on **logic**, not implementation details (no file paths, no imports)
- Maximum 30-50 lines — if longer, the task may need decomposition
- After user approval, use this pseudocode as the skeleton for Phase 2 plan

**Skip for simple/standard tasks.**

## Phase 2 — Plan

Produce a structured plan before writing any code. Output as a checklist, organized by component. Include only the relevant sections:

```
## Implementation Plan

### Database
- [ ] Migration: NNNN_description (if new table/column needed)

### Backend
- [ ] Repository/data layer: path/to/repo (new methods or file)
- [ ] Service/business logic: path/to/service
- [ ] DTOs/schemas: path/to/dto (if new request/response shapes)
- [ ] Handler/controller: path/to/handler
- [ ] Routes: path/to/routes (register new endpoints)
- [ ] Tests: path/to/tests

### Frontend
- [ ] Types: path/to/types (if new types)
- [ ] API client: path/to/api (new API functions)
- [ ] State management: path/to/store (if new state needed)
- [ ] Component/page: path/to/component

### Infrastructure
- [ ] Docker/config changes

### Documentation
- [ ] API spec (OpenAPI, GraphQL schema)
- [ ] Architecture docs
- [ ] README updates
```

Omit sections not relevant to the task.

## Phase 2.1 — Sprint Contract (standard and complex tasks)

Generate testable acceptance criteria for the implementation plan. These criteria are what the **evaluator** agent will check in Phase 3.5.

### Contract Size
- **Simple:** skip (no contract needed)
- **Standard:** 5-10 criteria
- **Complex:** 10-20 criteria

### Contract Format

```
## Sprint Contract

### Acceptance Criteria
| # | Criterion | Test Method | Threshold | Priority |
|---|-----------|------------|-----------|----------|
| 1 | [specific, testable outcome] | [how to verify: grep, curl, test, read] | Score >= 7 | MUST |
| 2 | ... | ... | ... | MUST/SHOULD |
```

### Good Criteria
- **Testable** — verifiable by reading code or running a command
- **Specific** — "returns 200 with JSON containing user.id" not "endpoint works"
- **Independent** — each criterion tests one thing
- **Measurable** — clear pass/fail, not subjective

### Bad Criteria (do NOT include)
- "Code is clean" — subjective, reviewer's job
- "Performance is good" — unmeasurable without benchmark
- "Everything works" — too vague

Pass the Sprint Contract to the **plan-checker** in Phase 2.5 for validation alongside the plan.

**Skip for simple tasks.**

## Phase 2.5 — Validate Plan

Dispatch **plan-checker** agent with the plan from Phase 2:

```
Validate this implementation plan before execution.
Plan: {full plan text}
```

**PASS** → proceed to Phase 3.
**REVISE** → fix blocking issues, re-run plan-checker (max 2 iterations).
**BLOCK** → stop, present issues to user.

**Skip for simple tasks** (1 file, < 100 lines).

## Phase 3 — Implement

Execute the plan in dependency order. For each step, read the reference pattern first, then implement.

### Execution Order

1. **Migration** (if needed):
   - Find the next migration number in the project's migration directory
   - Create up + down migration files following project conventions
   - Use parameterized queries, `IF NOT EXISTS`, appropriate types

2. **Data layer** (repository/model):
   - Follow the project's existing patterns for data access
   - Go: pgx/sqlx/gorm patterns, `Ready()` nil-safety, `fmt.Errorf("Context.Method: %w", err)`
   - Python: SQLAlchemy/Django ORM/raw patterns
   - TypeScript: Prisma/TypeORM/Drizzle patterns

3. **Business logic** (service layer):
   - Constructor dependency injection via interfaces
   - Go: `context.Context` as first param, domain errors
   - Python: type hints, async where applicable
   - TypeScript: strict types, proper error handling

4. **Transport layer** (handlers/controllers):
   - Follow existing handler patterns for the framework (chi, gin, echo, express, FastAPI, etc.)
   - Input validation at the boundary
   - Proper error mapping to HTTP status codes

5. **Routes** (if needed):
   - Register new endpoints in the router file
   - Apply appropriate auth/middleware

6. **Frontend** (if needed):
   - Read existing components for patterns (animation library, styling approach, state management)
   - API client using project conventions
   - Types matching the backend contract

## Phase 3.5 — Evaluate + Iterate (standard and complex tasks)

Dispatch the **evaluator** agent with the Sprint Contract and changed files:

```
Evaluate this implementation against the Sprint Contract.
Sprint Contract: {contract from Phase 2.1}
Changed Files: {list from Phase 3}
Pass Number: 1
```

**Conditional iteration (GAN loop):**

1. If evaluator verdict = **PROCEED** → all criteria PASS → proceed to Phase 4
2. If evaluator verdict = **ITERATE**:
   - On a failed gate or retry, escalate effort to `max` for the next attempt and state that you are doing so. Do not silently re-run at the same effort.
   - Fix issues identified in the critique
   - Re-dispatch evaluator (pass N+1)
   - If pass count > MAX_PASSES → proceed to Phase 4 with warning:
     "Evaluation budget exhausted after N passes. Remaining issues: [list]"
   - If scores not improving (pass N score <= pass N-1) → proceed with escalation note
3. If evaluator verdict = **ESCALATE**:
   - Dispatch **architect** agent for design review
   - Apply recommendation, restart from Phase 3

**MAX_PASSES:** Simple: 0 (skip), Standard: 2, Complex: 3

**Skip for simple tasks.**

## Phase 4 — Verify

Dispatch the **health-checker** agent (if available) or run compilation checks directly:

```
Based on detected stack, run:

Go:        go vet ./...
TypeScript: npx tsc --noEmit
Python:     python -m py_compile / mypy / pyright
Rust:       cargo check
```

Fix any errors before proceeding.

## Phase 5 — Test

Dispatch the **test-generator** agent (if available) for new backend code:

```
Generate tests for the following new/changed files:
- [list files created/modified]

Follow project test patterns. Cover:
- Happy path
- Validation errors
- Not found / conflict
- Boundary values
- Edge cases
```

After tests are generated, run them using the project's test command. Fix any failures.

## Phase 5.5 — Verify Goals

Dispatch **goal-verifier** agent:

```
Verify implementation results match the original goals.
Goals: {from Phase 2 plan}
Changed files: {list from Phase 3}
```

4-level check: EXISTS → SUBSTANTIVE → WIRED → DATA-FLOW.

**PASS** → proceed to Phase 6.
**NEEDS-ATTENTION** → fix the listed gaps in place, re-verify.
**NEEDS-REMEDIATION** → return to Phase 3 / re-plan — critical artifacts missing.

**Skip for simple tasks** (1 file, < 100 lines).

## Phase 6 — Review

**Inline self-review (fast, before subagent gates):** Before dispatching reviewers, do a 30-second self-pass on the diff: (a) no placeholders/TODOs/`unimplemented` left, (b) types/signatures consistent with callers, (c) every acceptance criterion has a corresponding change. Fix obvious issues now so the expensive adversarial gates focus on real risk.

Dispatch reviewer agents **in parallel** based on what changed and what's available:

| Changed Files | Agent |
|---|---|
| `*.go` (not migrations, not tests) | **go-reviewer**, **security-scanner** |
| `*.sql` migrations | **migration-reviewer**, **database-reviewer** |
| `*_repo.go` or data access files | **database-reviewer** |
| `*.tsx`, `*.ts` | **ts-reviewer** |
| `*.py` | **py-reviewer** (if available) |
| `*.rs` | **rs-reviewer** (if available) |
| Bot code | **bot-reviewer** (if available) |
| UI components | **design-system-reviewer** (if available) |

For each triggered agent, pass the list of changed files and the task description.
Each reviewer runs its two-stage discipline — discover every candidate finding, then triage by Severity + Confidence.

Collect findings and triage (route, don't drop):
- Fix any CRITICAL or WARNING issue (HIGH/MEDIUM confidence) before proceeding.
- Carry LOW-confidence / ambiguous items into an **Open Questions** list in the Phase 8 report rather than discarding them — a human can adjudicate.
- A clean review (no findings) is a valid result; do not pad it.

## Phase 6.5 — Critic (complex tasks only)

**Only for complex tasks (5+ files, new subsystems, security-sensitive changes).**

Dispatch **critic** agent with all changed files and the original task:

```
Final quality gate for this implementation:
Task: [original description]
Changed files: [list]
Review findings: [summary from Phase 6]

Evaluate from security, new-hire, and ops perspectives.
```

**APPROVE** → proceed to Phase 7.
**CONCERN** → address concerns, proceed if non-blocking.
**BLOCK** → fix blocking issues, re-run critic.

**Skip for simple/standard tasks and --quick mode.**

## Phase 7 — Document

Dispatch the **docs-reviewer** agent to verify documentation completeness:
```
Verify documentation was updated for these changes: [list changed files]
```

Also manually update:
1. **API spec** — if endpoints changed (OpenAPI, GraphQL schema, etc.)
2. **Architecture docs** — if system behavior changed
3. **README** — if setup steps, commands, or project structure changed

## Phase 8 — Report

Output a summary:

```
## Development Report

### Task
[Original task description]

### Phases Executed
| Phase | Status | Notes |
|-------|--------|-------|
| 0. Read Docs | ✅ | Read N architecture docs |
| 1. Understand | ✅ | Scope: [components], [complexity] |
| 1.5 Architect | ⏭ skipped | Standard complexity |
| 2. Plan | ✅ | N tasks planned |
| 2.1 Contract | ✅ | N acceptance criteria |
| 2.5 Validate | ✅ PASS | 0 blocking |
| 3. Implement | ✅ | N files created, M modified |
| 3.5 Evaluate | ✅ PASS | Pass 1: X/Y criteria met |
| 4. Verify | ✅ | Compilation clean |
| 5. Test | ✅ | X tests, all passing |
| 5.5 Goals | ✅ PASS | All 4 levels pass |
| 6. Review | ✅ | [agents]: PASS |
| 6.5 Critic | ⏭ skipped | Standard complexity |
| 7. Document | ✅ | Updated [doc files] |

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| path/to/file | Created/Modified | [description] |
| ... | ... | ... |

### Open Questions (from Phase 6 review — LOW confidence / unconfirmed, not dropped)
- file:line — what a reviewer suspected and what context would confirm it
- (omit this section if reviewers raised none)

### Metrics
| Metric | Value |
|--------|-------|
| Complexity | Simple / Standard / Complex |
| Agent dispatches | N (list agents) |
| Evaluation passes | N (FAIL → ... → PASS) |
| Sprint contract | X/Y criteria PASS |

### Suggested Commit Message
```
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
```
```

## Notes

- Always read existing patterns before generating new code — search first
- Never skip tests for new endpoints or business logic
- If the task is ambiguous, ask for clarification before Phase 3
- If a phase produces errors, fix them before proceeding to the next phase
- Use conventional commit format: `feat|fix|docs|refactor|chore|test|perf(scope): description`
- Simple tasks skip Phases 1.5, 2.1, 2.5, 3.5, 5.5, 6.5
