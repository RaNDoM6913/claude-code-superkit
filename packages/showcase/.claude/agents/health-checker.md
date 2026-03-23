---
name: health-checker
description: Project health dashboard — compilation, tests, TODOs, OpenAPI drift, migrations, deps, security, docs, bundle
model: sonnet
allowed-tools: Bash, Glob, Grep, Read, Agent
---

# Project Health Check

Run a comprehensive health check on the TGApp project. Report results as a dashboard.

## Checks to run (all in parallel where possible)

### 1. Compilation Status
```bash
cd backend && go vet ./... 2>&1 | head -5
cd frontend && npx tsc --noEmit 2>&1 | head -5
```
Report: compiles clean / N errors

### 2. Test Status
```bash
cd backend && go test ./... -count=1 -short 2>&1 | tail -5
```
Report: N tests pass / N failures

### 3. Stale TODOs
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.go" --include="*.ts" --include="*.tsx" backend/ frontend/src/ tgbots/ | grep -v node_modules | grep -v vendor
```
Report: count per category, oldest TODO date if in git blame

### 4. OpenAPI Drift
Compare registered routes in `backend/internal/app/apiapp/routes.go` against `backend/docs/openapi.yaml`.
List endpoints in code but not in spec (undocumented) and vice versa (stale docs).

### 5. Migration Status
```bash
ls backend/migrations/*.up.sql | wc -l
# Check all up.sql have matching down.sql
for f in backend/migrations/*.up.sql; do
  down="${f%.up.sql}.down.sql"
  [ ! -f "$down" ] && echo "MISSING DOWN: $(basename $f)"
done
```

### 6. Dependency Freshness
```bash
cd frontend && npx npm-check-updates --target minor 2>/dev/null | head -15
cd backend && go list -m -u all 2>/dev/null | grep '\[' | head -10
```

### 7. Security Quick Scan
```bash
cd frontend && npm audit --production 2>/dev/null | tail -5
cd backend && command -v govulncheck >/dev/null && govulncheck ./... 2>&1 | tail -10
```

### 8. Documentation Freshness
Check if architecture docs were updated after recent code changes:
```bash
# Files changed in last 5 commits
git log --name-only --pretty=format: -5 | sort -u | grep -v '^$'
# Compare against docs last modified dates
```

### 9. Bundle Size (frontend)
```bash
cd frontend && npm run build 2>&1 | grep -E 'dist/|gzip|chunk' | head -10
```

## Output Format

```
TGApp Health Dashboard

Compilation:  Go clean, TypeScript clean
Tests:        42 pass, 0 fail
TODOs:        12 stale (oldest: 2026-02-28)
Migrations:   48 up/down pairs complete
OpenAPI:      3 undocumented endpoints
Security:     0 critical, 2 moderate
Dependencies: 4 outdated (npm), 2 outdated (Go)
Docs:         Up to date
Bundle:       main 18.2KB gzip

Overall: NEEDS ATTENTION (2 warnings)
```

Run all checks and present results in this dashboard format. Use agents for parallel execution if needed.
