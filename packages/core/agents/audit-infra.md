---
name: audit-infra
description: Audit infrastructure — secrets, Docker, deps, CORS, webhooks, migrations, CI/CD, monitoring
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Infrastructure Audit

Cross-cutting infrastructure audit covering secrets management, Docker configuration, dependency security, CORS, webhook security, migration rollback safety, CI/CD, logging, and monitoring.

## Phase 0: Load Project Context

Before starting, read available project documentation to understand architecture and conventions. Skip files that don't exist.

**Read if exists:**
1. `CLAUDE.md` or `AGENTS.md` — project overview, conventions, tech stack
2. `docs/architecture/deployment.md` — deployment topology, environment config, service dependencies

**If no docs exist:** Fall back to codebase exploration (README.md, directory structure, existing patterns).

**Use this context to:**
- Know which services exist and their expected configuration (ports, env vars, volumes)
- Identify the project's secret management approach to check for proper usage
- Understand migration tooling and naming conventions for rollback safety checks

**Impact on review:** Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

## Detection Strategy

Auto-detect infrastructure components by scanning for:
- `docker-compose.yml` / `Dockerfile` — containerized services
- `.github/workflows/` / `.gitlab-ci.yml` / `Jenkinsfile` — CI/CD pipelines
- `*.env*` files — environment configuration
- `migrations/` — database migration files
- `nginx.conf` / `caddy` / reverse proxy configs
- `package.json` / `go.mod` / `requirements.txt` — dependency manifests

## Checks

### 1. Secrets in Repository
Grep across all source (excluding `.env.example`, docs, and test fixtures):
- API keys: `(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
- Passwords: `password\s*[:=]\s*["'][^"']{4,}["']`
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Connection strings with credentials: `://[^:]+:[^@]+@`
- Generic tokens: `(?:secret|token|jwt_secret)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
Also check: `.env` files committed to git (`git ls-files '*.env'`)
FAIL for any real credentials in tracked source files.

### 2. .env.example Completeness
Extract all environment variable references from source code:
- Go: `os\.Getenv\("([^"]+)"\)|viper\.Get.*\("([^"]+)"\)`
- JS/TS: `process\.env\.([A-Z_]+)|import\.meta\.env\.([A-Z_]+)`
- Python: `os\.environ\[["']([^"']+)["']\]|os\.getenv\(["']([^"']+)["']\)`
Cross-reference against `.env.example` or `.env.project.example`.
WARN for environment variables referenced in code but missing from example files.

### 3. Docker Non-Root Execution
Read all `Dockerfile` files. Check:
- `USER` directive present (not running as root)?
- Base image is specific version (not `:latest`)?
- No secrets in build args or ENV directives?
- Multi-stage builds used to minimize image size?
WARN for root execution. WARN for `:latest` base images.

### 4. Dependency Vulnerabilities
```bash
# npm projects
find . -name "package.json" -not -path "*/node_modules/*" -maxdepth 3 -execdir npm audit --production 2>/dev/null \; | grep -E "critical|high|moderate" | head -20
# Go projects
find . -name "go.mod" -maxdepth 3 -execdir sh -c 'command -v govulncheck >/dev/null && govulncheck ./... 2>&1 | tail -10 || echo "govulncheck not installed"' \;
# Python projects
find . -name "requirements.txt" -maxdepth 3 -execdir sh -c 'command -v pip-audit >/dev/null && pip-audit 2>&1 | tail -10 || echo "pip-audit not installed"' \;
```
FAIL for critical/high. WARN for moderate.

### 5. Outdated Base Dependencies
Check for significantly outdated core packages:
```bash
# npm
find . -name "package.json" -not -path "*/node_modules/*" -maxdepth 3 -execdir npm outdated 2>/dev/null \; | head -20
# Go
find . -name "go.mod" -maxdepth 3 -execdir sh -c 'go list -m -u all 2>/dev/null | grep "\[" | head -10' \;
```
WARN for major version behind. Info for minor/patch.

### 6. CORS Production Configuration
Grep for CORS configuration:
- `Access-Control-Allow-Origin|AllowOrigins|cors.*origin`
Check: wildcard `*` with credentials is a FAIL. Wildcard `*` without credentials is WARN.
Check that development-only permissive CORS is behind an environment guard.

### 7. Webhook HTTPS Enforcement
Grep for webhook URL configuration:
- `webhook.*url|setWebhook|webhook_url|WEBHOOK_URL`
Check all webhook URLs use `https://` in production configuration.
WARN for `http://` webhook URLs outside of local development guards.

### 8. Migration Rollback Safety
List all up/forward migrations. Check:
- Each has a matching down/rollback migration
- Down migrations are non-empty (not just a comment)
- No destructive operations (DROP TABLE, DROP COLUMN) without careful sequencing
```bash
find . -path "*/migrations/*.up.sql" -o -path "*/migrations/*.up.*" | while read f; do
  down=$(echo "$f" | sed 's/\.up\./\.down\./');
  [ ! -f "$down" ] && echo "MISSING ROLLBACK: $(basename $f)"
done
```
FAIL for missing rollback files. WARN for empty rollbacks.

### 9. CI/CD Pipeline Checks
Read CI/CD configuration files. Verify:
- Linting step present?
- Test step present?
- Security scanning step (SAST/DAST)?
- Build step validates compilation?
- No secrets hardcoded in pipeline files?
WARN for missing critical steps (lint, test, build).

### 10. Log Level Configuration
Grep for logger initialization:
- Go: `zap\.New|zerolog\.New|logrus\.New`
- JS/TS: `winston\.createLogger|pino\(|bunyan\.createLogger`
- Python: `logging\.basicConfig|logging\.getLogger`
Check that log level is configurable via environment variable (not hardcoded to debug).
WARN if debug logging is hardcoded or if sensitive data appears in log statements.

### 11. Backup Verification
Check for database backup configuration:
- `pg_dump|mysqldump|mongodump` in scripts or cron
- Backup-related environment variables
- Docker volume configuration for persistent data
WARN if no backup mechanism is visible in the repository.

### 12. Monitoring and Health Checks
Check for:
- Health check endpoint (`/healthz`, `/health`, `/ready`, `/live`)
- Docker HEALTHCHECK directive in Dockerfiles
- Monitoring/alerting configuration (Prometheus metrics, Datadog, etc.)
- Error tracking integration (Sentry, Bugsnag, etc.)
WARN for missing health checks. Info for missing monitoring/alerting.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
