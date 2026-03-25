---
name: audit-security
description: Cross-cutting security audit — secrets, CORS, auth, photo URLs, env config, dependencies
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Security Audit — SocialApp

Cross-cutting security audit across all components: backend, frontends, bots, config.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. `docs/architecture/` — relevant architecture docs for the task at hand

**Use this context to:**
- Know project-specific conventions and patterns
- Identify documented rules to check with HIGH confidence
- Understand the tech stack and framework in use

## Checks

### 1. Secrets in Code
Grep for patterns across all source:
- API keys: `[A-Za-z0-9]{32,}` in string literals (filter out hashes/UUIDs)
- Passwords: `password\s*[:=]\s*["'][^"']+["']` (not in .env.example)
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Bot tokens: `[0-9]+:[A-Za-z0-9_-]{35}`
FAIL for any found in source code.

### 2. CORS Configuration
Read CORS middleware in `backend/internal/app/apiapp/middleware.go`.
FAIL if `Access-Control-Allow-Origin: *` in production config.
Check credentials mode consistent with origin policy.

### 3. Photo URL Security
Check photo-serving code in `backend/internal/services/media/` and handlers.
Verify URLs are presigned (TTL-limited), not permanent public URLs.
WARN if raw S3/MinIO paths could reach client responses.

### 4. Phone Number Isolation
Verify phone is stored in `user_private` table only (not `profiles` or `users`).
Grep `phone` columns in migration files. FAIL if phone storage outside `user_private`.
Check no API response leaks phone to other users.

### 5. initData Validation
Read `backend/internal/services/auth/service.go`.
Check: HMAC-SHA256 validation, `auth_date` freshness, constant-time comparison.
WARN for missing components.

### 6. Missing .env Files
Check existence: `backend/.env`, `tgbots/bot_moderator/.env`, `tgbots/bot_support/.env`.
WARN if missing (needed for local dev).

### 7. Stale localStorage Keys
Grep `localStorage\.(getItem|setItem)` in `frontend/src/`. List all keys.
WARN for keys referencing removed features.

### 8. Dependency Vulnerabilities
Run `cd frontend && npm audit --production 2>/dev/null | tail -10`.
Run `cd adminpanel/frontend && npm audit --production 2>/dev/null | tail -10`.
WARN for moderate/high. FAIL for critical.

### 9. Webhook Secret Validation
In bot setup code, check webhook configuration:
- `SecretToken` set on `SetWebhook`
- HTTP handler validates `X-Telegram-Bot-Api-Secret-Token` header
WARN if missing.

### 10. Payment Idempotency
Check payment processing in `backend/internal/services/store/` or `payments/`.
Verify `charge_id` has UNIQUE constraint. Check for duplicate processing guard.
WARN if idempotency not enforced.

### 11. Migration Rollback Safety
List all `*.up.sql` in `backend/migrations/`. Check each has matching `*.down.sql`.
Check that down migrations are non-empty.
WARN for missing or empty rollbacks.

### 12. Env Var Documentation
Extract all `VITE_` references from both frontends.
Cross-reference against `.env.project.example`.
WARN for undocumented vars.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
