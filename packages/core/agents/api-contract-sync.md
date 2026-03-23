---
name: api-contract-sync
description: Verify OpenAPI/Swagger spec matches actual route registrations and handler implementations
model: sonnet
allowed-tools: Read, Grep, Glob, Bash
---

# API Contract Sync

Verify that the API specification (OpenAPI/Swagger) matches actual route registrations and handler implementations.

## When to Trigger

This agent should be invoked after changes to:
- **Route registration files** — routes added, removed, or modified
- **API spec files** — OpenAPI/Swagger YAML/JSON updated manually
- **Handler/controller files** — new handlers, renamed methods, changed request/response shapes
- **DTO/schema files** — field additions, renames, type changes

## Detection Strategy

Auto-detect the API spec and route files:

### API Spec (check in order):
1. `**/openapi.yaml` or `**/openapi.json`
2. `**/swagger.yaml` or `**/swagger.json`
3. `**/api-spec.*`
4. Annotated routes (JSDoc, Go swagger comments, FastAPI auto-docs)

### Route Registration (check by stack):
- **Go (chi/mux/gin/echo/fiber)**: grep `r.Get|r.Post|r.Put|r.Delete|r.Route|r.Group` or framework equivalents
- **Node/Express**: grep `app.get|app.post|router.get|router.post`
- **Python/FastAPI**: grep `@app.get|@app.post|@router.get`
- **Python/Django**: grep `path(|urlpatterns`
- **Rails**: `config/routes.rb`

## Process

### 1. Extract Registered Routes
Read route registration files and extract all route registrations:
- Method (GET/POST/PUT/PATCH/DELETE)
- Path pattern (including path parameters)
- Handler function reference
- Middleware chain (auth, rate limiting, etc.)

### 2. Extract Spec Paths
Parse the API spec file and extract all documented paths with methods.

### 3. Cross-Reference

**Missing from spec** (routes exist but undocumented):
- List each route with method, path, handler name
- Severity: WARN (internal/admin routes), FAIL (public API endpoints)

**Missing from routes** (documented but not implemented):
- List each spec path
- Severity: FAIL (indicates stale documentation)

### 4. DTO/Schema Consistency (spot-check)
For 5 random endpoints, compare:
- Handler request struct/type fields vs spec request schema properties
- Handler response struct/type fields vs spec response schema properties
- FAIL for field name mismatches, type mismatches, missing required fields

### 5. Error Codes
For endpoints with documented error responses (4xx/5xx), verify the handler actually returns those codes.

## Output Format

### Undocumented Routes (in code, not in spec)
| Method | Path | Handler | Severity |
|--------|------|---------|----------|

### Stale Documentation (in spec, not in code)
| Method | Path | Severity |
|--------|------|----------|

### DTO Mismatches
| Endpoint | Field | Code Type | Spec Type | Severity |
|----------|-------|-----------|-----------|----------|

**Sync Status: IN_SYNC / DRIFT (X issues)**
