---
description: Full-stack development orchestrator — understand, plan, validate, implement, verify, test, verify goals, review, document, report
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Development Orchestrator

Automate the full development cycle: understand → plan → validate → implement → verify → test → verify goals → review → document → report.

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

3. **Assess complexity** — this determines the workflow:
   - **Simple** (1 file, < 100 lines) → skip to Phase 3, no plan needed
   - **Standard** (2-5 files) → full workflow with plan
   - **Complex** (5+ files, cross-cutting, architectural decisions) → dispatch **architect** agent first

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

**VERIFIED** → proceed to Phase 6.
**PARTIAL** → fix data-flow issues, re-verify.
**FAILED** → return to Phase 3 — critical artifacts missing.

**Skip for simple tasks** (1 file, < 100 lines).

## Phase 6 — Review

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
Collect findings. Fix any CRITICAL or WARNING issues before proceeding.

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
| 2.5 Validate | ✅ PASS | 0 blocking |
| 3. Implement | ✅ | N files created, M modified |
| 4. Verify | ✅ | Compilation clean |
| 5. Test | ✅ | X tests, all passing |
| 5.5 Goals | ✅ VERIFIED | All 4 levels pass |
| 6. Review | ✅ | [agents]: PASS |
| 7. Document | ✅ | Updated [doc files] |

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| path/to/file | Created/Modified | [description] |
| ... | ... | ... |

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
- Simple tasks (1 file, < 100 lines) skip Phases 1.5, 2.5, 5.5
