---
name: audit-backend
description: Audit Go backend for SQL safety, error handling, API contracts, PII leaks, and convention violations
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Backend Audit — TGApp

Audit `backend/internal/` for code quality, SQL safety, API contract integrity, and convention violations.

## Checks

### 1. SQL Injection Risk
Grep `fmt\.Sprintf.*SELECT|fmt\.Sprintf.*INSERT|fmt\.Sprintf.*UPDATE|fmt\.Sprintf.*DELETE` in `backend/internal/repo/`.
FAIL for any SQL built with fmt.Sprintf using user input. Parameterized queries (`$1, $2`) only.

### 2. DELETE without WHERE
Grep `DELETE FROM` in `backend/internal/repo/postgres/` and verify each has a WHERE clause.
FAIL for any unguarded DELETE.

### 3. Unbounded SELECT on Large Tables
Grep `SELECT.*FROM\s+(users|profiles|swipes|likes|matches|media|notifications|analytics_events)` without LIMIT.
WARN for unbounded queries on potentially large tables.

### 4. Swallowed Errors
Grep `_ = err` in `backend/internal/` (.go files, excluding `_test.go`).
WARN for each occurrence — errors should be wrapped or handled.

### 5. fmt.Print / log.Print
Grep `fmt\.Print|log\.Print` in `backend/internal/` and `tgbots/` (.go, excluding `_test.go`, `cmd/`).
WARN — should use zap logger.

### 6. Missing Error Wrapping
Grep `return.*err$` (bare error returns without `fmt.Errorf("Context: %w", err)`) in repo/service files.
Sample 5 files. WARN for pattern violations.

### 7. Stub/NotImplemented Endpoints
Grep `writeNotImplemented|NotImplemented` in `backend/internal/transport/http/handlers/`.
WARN for each stub that is routable.

### 8. Endpoints without Auth Middleware
In `routes.go`, find endpoints without `authMW|adminWebAuthMW|adminBotAuthMW`.
Known public (OK): `/healthz`, `/auth/telegram`, `/auth/refresh`, `/v1/config`, `/media/object/*`.
WARN for any other unprotected endpoint.

### 9. PII in Public Response DTOs
Scan DTOs in `backend/internal/transport/http/dto/` for fields: `phone`, `email`, `telegram_id`, `lat`, `lon`.
FAIL if these appear in DTOs used by public endpoints (feed, likes, matches, candidate).
OK in admin DTOs and `/v1/me`.

### 10. USD Currency References
Grep `"USD"|'USD'|defaultCurrency.*USD` in all backend source.
FAIL if found in active code. Project uses XTR (Telegram Stars).

### 11. JSON Tag Mismatches
Sample 3 critical DTOs and cross-check Go `json:"..."` tags against TypeScript property names:
- Pick DTOs from `backend/internal/transport/http/dto/` and corresponding `frontend/src/types/` or `adminpanel/frontend/src/types/`.
FAIL for mismatches.

### 12. Debug Endpoints in Production
Grep `pprof|/debug/vars|/debug/` in routes.go.
FAIL if debug endpoints registered without dev-mode guard.

### 13. Missing Ready() Nil-Safety
Sample 5 repos in `backend/internal/repo/postgres/`. Check each has `Ready() bool` method.
WARN for repos missing nil-safety pattern.

### 14. TODO/FIXME/HACK Comments
Grep `TODO|FIXME|HACK|XXX` in `.go` files (excluding tests).
WARN with count.

### 15. Undocumented VITE_ Env Vars
Extract all `VITE_` references from frontend/admin. Cross-reference against `.env.project.example`.
WARN for undocumented vars.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
