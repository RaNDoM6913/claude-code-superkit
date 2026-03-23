---
name: health-checker
description: Project health dashboard — compilation, tests, TODOs, API spec drift, migration pairs, deps, security, docs, bundle
model: sonnet
allowed-tools: Bash, Glob, Grep, Read
---

# Project Health Checker

Run a comprehensive health check across the entire project. Auto-detect the tech stack and report results as a dashboard.

## Phase 0: Load Project Context

Before starting, read available project documentation to understand architecture and conventions. Skip files that don't exist.

**Read if exists:**
1. `CLAUDE.md` or `AGENTS.md` — project overview, conventions, tech stack, build/test/lint commands, migration format

**If no docs exist:** Fall back to codebase exploration (README.md, directory structure, existing patterns).

**Use this context to:**
- Use the project's documented build, test, and lint commands instead of guessing
- Know the migration naming format and directory for consistency checks
- Understand which components exist (backend, frontend, bots) to run all applicable health checks

**Impact on review:** Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

## Detection Strategy

Scan the project root to identify components:
- `go.mod` — Go backend (use `go vet`, `go test`)
- `package.json` — Node.js/frontend (use `tsc`, `npm test`, `npm run build`)
- `requirements.txt` / `pyproject.toml` — Python (use `mypy`, `pytest`)
- `Cargo.toml` — Rust (use `cargo check`, `cargo test`)
- `migrations/` — SQL migrations
- `**/openapi.yaml` / `**/swagger.json` — API spec
- `docs/` — Documentation

## Checks (run in parallel where possible)

### 1. Compilation Status
Auto-detect and run:
- Go: `go vet ./... 2>&1 | head -10`
- TypeScript: `npx tsc --noEmit 2>&1 | head -10`
- Python: `mypy . 2>&1 | head -10` (if mypy installed)
- Rust: `cargo check 2>&1 | head -10`
Report: compiles clean / N errors

### 2. Test Status
Auto-detect and run:
- Go: `go test ./... -count=1 -short 2>&1 | tail -10`
- Node: `npm test 2>&1 | tail -10` (if test script exists)
- Python: `pytest --tb=no -q 2>&1 | tail -5`
- Rust: `cargo test 2>&1 | tail -10`
Report: N tests pass / N failures

### 3. Stale TODOs
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.go" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.rs" --include="*.js" --include="*.jsx" . | grep -v node_modules | grep -v vendor | grep -v target
```
Report: count per category

### 4. API Spec Drift (if spec exists)
Compare registered routes against API spec file:
- Find route registration files
- Find OpenAPI/Swagger spec
- List endpoints in code but not in spec (undocumented)
- List endpoints in spec but not in code (stale)
Report: N undocumented, N stale

### 5. Migration Consistency (if migrations exist)
```bash
# Check all up migrations have matching down migrations
for f in $(find . -path "*/migrations/*.up.sql" -o -path "*/migrations/*.up.*" 2>/dev/null); do
  down=$(echo "$f" | sed 's/\.up\./\.down\./');
  [ ! -f "$down" ] && echo "MISSING DOWN: $(basename $f)"
done
```
Report: N migration pairs, any missing rollbacks

### 6. Dependency Freshness
Auto-detect and run:
- npm: `npm outdated 2>/dev/null | head -15`
- Go: `go list -m -u all 2>/dev/null | grep '\[' | head -10`
- Python: `pip list --outdated 2>/dev/null | head -10`
- Rust: `cargo outdated 2>/dev/null | head -10`
Report: N outdated packages

### 7. Security Quick Scan
Auto-detect and run:
- npm: `npm audit --production 2>/dev/null | tail -5`
- Go: `govulncheck ./... 2>&1 | tail -10` (if installed)
- Python: `pip-audit 2>&1 | tail -10` (if installed)
- Rust: `cargo audit 2>&1 | tail -10` (if installed)
Report: N critical, N high, N moderate

### 8. Documentation Freshness
Check if docs were updated alongside recent code changes:
```bash
# Files changed in last 5 commits
changed=$(git log --name-only --pretty=format: -5 | sort -u | grep -v '^$')
# Check if any docs were updated
echo "$changed" | grep -E "\.md$|openapi|swagger" | wc -l
```
Report: docs updated / potentially stale

### 9. Bundle Size (frontend projects)
If frontend build script exists:
```bash
npm run build 2>&1 | grep -iE "dist/|gzip|chunk|size" | head -10
```
Report: main bundle size

## Output Format

```
Project Health Dashboard
========================

Compilation:  [language] clean / N errors
Tests:        N pass, N fail
TODOs:        N stale (N TODO, N FIXME, N HACK)
Migrations:   N pairs complete / N missing rollback
API Spec:     N undocumented / N stale (or "No spec found")
Security:     N critical, N high, N moderate
Dependencies: N outdated
Docs:         Up to date / N potentially stale
Bundle:       main NKB gzip (or "N/A")

Overall: HEALTHY / NEEDS ATTENTION (N warnings) / UNHEALTHY (N failures)
```

Run all applicable checks and present results in this dashboard format.
