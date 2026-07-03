---
name: audit-infra
description: Infrastructure audit — 12 fixed checks (secrets, Docker, dependency CVEs, CORS, webhooks, migrations, CI/CD, backups, monitoring), each reported PASS/WARN/FAIL for /audit
tokens: 2222
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Infrastructure Audit

Runs 12 fixed infrastructure checks and reports each as PASS/WARN/FAIL — the exact enum the `/audit` command aggregates into its Grand Summary.

## Hard Rules

1. Report ALL 12 checks, exactly once each, in numeric order — including every PASS.
2. The only verdicts are **PASS / WARN / FAIL**. There is NO Info level: minor observations go in a `note:` appended to the check line and NEVER change the verdict.
3. Before any FAIL, Read the code/config around the grep hit; cite the `file:line` you actually read.
4. If a check's target is absent from the repo (e.g., no Dockerfile) → PASS with `note: not applicable — <missing component>`. If a scanner tool is not installed → WARN with `note: could not verify — <tool> not installed`.
5. Never invent scanner output. Summarize real command output only; if a command errors, quote the error.
6. A clean run (12 PASS) is a valid result — do not manufacture findings.

## Phase 0 — Load Project Context

Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/deployment.md`.
Use it to: learn services and their expected config (ports, env vars, volumes), the secret-management approach, and migration tooling/naming. Violations of DOCUMENTED conventions → report with HIGH confidence instead of MEDIUM (state as a `note:` on the check line).

## Detection Strategy

Auto-detect components by scanning for:
- `docker-compose.yml` / `Dockerfile` — containerized services
- `.github/workflows/` / `.gitlab-ci.yml` / `Jenkinsfile` — CI/CD pipelines
- `*.env*` files — environment configuration
- `migrations/` — database migration files
- `nginx.conf` / `caddy` / reverse-proxy configs
- `package.json` / `go.mod` / `requirements.txt` — dependency manifests

Component not detected → its check is PASS with `note: not applicable` (Hard Rule 4).

## Evidence Gate

Assign FAIL only if all four hold:
1. **Citation** — exact `file:line` Read this session, or real command output — never memory.
2. **Failure mode** — concrete: what leaks or breaks, under what condition.
3. **Context** — you read the surrounding config/code, not just the grep hit.
4. **Verdict** you can defend to a skeptic. Uncertain hit → WARN with `note: needs verification`, never FAIL.

If a referenced file cannot be found: output `NOT FOUND: <path>` — never invent its contents.

## Checks

### 1. Secrets in Repository
Grep across all source (excluding `.env.example`, docs, test fixtures):
- API keys: `(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
- Passwords: `password\s*[:=]\s*["'][^"']{4,}["']`
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Connection strings with credentials: `://[^:]+:[^@]+@`
- Generic tokens: `(?:secret|token|jwt_secret)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
Also check: `.env` files committed to git (`git ls-files '*.env'`).
False-positive gate: Read every hit. Placeholders (`changeme`, `example`, `xxx`, `dummy`, `your-*`, `placeholder`) and values in test fixtures or local docker-compose defaults are NOT FAIL. FAIL only for plausible real credentials in tracked files, citing the `file:line` read.

### 2. .env.example Completeness
Extract environment-variable references from source:
- Go: `os\.Getenv\("([^"]+)"\)|viper\.Get.*\("([^"]+)"\)`
- JS/TS: `process\.env\.([A-Z_]+)|import\.meta\.env\.([A-Z_]+)`
- Python: `os\.environ\[["']([^"']+)["']\]|os\.getenv\(["']([^"']+)["']\)`
Cross-reference against `.env.example` or `.env.project.example`.
WARN for variables referenced in code but missing from example files.

### 3. Docker Non-Root Execution
Read all `Dockerfile` files. Severities:
- No `USER` directive (runs as root) = WARN
- Base image `:latest` (not pinned) = WARN
- Secrets in build args or `ENV` directives = FAIL (apply Check 1's false-positive gate)
- No multi-stage build = `note:` only, verdict unchanged

### 4. Dependency Vulnerabilities
```bash
# npm projects
find . -name "package.json" -not -path "*/node_modules/*" -maxdepth 3 -execdir npm audit --omit=dev 2>/dev/null \; | grep -E "critical|high|moderate" | head -20
# Go projects
find . -name "go.mod" -maxdepth 3 -execdir sh -c 'command -v govulncheck >/dev/null && govulncheck ./... 2>&1 | tail -10 || echo "govulncheck not installed"' \;
# Python projects
find . -name "requirements.txt" -maxdepth 3 -execdir sh -c 'command -v pip-audit >/dev/null && pip-audit 2>&1 | tail -10 || echo "pip-audit not installed"' \;
```
FAIL for critical/high. WARN for moderate. Report counts per severity plus the top 3 affected packages — never paste full scanner output.

### 5. Outdated Base Dependencies
```bash
# npm
find . -name "package.json" -not -path "*/node_modules/*" -maxdepth 3 -execdir npm outdated 2>/dev/null \; | head -20
# Go
find . -name "go.mod" -maxdepth 3 -execdir sh -c 'go list -m -u all 2>/dev/null | grep "\[" | head -10' \;
```
WARN for a major version behind. Minor/patch behind = PASS with `note:` listing the count and top offenders — verdict unchanged.

### 6. CORS Production Configuration
Grep: `Access-Control-Allow-Origin|AllowOrigins|cors.*origin`
- Wildcard `*` WITH credentials = FAIL
- Wildcard `*` without credentials = WARN
- Development-only permissive CORS must be behind an environment guard; unguarded = WARN

### 7. Webhook HTTPS Enforcement
Grep: `webhook.*url|setWebhook|webhook_url|WEBHOOK_URL`
All webhook URLs must use `https://` in production configuration.
WARN for `http://` webhook URLs outside local-development guards.

### 8. Migration Rollback Safety
```bash
find . -path "*/migrations/*.up.sql" -o -path "*/migrations/*.up.*" | while read f; do
  down=$(echo "$f" | sed 's/\.up\./\.down\./');
  [ ! -f "$down" ] && echo "MISSING ROLLBACK: $(basename $f)"
done
```
- Missing rollback file = FAIL
- Empty/comment-only rollback = WARN
- Destructive op (`DROP TABLE`, `DROP COLUMN`): extract the dropped identifier and Grep it in application source. Still referenced by code = FAIL; preceded by a deprecation migration and unreferenced = PASS with `note:`.

### 9. CI/CD Pipeline Checks
Read CI/CD configuration files. Severities:
- Missing lint, test, or build step = WARN (one WARN covers the check; list which are missing)
- Hardcoded secrets in pipeline files = FAIL (apply Check 1's false-positive gate)
- Missing security scanning (SAST/DAST) = `note:` only, verdict unchanged

### 10. Log Level Configuration
Grep for logger initialization:
- Go: `zap\.New|zerolog\.New|logrus\.New`
- JS/TS: `winston\.createLogger|pino\(|bunyan\.createLogger`
- Python: `logging\.basicConfig|logging\.getLogger`
WARN if the log level is hardcoded to debug (not env-configurable) or sensitive data appears in log statements.

### 11. Backup Verification
Check for: `pg_dump|mysqldump|mongodump` in scripts or cron; backup-related env vars; Docker volume config for persistent data.
WARN if no backup mechanism is visible in the repository.

### 12. Monitoring and Health Checks
- Health endpoint (`/healthz`, `/health`, `/ready`, `/live`) or Docker `HEALTHCHECK` directive — missing = WARN
- Monitoring/alerting (Prometheus, Datadog, etc.) or error tracking (Sentry, Bugsnag, etc.) — missing = `note:` only, verdict unchanged

## Output Contract

```
## Infrastructure Audit

[PASS|WARN|FAIL] #N Check Name — one-line evidence (file:line if applicable) (note: optional, verdict-neutral)
... one line per check, #1 through #12, in order ...

Summary: X PASS, Y WARN, Z FAIL

### Action Items (FAILs only)
1. file:line — concrete fix
```

Example (abbreviated — a real report has all 12 lines):

```
## Infrastructure Audit

[PASS] #1 Secrets in Repository — 3 hits, all placeholders in test fixtures (note: docker-compose.yml:14 local default 'changeme')
[WARN] #2 .env.example Completeness — SENTRY_DSN, REDIS_URL used in src/config.ts:12 but missing from .env.example
[FAIL] #4 Dependency Vulnerabilities — npm audit: 2 high (lodash, minimist), 1 moderate
[PASS] #12 Monitoring and Health Checks — /healthz at src/server.ts:40 (note: no error-tracking integration found)

Summary: 9 PASS, 2 WARN, 1 FAIL

### Action Items (FAILs only)
1. package.json — upgrade lodash >=4.17.21 and minimist >=1.2.6 (npm audit high)
```

## Done ONLY when

- [ ] All 12 check lines present, in numeric order, each with PASS/WARN/FAIL.
- [ ] Every FAIL cites a `file:line` you Read or real command output.
- [ ] Summary counts match the 12 lines above them.
- [ ] One action item per FAIL (none if zero FAILs).

## Recap — non-negotiables

- 12 checks, in order, PASSes included; verdicts are PASS/WARN/FAIL only — minor items are `note:`, never a fourth level.
- Read before FAIL and cite `file:line`; placeholders and fixtures are not credentials.
- Missing component → PASS `note: not applicable`; missing scanner → WARN `note: could not verify`.
- Summarize real scanner output (counts + top offenders); never invent it.
- A clean run (12 PASS) is a valid result.
