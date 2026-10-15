---
name: lint-runner
description: Auto-detect and run project linters — supports Go, TypeScript, Python, Rust, and more
user-invocable: true
tokens: 1061
---

# Lint

Auto-detect the project's linters and run them.

## Target

Parse the user's request to determine scope and parameters. Accepted formats: `backend`, `frontend`, `all`, `--fix`.

Read applicable `AGENTS.md` instructions and discover the runtime's command tools. Inspect configured package scripts/Make targets and installed versions before running them. Prefer existing scripts or local binaries; the command examples assume the corresponding local runner is already installed. Do not install missing tools implicitly. Default mode checks only: use non-writing formatter flags and reject a target that silently fixes files. `--fix` authorizes scoped formatter/linter changes, not dependency updates or overwriting unrelated work.

## Step 1 — Detect Linters

Scan the project for stack markers and their associated linters:

| Marker | Format Command | Lint Command | Stack |
|--------|---------------|-------------|-------|
| `go.mod` | `gofmt -l <selected Go files>` | `go vet ./...` | Go |
| `go.mod` + `golangci-lint` in PATH | `gofmt -l <selected Go files>` | `golangci-lint run` | Go (extended) |
| `package.json` + `.eslintrc*` / `eslint.config.*` | — | `./node_modules/.bin/eslint .` | ESLint |
| `package.json` + `tsconfig.json` | — | `./node_modules/.bin/tsc --noEmit` | TypeScript |
| `package.json` + prettier config | `./node_modules/.bin/prettier --check .` | — | Prettier |
| `pyproject.toml` + `[tool.ruff]` | `ruff format --check .` | `ruff check .` | Python (ruff) |
| `pyproject.toml` + `[tool.black]` | `black --check .` | — | Python (black) |
| `pyproject.toml` + `[tool.flake8]` / `setup.cfg` | — | `flake8` | Python (flake8) |
| `pyproject.toml` + `[tool.mypy]` | — | `mypy .` | Python (mypy) |
| `Cargo.toml` | `cargo fmt -- --check` | `cargo clippy -- -D warnings` | Rust |
| `Makefile` with `lint` target | — | `make lint` | Makefile |
| `Makefile` with `fmt` target | Inspect for a check-only equivalent | — | Makefile |

Prefer configured targets only after confirming their scope and effects. A `fmt` target commonly writes files and belongs in `--fix` mode.

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
- **ESLint**: `./node_modules/.bin/eslint . --fix`
- **Prettier**: `./node_modules/.bin/prettier --write .`
- **ruff**: `ruff check . --fix && ruff format .`
- **black**: `black .` (always fixes)
- **Rust**: `cargo fmt`; use Clippy fixes only with scoped, reviewed changes and its installed version's supported options. Do not bypass dirty-worktree protection automatically.

## Step 3 — Run and Report

Execute linters and preserve original command exits even when capturing or shortening output. For `gofmt -l`, non-empty output means formatting is needed even when the command exits zero. Missing tools, timeouts and unrun required checks are UNAVAILABLE/INCOMPLETE, not PASS. In fix mode inspect the resulting diff and rerun affected checks; never use a successful fix command as proof of a clean check.

```
## Lint Results

### [Linter Name]
- Command: `[exact command run]`
- Working directory / scope: [selected package and files]
- Exit / result: [original exit; PASS / FAIL / UNAVAILABLE / INCOMPLETE; issue count if reported]
- Details: [first 10 issues if any]

### Summary
- Format: PASS/FAIL/UNAVAILABLE/INCOMPLETE/N/A (reason)
- Lint: PASS/FAIL/UNAVAILABLE/INCOMPLETE/N/A (reason, actual issue count)
- Types: PASS/FAIL/UNAVAILABLE/INCOMPLETE/N/A (reason, actual error count)
```

## Notes

- Run formatting checks before lint; write formatting changes only in authorized fix mode.
- For TypeScript projects, run both ESLint and `tsc --noEmit` (ESLint catches style, tsc catches types)
- For Go projects, `gofmt` + `go vet` is the minimum; `golangci-lint` if available is better
- `--fix` mode modifies files in place — only applies to format and auto-fixable lint rules
