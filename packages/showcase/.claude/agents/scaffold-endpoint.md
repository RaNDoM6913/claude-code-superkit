---
name: scaffold-endpoint
description: Scaffold a new admin API endpoint following project patterns (handler + service + repo)
model: opus
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Scaffold New Endpoint

Create a new admin API endpoint following the project's layered architecture.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. `docs/architecture/` — relevant architecture docs for the task at hand

**Use this context to:**
- Know project-specific conventions and patterns
- Identify documented rules to check with HIGH confidence
- Understand the tech stack and framework in use

## Phase 1 — Find Reference Pattern

1. Read `backend/internal/app/apiapp/routes.go` to understand existing route patterns
2. Find the **closest existing endpoint** to the requested one (grep for similar domain terms)
3. Read the reference handler, service, and repo files

## Phase 2 — Scaffold

### 1. Handler (Transport Layer)
Location: `backend/internal/transport/http/handlers/`

Pattern:
- Struct with service dependency injected via constructor
- Methods: `(w http.ResponseWriter, r *http.Request)`
- Extract auth identity: `authsvc.IdentityFromContext(r.Context())`
- Extract URL params: `chi.URLParam(r, "paramName")`
- Parse body: `json.NewDecoder(r.Body).Decode(&req)`
- Respond: `httperrors.Write(w, http.StatusOK, response)`
- Map service errors to HTTP status: `errors.Is(err, svc.ErrNotFound)` → 404

Reference: `backend/internal/transport/http/handlers/admin_access_handler.go`

### 2. Service (Business Logic)
Location: `backend/internal/services/`

Pattern:
- Define domain errors: `var ErrNotFound = errors.New("not found")`
- Constructor: `NewService(dep1, dep2) *Service`
- Methods accept `context.Context` as first param
- Return domain models, not DTOs
- Use interface contracts for repo dependencies

Reference: `backend/internal/services/adminacl/service.go`

### 3. Repository (Data Access)
Location: `backend/internal/repo/postgres/`

Pattern:
- Constructor: `NewXxxRepo(pool *pgxpool.Pool) *XxxRepo`
- `Ready() bool` method
- Raw SQL with pgx, scan into domain structs
- Error wrapping: `fmt.Errorf("XxxRepo.Method: %w", err)`

Reference: `backend/internal/repo/postgres/admin_settings_repo.go`

### 4. Route Registration
Location: `backend/internal/app/apiapp/routes.go`

Pattern:
- Add handler to `Dependencies` struct if needed
- Register in `RegisterRoutes()` under `/admin` group
- Apply auth middleware: `AdminWebAuthMiddleware`
- Apply authz: `RequireAdminRoleOrPermission()`

### 5. Migration (if new table/column needed)
Location: `backend/migrations/`
- Find the next number: `ls backend/migrations/ | tail -1`
- Create `000NNN_description.up.sql` and `000NNN_description.down.sql`

## Steps

1. Read existing similar endpoints to understand the exact patterns
2. Create handler, service, repo files following the patterns above
3. Register routes in `routes.go`
4. Create migration if needed
5. Add TypeScript types in `adminpanel/frontend/src/types/` if the endpoint needs frontend integration
