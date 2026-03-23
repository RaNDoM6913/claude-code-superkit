---
description: Auto-detect and run project tests — supports Go, TypeScript, Python, Rust, and more
argument-hint: "[backend|frontend|e2e|all] [--coverage]"
allowed-tools: Bash
---

# Run Tests

Auto-detect the project's test runner and execute tests.

## Target

$ARGUMENTS

## Step 1 — Detect Test Runner

Scan the project root and subdirectories for stack markers:

| Marker | Test Command | Stack |
|--------|-------------|-------|
| `go.mod` | `go test ./... -count=1` | Go |
| `package.json` + vitest config | `npx vitest run` | Vitest |
| `package.json` + jest config | `npx jest` | Jest |
| `package.json` + playwright config | `npx playwright test` | Playwright (e2e) |
| `pyproject.toml` / `pytest.ini` / `conftest.py` | `pytest` | Python (pytest) |
| `pyproject.toml` with `[tool.unittest]` | `python -m unittest discover` | Python (unittest) |
| `Cargo.toml` | `cargo test` | Rust |
| `pom.xml` | `mvn test` | Java (Maven) |
| `build.gradle` | `./gradlew test` | Java/Kotlin (Gradle) |
| `Makefile` with `test` target | `make test` | Makefile |

If a `Makefile` with a `test` target exists and the stack has one, prefer `make test` as it may include additional setup.

## Step 2 — Determine Scope

Based on `$ARGUMENTS`:

### backend (or empty — default)
Run backend tests only:
- **Go**: `go test ./... -count=1 -short`
- **Python**: `pytest tests/` or `pytest`
- **Rust**: `cargo test`
- **Java**: `mvn test` / `./gradlew test`

If the project is a monorepo, `cd` into the backend directory first (detect by `backend/`, `server/`, `api/`, or `src/` containing the go.mod/pyproject.toml).

### frontend
Run frontend tests:
- **Vitest**: `npx vitest run`
- **Jest**: `npx jest`

If the project is a monorepo, `cd` into the frontend directory first (detect by `frontend/`, `web/`, `client/`, or `app/` containing package.json).

### e2e
Run end-to-end tests:
- **Playwright**: `npx playwright test`
- **Cypress**: `npx cypress run`
- **pytest + selenium**: `pytest tests/e2e/`

### all
Run all detected test suites sequentially. Report results for each.

### --coverage
Append coverage flag to the test command:
- **Go**: `-coverprofile=coverage.out` then `go tool cover -func=coverage.out`
- **Vitest/Jest**: `--coverage`
- **pytest**: `--cov`
- **Rust**: requires `cargo-tarpaulin` — `cargo tarpaulin`

## Step 3 — Run and Report

Execute the test command. After completion, report:

```
## Test Results

### [Stack Name]
- Command: `[exact command run]`
- Result: X passed, Y failed, Z skipped
- Duration: Ns
- Coverage: XX% (if --coverage flag used)

### Failures (if any)
1. TestName — error message (file:line)
2. ...
```

## Notes

- Use `-short` flag for Go tests by default (skips integration tests that need external services)
- For Go coverage: `go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out | tail -1`
- For monorepos with multiple test suites, detect and run them all when scope is `all`
- If tests fail, show the first 5 failure details for diagnosis
