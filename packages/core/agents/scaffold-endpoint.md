---
name: scaffold-endpoint
description: Scaffold a new API endpoint by reading existing project patterns — no hardcoded architecture
model: sonnet
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Scaffold New Endpoint

Create a new API endpoint by learning from the project's existing patterns. This agent does NOT assume any specific framework — it discovers the architecture from the codebase.

## Phase 0: Load Project Context

Before starting, read available project documentation to understand architecture and conventions. Skip files that don't exist.

**Read if exists:**
1. `CLAUDE.md` or `AGENTS.md` — project overview, conventions, tech stack
2. `docs/architecture/backend-layers.md` — layer separation, DI patterns, error handling, adding endpoints
3. `docs/architecture/api-reference.md` — existing endpoints, naming conventions, auth requirements

**If no docs exist:** Fall back to codebase exploration (README.md, directory structure, existing patterns).

**Use this context to:**
- Follow the documented pattern for adding new endpoints (handler, service, repo, route registration)
- Use the correct error types and HTTP status code mappings
- Apply the right auth middleware and route grouping conventions

**Impact on review:** Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

## Phase 1 — Discover Project Patterns

### Step 1: Identify the Stack
Detect the backend framework and architecture:
- **Go**: check `go.mod` for chi, gin, echo, fiber, mux, etc.
- **Node.js**: check `package.json` for express, fastify, nestjs, koa, hono, etc.
- **Python**: check `requirements.txt`/`pyproject.toml` for flask, fastapi, django, etc.
- **Rust**: check `Cargo.toml` for actix-web, axum, rocket, etc.

### Step 2: Find the Architecture
Locate key architectural files:
1. **Route registration** — where are routes/endpoints registered?
   - Grep: `Route|router|app\.get|app\.post|@app\.|urlpatterns|r\.Get|r\.Post`
2. **Handlers/Controllers** — where do request handlers live?
   - Look for directory patterns: `handlers/`, `controllers/`, `transport/`, `api/`, `routes/`
3. **Services/Business logic** — where does business logic live?
   - Look for: `services/`, `usecases/`, `domain/`, `business/`
4. **Data access/Repositories** — where does DB access live?
   - Look for: `repo/`, `repositories/`, `dal/`, `models/`, `db/`
5. **DTOs/Schemas** — where are request/response types defined?
   - Look for: `dto/`, `schemas/`, `types/`, `models/`

### Step 3: Read a Reference Endpoint
Find the **closest existing endpoint** to the requested one:
1. Grep for similar domain terms in handler files
2. Read the reference handler, service, and repo files
3. Note exact patterns: constructor style, error handling, middleware, response format

## Phase 2 — Scaffold by Analogy

Generate each layer by following the reference pattern exactly:

### 1. Handler/Controller (Transport Layer)
Create in the same directory as existing handlers. Follow the reference for:
- Constructor/DI pattern
- Request parsing
- Response formatting
- Error mapping (domain errors -> HTTP status codes)
- Auth/middleware annotations

### 2. Service (Business Logic)
Create in the same directory structure as existing services. Follow the reference for:
- Constructor with interface-based dependencies
- Context propagation
- Domain error types
- Validation logic placement

### 3. Repository/Data Access (if needed)
Create in the same directory as existing repos. Follow the reference for:
- Query style (raw SQL, ORM, query builder)
- Error wrapping
- Nil/null safety patterns

### 4. Route Registration
Add the new endpoint to the route registration file. Follow the reference for:
- Route grouping
- Middleware chain (auth, rate limiting, etc.)
- Path parameter naming

### 5. Migration (if new table/column needed)
- Find the migration directory and naming convention
- Create both up and down migrations
- Follow existing migration style

### 6. Types/DTOs (if needed)
- Create request/response types following existing DTO patterns
- Add to the API spec (OpenAPI/Swagger) if one exists

## Output

After scaffolding, list all created/modified files and note:
- Which reference endpoint was used as the template
- Any decisions made (naming, error codes, etc.)
- What needs manual completion (business logic, SQL queries, validation rules)
