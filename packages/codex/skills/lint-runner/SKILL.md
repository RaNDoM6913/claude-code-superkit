---
name: lint-runner
description: Auto-detect and run project linters — supports Go, TypeScript, Python, Rust, and more
user-invocable: true
---

# Lint

Auto-detect the project's linters and run them.

## Target

Parse the user's request to determine scope and parameters. Accepted formats: `backend`, `frontend`, `all`, `--fix`.

## Step 1 — Detect Linters

Scan the project for stack markers and their associated linters:

| Marker | Format Command | Lint Command | Stack |
|--------|---------------|-------------|-------|
| `go.mod` | `gofmt -w .` | `go vet ./...` | Go |
| `go.mod` + `golangci-lint` in PATH | `gofmt -w .` | `golangci-lint run` | Go (extended) |
| `package.json` + `.eslintrc*` / `eslint.config.*` | — | `npx eslint .` | ESLint |
| `package.json` + `tsconfig.json` | — | `npx tsc --noEmit` | TypeScript |
| `package.json` + prettier config | `npx prettier --write .` | `npx prettier --check .` | Prettier |
| `pyproject.toml` + `[tool.ruff]` | `ruff format .` | `ruff check .` | Python (ruff) |
| `pyproject.toml` + `[tool.black]` | `black .` | — | Python (black) |
| `pyproject.toml` + `[tool.flake8]` / `setup.cfg` | — | `flake8` | Python (flake8) |
| `pyproject.toml` + `[tool.mypy]` | — | `mypy .` | Python (mypy) |
| `Cargo.toml` | `cargo fmt` | `cargo clippy -- -D warnings` | Rust |
| `Makefile` with `lint` target | — | `make lint` | Makefile |
| `Makefile` with `fmt` target | `make fmt` | — | Makefile |

If a `Makefile` with `lint` / `fmt` targets exists, prefer them — they may include project-specific setup.

## Step 2 — Determine Scope

Based on the user's request:

### backend
Lint backend code only. In a monorepo, `cd` into the backend directory first.

### frontend
Lint frontend code only. In a monorepo, `cd` into the frontend directory first.

### all (default if no argument)
Run all detected linters sequentially. Report results for each.

### --fix
When `--fix` is present in the request, run linters in auto-fix mode:
- **Go**: `gofmt -w .` (always fixes)
- **ESLint**: `npx eslint . --fix`
- **Prettier**: `npx prettier --write .`
- **ruff**: `ruff check . --fix && ruff format .`
- **black**: `black .` (always fixes)
- **Rust**: `cargo fmt` + `cargo clippy --fix --allow-dirty`

## Step 3 — Run and Report

Execute linters and report results:

```
## Lint Results

### [Linter Name]
- Command: `[exact command run]`
- Result: PASS / N issues found
- Details: [first 10 issues if any]

### Summary
- Format: PASS/FAIL
- Lint: PASS/FAIL (N issues)
- Types: PASS/FAIL (N errors)
```

## Notes

- Always run formatter before linter (format first, then check)
- For TypeScript projects, run both ESLint and `tsc --noEmit` (ESLint catches style, tsc catches types)
- For Go projects, `gofmt` + `go vet` is the minimum; `golangci-lint` if available is better
- `--fix` mode modifies files in place — only applies to format and auto-fixable lint rules
