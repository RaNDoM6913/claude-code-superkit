---
name: pre-deploy-validator
description: 9-point pre-deploy gate — compilation, linting, tests, migrations, API spec, debug artifacts, env config, bundle size, secrets
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Pre-Deploy Validator

Run comprehensive checks before deploying to production. Auto-detects the tech stack and runs all applicable validations.

## Phase 0: Load Project Context

Before starting, read available project documentation to understand architecture and conventions. Skip files that don't exist.

**Read if exists:**
1. `CLAUDE.md` or `AGENTS.md` — project overview, conventions, tech stack, build/test/lint commands, migration format

**If no docs exist:** Fall back to codebase exploration (README.md, directory structure, existing patterns).

**Use this context to:**
- Use the project's documented build, test, and lint commands for each component
- Know the migration naming convention and directory for consistency checks
- Identify all deployable components to validate each one before deploy

**Impact on review:** Violations of DOCUMENTED conventions get higher confidence (HIGH instead of MEDIUM).

## Detection Strategy

Scan the project root to identify components and their verification commands:
- `go.mod` — Go: `go vet`, `go test`, `golangci-lint` (if available)
- `package.json` — Node.js/frontend: `tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- `requirements.txt` / `pyproject.toml` — Python: `mypy`, `ruff`/`flake8`, `pytest`
- `Cargo.toml` — Rust: `cargo check`, `cargo clippy`, `cargo test`
- `migrations/` — SQL migrations
- `**/openapi.yaml` — API spec

## Pre-Deploy Checklist

### 1. Compilation
Auto-detect and run for each component:
- Go: `go vet ./...`
- TypeScript: `npx tsc --noEmit`
- Python: `mypy .` (if configured)
- Rust: `cargo check`

**FAIL** if any compilation errors.

### 2. Linting
Auto-detect and run:
- Go: `golangci-lint run` or `go vet ./...`
- Node.js: `npm run lint` (if script exists)
- Python: `ruff check .` or `flake8`
- Rust: `cargo clippy`

**FAIL** for lint errors. WARN for warnings.

### 3. Tests
Auto-detect and run:
- Go: `go test ./... -count=1 -short`
- Node.js: `npm test` (if script exists)
- Python: `pytest -x --tb=short`
- Rust: `cargo test`

**FAIL** if any test fails.

### 4. Build/Bundle
For frontend projects:
```bash
npm run build 2>&1
```
**FAIL** if build fails.
**WARN** if bundle size exceeds thresholds (configurable; defaults: main chunk > 250KB gzip).

### 5. Migration Consistency
If a migrations directory exists:
```bash
# Check every up migration has a matching down migration
for f in $(find . -path "*/migrations/*.up.sql" -o -path "*/migrations/*.up.*" 2>/dev/null); do
  down=$(echo "$f" | sed 's/\.up\./\.down\./')
  [ ! -f "$down" ] && echo "MISSING ROLLBACK: $(basename $f)"
done

# Check migration numbering is sequential (no gaps, no duplicates)
ls migrations/*.up.sql 2>/dev/null | sed 's/.*\///' | sort | uniq -d
```
**FAIL** for missing rollback files. **WARN** for numbering issues.

### 6. API Spec Sync
If an OpenAPI/Swagger spec exists:
- Grep all route registrations from the route file
- Cross-reference against the spec file
- **WARN** for undocumented endpoints
- **WARN** for stale spec entries (documented but not in code)

### 7. Debug Artifacts
Scan for debug code that should not ship to production:
- Frontend: `console\.log|console\.debug|debugger` in source files (not test files)
- Go: `fmt\.Print|log\.Print` in source files (not test files, not main.go)
- Python: `print(|pdb\.set_trace|breakpoint()` in source files (not test files)
- Generic: `TODO.*REMOVE|HACK.*deploy|DEBUG.*true`

**WARN** for each occurrence with file:line.

### 8. Environment Config
Check that all referenced environment variables are documented:
```bash
# Extract env var references from source
grep -roh 'os\.Getenv("[^"]*")\|process\.env\.\w\+\|import\.meta\.env\.\w\+\|os\.environ\["[^"]*"\]' --include="*.go" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" . 2>/dev/null | sort -u
```
Cross-reference against `.env.example` or equivalent.
**WARN** for undocumented variables.

Check for hardcoded `localhost` in production code paths:
```bash
grep -rn "localhost" --include="*.go" --include="*.ts" --include="*.py" --include="*.rs" . | grep -v node_modules | grep -v test | grep -v _test | grep -v spec | grep -v ".env"
```
**WARN** for hardcoded localhost outside of config/env files.

### 9. Secrets Scan
Grep for potential secrets in source code:
- API keys: `(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
- Passwords: `password\s*[:=]\s*["'][^"']+["']` (not in example files)
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Connection strings with embedded credentials

Also check for `.env` files committed to git:
```bash
git ls-files '*.env' '.env*' | grep -v '.example' | grep -v '.template'
```
**FAIL** for committed secrets. **WARN** for potential false positives.

## Output Format

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Compilation | PASS/FAIL | Go clean, TypeScript clean |
| 2 | Linting | PASS/FAIL/WARN | N errors, N warnings |
| 3 | Tests | PASS/FAIL | N pass, N fail |
| 4 | Build/Bundle | PASS/FAIL/WARN | Size: NKB gzip |
| 5 | Migrations | PASS/FAIL/WARN | N pairs, N missing |
| 6 | API Spec | PASS/WARN/N/A | N undocumented, N stale |
| 7 | Debug Artifacts | PASS/WARN | N occurrences |
| 8 | Env Config | PASS/WARN | N undocumented vars |
| 9 | Secrets | PASS/FAIL/WARN | N findings |

**Verdict: READY / NOT READY for deploy**

If NOT READY, list blocking issues (FAILs) that must be resolved before deployment.
