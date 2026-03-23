---
name: audit-backend
description: Audit backend code for SQL safety, error handling, auth coverage, PII exposure, dead code, TODO density
user-invocable: false
---

# Backend Audit

Audit backend source code for SQL safety, error handling, API contract integrity, and convention violations.

## Detection Strategy

Auto-detect the backend stack by scanning for:
- `go.mod` — Go project
- `package.json` with Express/Fastify/NestJS — Node.js project
- `requirements.txt` / `pyproject.toml` with Flask/FastAPI/Django — Python project
- `Cargo.toml` — Rust project
- `pom.xml` / `build.gradle` — Java project

Identify source directories, handler/controller locations, service layers, and data-access layers.

## Checks

### 1. SQL Injection Risk
Grep for SQL built with string interpolation:
- Go: `fmt\.Sprintf.*(?:SELECT|INSERT|UPDATE|DELETE)`
- JS/TS: `` `SELECT.*\$\{|`INSERT.*\$\{|`UPDATE.*\$\{|`DELETE.*\$\{ ``
- Python: `f"SELECT|f"INSERT|"SELECT.*".format|%s.*SELECT` (outside ORM)
FAIL for any SQL built with user input via string interpolation.

### 2. DELETE without WHERE
Grep `DELETE FROM` in data-access/repository files and verify each has a WHERE clause.
FAIL for any unguarded DELETE statement.

### 3. Unbounded SELECT on Large Tables
Grep `SELECT.*FROM` without LIMIT in repository/data-access files.
WARN for queries on potentially large tables without pagination or limits.

### 4. Swallowed Errors
- Go: grep `_ = err` (excluding test files)
- JS/TS: grep `catch\s*\(` with empty or log-only bodies
- Python: grep `except.*:.*pass$|except.*:.*continue$`
WARN for each occurrence — errors should be wrapped or handled.

### 5. Debug Print Statements
- Go: grep `fmt\.Print|log\.Print` (should use structured logger like zap/zerolog)
- JS/TS: grep `console\.log` in server-side code
- Python: grep `print(` in non-CLI code (should use logging module)
WARN with count — should use structured logging.

### 6. Missing Error Wrapping
Grep for bare error returns without context wrapping:
- Go: `return.*err$` without `fmt.Errorf` or `errors.Wrap`
- JS/TS: `throw err` without additional context
Sample 5 files. WARN for pattern violations.

### 7. Stub/NotImplemented Endpoints
Grep `NotImplemented|TODO.*endpoint|stub|placeholder` in handler/controller files.
WARN for each stub that is routable (reachable by clients).

### 8. Auth Middleware Coverage
Find route registration file(s). Check all endpoints have auth middleware.
Identify intentionally public routes (health checks, login, public resources).
WARN for any other unprotected endpoint.

### 9. PII in Public Responses
Scan DTO/response types for sensitive fields: `phone`, `email`, `password`, `ssn`, `lat`, `lon`, `secret`.
FAIL if these appear in DTOs used by public endpoints (listings, search results, public profiles).
OK in admin DTOs and self-profile endpoints.

### 10. Environment Variable Documentation
Extract all environment variable references from source code.
Cross-reference against `.env.example` or equivalent documentation file.
WARN for undocumented environment variables.

### 11. Dead Code
- Grep for unused exports/functions (functions defined but never called from other files)
- Check for commented-out code blocks (more than 3 lines)
- Grep `// TODO.*delete|// DEPRECATED|// REMOVE`
WARN with count and locations.

### 12. TODO/FIXME/HACK Density
Grep `TODO|FIXME|HACK|XXX` in source files (excluding tests and vendor).
WARN with count per category and locations of the oldest items.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.

