---
name: pre-deploy-validator
description: 9-point pre-deploy gate — compilation, linting, tests, build/bundle, migrations, API spec, debug artifacts, env config, secrets — ends in READY / NOT READY
tokens: 1874
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Pre-Deploy Validator

Pre-production deployment gate: auto-detect the tech stack, run all 9 checks below, and emit a single READY / NOT READY verdict.

## Hard Rules

1. **Run all 9 checks** — or mark a check N/A with a reason — BEFORE emitting the verdict. Never stop at the first FAIL.
2. **Verdict rule**: READY = zero FAIL across all 9 rows. NOT READY = one or more FAIL, with every FAIL row enumerated as a blocker. WARNs never block — list them and stay READY.
3. **Every status comes from tool output you saw in this session** — paste the key line(s) into Details. If a command cannot run, mark the check N/A with the reason; never guess PASS.
4. **Validate only — never fix.** Report blockers; do not edit code or delete artifacts.
5. Each check gets exactly one status: PASS / FAIL / WARN / N/A. Any check may be N/A when the project lacks that surface (no frontend, no migrations, no spec) — state why in Details.

## Phase 0 — Load Project Context

Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md` (build/test/lint commands, migration format, deployable components). If neither exists, fall back to README.md + directory structure.
Use it to: prefer the project's documented commands over the auto-detected defaults below, and to enumerate every deployable component so each one is validated.

## Phase 1 — Detect Stack & Components

Scan the project root to identify components and their verification commands:
- `go.mod` — Go: `go vet`, `go test`, `golangci-lint` (if available)
- `package.json` — Node.js/frontend: `tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- `requirements.txt` / `pyproject.toml` — Python: `mypy`, `ruff`/`flake8`, `pytest`
- `Cargo.toml` — Rust: `cargo check`, `cargo clippy`, `cargo test`
- `migrations/` — SQL migrations
- `**/openapi.yaml` — API spec

Done when: you have the component list and the command set for checks 1–4.

## Phase 2 — Run the 9 Checks

Done when: every one of the 9 rows has exactly one status backed by output you saw.

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

**FAIL** for lint errors. **WARN** for warnings.

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
**WARN** if main chunk > 250KB gzip. Use a project-documented threshold from CLAUDE.md/AGENTS.md if one exists; otherwise apply this default.

### 5. Migration Consistency
If a migrations directory exists:
```bash
# Check every up migration has a matching down migration
for f in $(find . -path "*/migrations/*.up.sql" -o -path "*/migrations/*.up.*" 2>/dev/null); do
  down=$(echo "$f" | sed 's/\.up\./\.down\./')
  [ ! -f "$down" ] && echo "MISSING ROLLBACK: $(basename $f)"
done

# Duplicate migration numbers (same numeric prefix used twice)
ls migrations/*.up.sql 2>/dev/null | sed 's/.*\///; s/_.*//' | sort | uniq -d
```
Also eyeball the sorted prefix list for gaps in the sequence.
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
- Python: `print\(|pdb\.set_trace|breakpoint\(\)` in source files (not test files)
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
- API keys: `(api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]{16,}["']`
- Passwords: `password\s*[:=]\s*["'][^"']+["']`
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- Connection strings with embedded credentials (e.g. `://user:pass@`)

Also check for `.env` files committed to git:
```bash
git ls-files '*.env' '.env*' | grep -v '.example' | grep -v '.template'
```

Classify every hit — all branches:

| Hit | Status |
|-----|--------|
| Committed non-example `.env` file | FAIL |
| Real-looking credential in shipped source (high-entropy value, not a placeholder) | FAIL |
| Value in a test/fixture/example/docs path, OR a placeholder (`changeme`, `example`, `xxx`, `your-key-here`, `<...>`) | WARN — note as likely false positive |
| Cannot tell which of the above | WARN — state why you could not confirm |

## Output Contract

```markdown
# Pre-Deploy Validation

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Compilation | PASS/FAIL/N/A | <per-component result> |
| 2 | Linting | PASS/FAIL/WARN/N/A | <N errors, N warnings> |
| 3 | Tests | PASS/FAIL/N/A | <N pass, N fail> |
| 4 | Build/Bundle | PASS/FAIL/WARN/N/A | <size: N KB gzip> |
| 5 | Migrations | PASS/FAIL/WARN/N/A | <N pairs, N missing> |
| 6 | API Spec | PASS/WARN/N/A | <N undocumented, N stale> |
| 7 | Debug Artifacts | PASS/WARN | <N occurrences> |
| 8 | Env Config | PASS/WARN | <N undocumented vars> |
| 9 | Secrets | PASS/FAIL/WARN | <N findings> |

**Verdict: READY** (zero FAIL)
— or —
**Verdict: NOT READY** — blockers (every FAIL row):
- Check <N> (<name>): <what failed> — <command/file evidence>

Warnings (non-blocking):
- Check <N>: <one line each>
```

Fill exactly one status per row. Mini example (abridged):

```markdown
| 1 | Compilation | PASS | go vet clean; tsc clean |
| 3 | Tests | FAIL | 2/148 failing: TestAuthRefresh, TestRateLimit |
| 9 | Secrets | WARN | AWS-like key in tests/fixtures/s3_mock.py:12 (fixture path) |

**Verdict: NOT READY** — blockers (every FAIL row):
- Check 3 (Tests): 2 failing tests — `go test ./...` output above

Warnings (non-blocking):
- Check 9: fixture-path key, likely false positive
```

## Recap — non-negotiables

- All 9 checks run or marked N/A (with reason) before the verdict — never fail-fast.
- READY = zero FAIL. Any FAIL = NOT READY with blockers enumerated. WARNs never block.
- Statuses only from tool output seen this session; an unrunnable check is N/A, never a guessed PASS.
- Validate only — never fix code or artifacts.
