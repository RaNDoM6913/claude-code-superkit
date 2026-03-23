---
description: Full-stack development orchestrator — plan, implement, test, review, and document a feature or fix
argument-hint: <task-description>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Development Orchestrator

Automate the full development cycle: understand → plan → implement → test → review → document.

## Task

$ARGUMENTS

## Phase 1 — Understand

1. Parse the task description to determine scope:
   - **Backend**: new/changed endpoint, service logic, repo, migration
   - **Frontend (user)**: API client, types, UI component, hook
   - **Frontend (admin)**: admin page, API client, types
   - **Bot**: moderator or support bot changes
   - **Docs**: architecture docs, OpenAPI, CLAUDE.md, trees

2. Search the codebase for existing patterns related to the task:
   - Grep for relevant domain terms, endpoint paths, service names
   - Read existing files that will be modified or serve as templates
   - Check `backend/internal/app/apiapp/routes.go` for existing route patterns
   - Check `docs/architecture/backend-api-reference.md` for API contracts

3. Identify the **closest existing implementation** to use as a reference pattern. Always read it before writing new code.

## Phase 2 — Plan

Produce a structured plan before writing any code. Output the plan as a checklist:

```
## Implementation Plan

### Backend
- [ ] Migration: 000NNN_description (if new table/column needed)
- [ ] Repo: backend/internal/repo/postgres/xxx_repo.go (new methods or file)
- [ ] Service: backend/internal/services/xxx/service.go (business logic)
- [ ] DTO: backend/internal/transport/http/dto/ (if new request/response shapes)
- [ ] Handler: backend/internal/transport/http/handlers/xxx_handler.go
- [ ] Routes: backend/internal/app/apiapp/routes.go (register new routes)
- [ ] Tests: handler_test.go, service_test.go

### Frontend (user)
- [ ] Types: frontend/src/types/domain.ts (if new types)
- [ ] API client: frontend/src/api/xxx.ts (new API functions)
- [ ] Query keys: frontend/src/api/query-keys.ts (if using TanStack Query)
- [ ] Hook: frontend/src/hooks/useXxx.ts (if new hook needed)
- [ ] Screen/Component: frontend/src/pages/main/xxx.tsx or frontend/src/app/components/xxx.tsx
- [ ] Navigation: frontend/src/app/MainAppScreen.tsx or App.tsx (if new screen)

### Frontend (admin)
- [ ] Types: adminpanel/frontend/src/types/xxx.ts
- [ ] API client: adminpanel/frontend/src/lib/xxxApiLive.ts + xxxApiClient.ts
- [ ] Page: adminpanel/frontend/src/pages/xxx.tsx

### Bot
- [ ] Handler changes in tgbots/bot_moderator/ or tgbots/bot_support/

### Docs (mandatory if logic changed)
- [ ] docs/architecture/backend-api-reference.md (new/changed endpoints)
- [ ] docs/architecture/database-schema.md (new tables/columns)
- [ ] docs/architecture/xxx.md (relevant architecture doc)
- [ ] backend/docs/openapi.yaml (API spec)
- [ ] CLAUDE.md (Active Plans, API tables, Known Constraints)
```

Omit sections that are not relevant to the task. Wait for implicit confirmation (proceed immediately unless the plan is clearly wrong).

## Phase 3 — Implement

Execute the plan in dependency order. For each step, read the reference pattern first, then implement.

### Execution Order

1. **Migration** (if needed):
   - Find next migration number: `ls backend/migrations/ | sort | tail -2`
   - Create `000NNN_description.up.sql` and `000NNN_description.down.sql`
   - Follow conventions: `IF NOT EXISTS`, `TIMESTAMPTZ`, `BIGSERIAL`/`UUID`, `ON DELETE` clause, indexes

2. **Repository** (if needed):
   - Read the closest existing repo file for pattern
   - Constructor: `NewXxxRepo(pool *pgxpool.Pool) *XxxRepo`
   - `Ready() bool` method
   - Error wrapping: `fmt.Errorf("XxxRepo.Method: %w", err)`
   - Parameterized queries only (`$1, $2`)

3. **Service** (if needed):
   - Read the closest existing service for pattern
   - Constructor DI: `NewService(repo RepoInterface, ...) *Service`
   - `context.Context` as first param
   - Domain errors: `ErrNotFound`, `ErrValidation`, `ErrConflict`
   - Optional deps via `Attach*()` methods

4. **DTO** (if new request/response shapes):
   - JSON tags matching API contract
   - Validation in handler, not DTO

5. **Handler** (if needed):
   - Read the closest existing handler for pattern
   - Constructor-injected services
   - `(w http.ResponseWriter, r *http.Request)` signature
   - `httperrors.Write()` for responses
   - `errors.Is()` for error mapping to HTTP status

6. **Routes** (if needed):
   - Register in `backend/internal/app/apiapp/routes.go`
   - Apply auth middleware for `/v1/` routes
   - Apply admin auth for `/admin/` routes

7. **Frontend API client** (if needed):
   - Read existing `frontend/src/api/` files for pattern
   - Use `requestJSON<T>()` via `http.ts`
   - Add query keys to `query-keys.ts` if using TanStack Query

8. **Frontend types** (if needed):
   - Add to `frontend/src/types/domain.ts` or create new type file

9. **Frontend UI** (if needed):
   - Read existing screens for glass design system patterns
   - Use `m.div` (motion/react v12), never `motion.div`
   - Tailwind for styling, Lucide for icons
   - TanStack Query for server state, Zustand for client state

10. **Admin frontend** (if needed):
    - Live-only pattern: `xxxApiLive.ts` + `xxxApiClient.ts`
    - Types in `adminpanel/frontend/src/types/`

11. **Bot changes** (if needed):
    - Read existing bot handlers for pattern
    - Russian UI text, all buttons in Russian

## Phase 4 — Verify

Run compilation checks to catch errors early:

```bash
# Backend (if Go files changed)
cd /path/to/your-project/backend && go vet ./...

# Frontend (if TS/TSX files changed)
cd /path/to/your-project/frontend && npx tsc --noEmit

# Admin frontend (if admin TS/TSX files changed)
cd /path/to/your-project/adminpanel/frontend && npx tsc --noEmit
```

Fix any errors before proceeding.

## Phase 5 — Test

Dispatch the **test-generator** agent for new backend code:

```
Generate table-driven Go tests for the following new/changed files:
- [list handler, service, repo files created/modified]

Follow SocialApp test patterns:
- "should [behavior] when [condition]" naming
- httptest for handlers
- Mock interfaces for services
- Cover: happy path, validation errors, not found, conflict, boundary values
```

After tests are generated, run them:
```bash
cd /path/to/your-project/backend && go test ./... -count=1 -short
```

Fix any test failures.

## Phase 6 — Review

Dispatch relevant reviewer agents **in parallel** based on what changed:

| Changed Files | Agent |
|---|---|
| `backend/**/*.go` (not migrations, not tests) | **go-reviewer** |
| `backend/migrations/*.sql` | **migration-reviewer** |
| `frontend/src/**/*.tsx` | **ts-reviewer**, **onyx-ui-reviewer** |
| `frontend/src/**/*.ts` | **ts-reviewer** |
| `frontend/src/api/**` | **api-contract-sync** |
| `backend/**/*.go` + any handler | **security-scanner** |
| `tgbots/**/*.go` | **go-reviewer** |

For each triggered agent, pass:
```
Review the following new/changed files: [list files]
These implement: [task description]
```

Collect findings. Fix any CRITICAL or WARNING issues before proceeding.

## Phase 7 — Document

Update all relevant documentation (mandatory per CLAUDE.md rules):

1. **Architecture docs** (`docs/architecture/`):
   - `backend-api-reference.md` — if new/changed endpoints
   - `database-schema.md` — if new tables/columns/migrations
   - Other relevant docs based on what changed

2. **OpenAPI spec** (`backend/docs/openapi.yaml`) — if API endpoints changed

3. **CLAUDE.md** — update:
   - Active Plans section (add new or update existing)
   - API tables (if new endpoints)
   - Project Structure (if new files/dirs)
   - Migrations list (if new migration)
   - Known Constraints (if applicable)

4. **Project trees** (`docs/trees/`) — if file structure changed

## Phase 8 — Report

Output a summary:

```
## Development Report

### Task
[Original task description]

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| backend/migrations/000NNN_xxx.up.sql | Created | [description] |
| backend/internal/services/xxx/service.go | Modified | [description] |
| ... | ... | ... |

### Tests
- X tests generated, Y passing

### Review Findings
- go-reviewer: [PASS/WARN/FAIL]
- migration-reviewer: [PASS/WARN/FAIL]
- ...

### Documentation Updated
- [list of updated doc files]

### Suggested Commit Message
```
type(scope): description

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```
```

## Notes

- Always read existing patterns before generating new code — search-first rule
- Never skip tests for new endpoints
- Never skip documentation updates if logic changed
- Use conventional commit format: `feat|fix|docs|refactor|chore|test|perf(scope): description`
- If the task is ambiguous, ask for clarification before Phase 3
- If a phase produces errors, fix them before proceeding to the next phase
