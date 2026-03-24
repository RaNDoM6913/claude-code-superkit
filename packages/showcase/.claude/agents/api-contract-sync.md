---
name: api-contract-sync
description: Verify OpenAPI spec matches actual handler implementations
model: opus
allowed-tools: Read, Grep, Glob, Bash
---

# API Contract Sync — SocialApp

Verify that `backend/docs/openapi.yaml` matches actual route registrations and handler implementations.

## When to Trigger

This agent should be invoked after changes to any of the following files:

- **`backend/internal/app/apiapp/routes.go`** — route registrations added, removed, or modified
- **`backend/docs/openapi.yaml`** — OpenAPI spec updated manually
- **Any handler in `backend/internal/transport/http/handlers/`** — new handler files, renamed methods, changed request/response DTOs
- **DTO changes in `backend/internal/transport/http/dto/`** — field additions, renames, type changes

> **Note**: Claude Code hooks (`PostToolUse`) currently support shell commands but do not support invoking agents directly. Therefore, this agent must be invoked manually after the changes listed above. When editing routes or handlers, remember to run: `@api-contract-sync` to verify contract consistency.

## Process

### 1. Extract Registered Routes
Read `backend/internal/app/apiapp/routes.go` and extract all route registrations:
- Method (GET/POST/PUT/PATCH/DELETE)
- Path pattern
- Handler function
- Middleware chain

### 2. Extract OpenAPI Paths
Parse `backend/docs/openapi.yaml` and extract all documented paths with methods.

### 3. Cross-Reference

**Missing from OpenAPI** (routes exist but undocumented):
- List each route with method, path, handler name
- Severity: WARN (internal/admin), FAIL (public /v1/ endpoints)

**Missing from routes** (documented but not implemented):
- List each OpenAPI path
- Severity: FAIL (indicates stale docs)

### 4. DTO Consistency (spot-check)
For 5 random endpoints, compare:
- Go request struct JSON tags vs OpenAPI request schema properties
- Go response struct JSON tags vs OpenAPI response schema properties
- FAIL for mismatches

### 5. Error Codes
For endpoints with documented error responses (4xx), verify handler actually returns those codes.

## Output Format

### Undocumented Routes (in code, not in OpenAPI)
| Method | Path | Handler | Severity |
|--------|------|---------|----------|

### Stale Documentation (in OpenAPI, not in code)
| Method | Path | Severity |
|--------|------|----------|

### DTO Mismatches
| Endpoint | Field | Go Tag | OpenAPI | Severity |
|----------|-------|--------|---------|----------|

**Sync Status: IN_SYNC / DRIFT (X issues)**
