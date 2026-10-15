---
name: test-runner
description: Auto-detect and run project tests — supports Go, TypeScript, Python, Rust, and more
user-invocable: true
tokens: 1190
---

# Run Tests

Auto-detect the project's test runner and execute tests.

## Target

Parse the user's request to determine scope and parameters. Accepted formats: `backend`, `frontend`, `e2e`, `all`, `--coverage`.

Read applicable `AGENTS.md` instructions and discover the current runtime's command tools. Inspect the selected package's scripts/configuration and installed tool versions before execution. Prefer its existing package-manager scripts or installed binaries; the command examples below assume the corresponding local runner is already installed. Do not install missing tools implicitly. Inspect Make targets and setup/teardown effects before using them. Do not start infrastructure, change dependencies, contact a live service, or mutate a shared database without authority for that target; report unavailable prerequisites. Preserve existing work and test outputs that are not yours.

## Step 1 — Detect Test Runner

Scan the project root and subdirectories for stack markers:

| Marker | Test Command | Stack |
|--------|-------------|-------|
| `go.mod` | `go test ./... -count=1` | Go |
| `package.json` + vitest config | `./node_modules/.bin/vitest run` | Vitest |
| `package.json` + jest config | `./node_modules/.bin/jest` | Jest |
| `package.json` + playwright config | `./node_modules/.bin/playwright test` | Playwright (e2e) |
| `pyproject.toml` / `pytest.ini` / `conftest.py` | `pytest` | Python (pytest) |
| Existing unittest suite / configured unittest command | `python -m unittest discover` | Python (unittest) |
| `Cargo.toml` | `cargo test` | Rust |
| `pom.xml` | `mvn test` | Java (Maven) |
| `build.gradle` | `./gradlew test` | Java/Kotlin (Gradle) |
| `Makefile` with `test` target | `make test` | Makefile |

Prefer the project's configured test target after confirming its scope and effects. Marker files alone do not prove a runner is installed or configured.

## Step 2 — Determine Scope

Based on the user's request:

### backend
Run backend tests only:
- **Go**: `go test ./... -count=1 -short`
- **Python**: `pytest tests/` or `pytest`
- **Rust**: `cargo test`
- **Java**: `mvn test` / `./gradlew test`

If the project is a monorepo, `cd` into the backend directory first (detect by `backend/`, `server/`, `api/`, or `src/` containing the go.mod/pyproject.toml).

### frontend
Run frontend tests:
- **Vitest**: `./node_modules/.bin/vitest run`
- **Jest**: `./node_modules/.bin/jest`

If the project is a monorepo, `cd` into the frontend directory first (detect by `frontend/`, `web/`, `client/`, or `app/` containing package.json).

### e2e
Run end-to-end tests:
- **Playwright**: `./node_modules/.bin/playwright test`
- **Cypress**: `./node_modules/.bin/cypress run`
- **pytest + selenium**: `pytest tests/e2e/`

### all
Run all detected test suites sequentially. Report results for each.

### Empty request
Use the project's documented default suite. If absent, select the sole detected suite; if several materially different targets remain, clarify the intended scope. Do not silently exclude a frontend-only project's tests by assuming backend.

### --coverage
Use coverage only when supported by the configured runner and installed plugins; keep its measurement scope explicit. Choose a fresh output path to avoid overwriting existing evidence:
- **Go**: `-coverprofile=coverage.out` then `go tool cover -func=coverage.out`
- **Vitest/Jest**: `--coverage`
- **pytest**: `--cov`
- **Rust**: requires `cargo-tarpaulin` — `cargo tarpaulin`

## Step 3 — Run and Report

Execute the selected command and preserve its original exit code, including when output is captured or summarized. A timeout, launch failure, missing tool, no tests collected or an all-skipped run is not a pass. Do not infer counts or coverage from a zero formatter/pipeline exit. Record full suitably redacted logs locally; summarize failures without losing the final runner result. After completion, report:

```
## Test Results

### [Stack Name]
- Command: `[exact command run]`
- Working directory / code revision: [scope and relevant working changes]
- Exit / status: [exit code; PASS / FAIL / UNAVAILABLE / INCOMPLETE]
- Result: X passed, Y failed, Z skipped
- Duration: Ns
- Coverage: XX% (if --coverage flag used)

### Failures (if any)
1. TestName — error message (file:line)
2. ...
```

## Notes

- Use `-short` for the scoped Go backend default only when it matches project policy; report excluded integration coverage and never let it satisfy a required full suite.
- Coverage collection and summary are separate commands; preserve the test exit even if the coverage reporter succeeds.
- For monorepos with multiple test suites, detect and run them all when scope is `all`
- If tests fail, show the first 5 failure details for diagnosis
