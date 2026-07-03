---
description: Auto-detect and run project tests — supports Go, TypeScript, Python, Rust, and more
argument-hint: "[backend|frontend|e2e|all] [--coverage]"
allowed-tools: Bash
---

# Run Tests

Auto-detect the project's test runner, execute the tests for the requested scope, and report the runner's real results.

## Hard Rules

- Report the runner's REAL output — paste the actual pass/fail/skip lines; never summarize from memory or invent counts.
- Consume the argument exactly as `scope` + optional `--coverage`; when no scope is given, default to `backend`.
- If the chosen scope has no matching markers (e.g. `backend` on a frontend-only repo), fall back to running all detected suites — never do nothing.
- Detect commands only from the Step 1–2 tables; do not invent test commands or flags.
- When a `Makefile` `test` target exists for the stack, prefer `make test`.
- For scope `all`, run every detected suite sequentially and report each separately.
- On failure, show the first 5 failure details for diagnosis — no more.

## Step 1 — Detect Test Runner

Scan the project root and subdirectories for stack markers:

| Marker | Test Command | Stack |
|--------|-------------|-------|
| `go.mod` | `go test ./... -count=1` | Go |
| `package.json` + vitest config | `npx vitest run` | Vitest |
| `package.json` + jest config | `npx jest` | Jest |
| `package.json` + playwright config | `npx playwright test` | Playwright (e2e) |
| `cypress.config.{js,ts}` | `npx cypress run` | Cypress (e2e) |
| `pyproject.toml` / `pytest.ini` / `conftest.py` | `pytest` | Python (pytest) |
| `pyproject.toml` with `[tool.unittest]` | `python -m unittest discover` | Python (unittest) |
| `tests/e2e/` dir + pytest | `pytest tests/e2e/` | Python E2E (selenium) |
| `Cargo.toml` | `cargo test` | Rust |
| `pom.xml` | `mvn test` | Java (Maven) |
| `build.gradle` | `./gradlew test` | Java/Kotlin (Gradle) |
| `Makefile` with `test` target | `make test` | Makefile |

If a `Makefile` with a `test` target exists and the stack has one, prefer `make test` as it may include additional setup.

**Done when:** every stack present in the repo is mapped to its exact test command (or to `make test`).

## Step 2 — Determine Scope and Coverage

Parse `$ARGUMENTS` into a `scope` token (`backend` | `frontend` | `e2e` | `all`; empty → `backend`) and an optional `--coverage` flag, then select commands:

### backend (default)
Run backend tests only:
- **Go**: `go test ./... -count=1 -short` (`-short` skips integration tests that need external services)
- **Python**: `pytest tests/` or `pytest`
- **Rust**: `cargo test`
- **Java**: `mvn test` / `./gradlew test`

If the project is a monorepo, `cd` into the backend directory first (detect by `backend/`, `server/`, `api/`, or `src/` containing the go.mod/pyproject.toml).

**Fallback:** if no backend markers are detected, run all detected suites instead (treat as scope `all`).

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
Run every detected suite (backend + frontend + e2e) sequentially. Report results for each.

### --coverage (append when the flag is present)
- **Go**: `go test ./... -coverprofile=coverage.out` then `go tool cover -func=coverage.out | tail -1`
- **Vitest/Jest**: append `--coverage`
- **pytest**: append `--cov`
- **Rust**: requires `cargo-tarpaulin` — `cargo tarpaulin`

**Done when:** the exact command(s) to run are assembled, including any coverage flags, monorepo `cd`, and the `all` fallback if the scope had no markers.

## Step 3 — Run and Report

Execute the assembled command(s). Paste the runner's real output, then fill the template below. For scope `all`, repeat the per-stack block once per suite. If tests fail, show the first 5 failure details for diagnosis.

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

**Done when:** every selected command has been executed, its real output pasted, and the Test Results template filled for each suite.

## Recap — non-negotiables

- Paste the runner's REAL output; never fabricate counts or claim a pass you did not see.
- Default scope is `backend`; if no backend markers exist, run all detected suites.
- Use only the commands/flags in the Step 1–2 tables; prefer `make test` when a test target exists.
- On failures, show the first 5 for diagnosis.
