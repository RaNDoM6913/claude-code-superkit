---
description: Auto-detect and run project linters — supports Go, TypeScript, Python, Rust, and more
argument-hint: "[backend|frontend|all] [--fix]"
allowed-tools: Bash
---

# Lint

## Role

Auto-detect the project's formatters and linters from stack-marker files and run them — optionally scoped to backend or frontend, optionally in `--fix` mode.

## Hard Rules

- Run the formatter before the linter for each stack (format first, then check).
- Prefer a Makefile `lint` / `fmt` target over the raw tool when one exists — it may carry project-specific setup.
- Run only the commands in the Step 2 table (and the Step 4 `--fix` variants); never invent linters, flags, or tools not listed there.
- Treat `--fix` as a modifier combinable with any scope, not as a scope of its own.
- `--fix` rewrites files in place — apply it only to the Step 4 format and auto-fix commands, never to check-only commands (`go vet`, `tsc --noEmit`, `mypy`, `flake8`).
- Report every detected in-scope linter, including PASS and unavailable ones; one block per detected in-scope linter.
- Default to scope `all` for empty or unrecognized input — never guess a narrower scope.

## Step 1 — Parse Arguments

Read the request and derive two independent values from it. Scope and fix are orthogonal: any scope may carry `--fix`.

$ARGUMENTS

- **scope** = the first bare token equal to `backend`, `frontend`, or `all`. Empty input or any unrecognized token → `all`.
- **fix** = `true` if the token `--fix` appears anywhere in the input, else `false`.

Done-when: `scope` is exactly one of `backend` / `frontend` / `all`, and `fix` is `true` or `false`.

## Step 2 — Detect Linters

Scan the project for stack markers and map each present marker to its commands. Detect with Bash only: `test -f <marker>` for files, `grep -q '<section>' pyproject.toml` for a config section, `command -v <tool>` for a tool on PATH.

| Marker | Format Command | Lint Command | Stack |
|--------|---------------|-------------|-------|
| `go.mod` | `gofmt -w .` | `go vet ./...` | Go |
| `go.mod` + `golangci-lint` in PATH | `gofmt -w .` | `golangci-lint run` | Go (extended) |
| `package.json` + `.eslintrc*` / `eslint.config.*` | — | `npx eslint .` | ESLint |
| `package.json` + `tsconfig.json` | — | `npx tsc --noEmit` | TypeScript |
| `package.json` + prettier config (`.prettierrc*`, `prettier.config.*`, or a `prettier` key in `package.json`) | `npx prettier --write .` | `npx prettier --check .` | Prettier |
| `pyproject.toml` + `[tool.ruff]` | `ruff format .` | `ruff check .` | Python (ruff) |
| `pyproject.toml` + `[tool.black]` | `black .` | — | Python (black) |
| `pyproject.toml` + `[tool.flake8]` / `setup.cfg` | — | `flake8` | Python (flake8) |
| `pyproject.toml` + `[tool.mypy]` | — | `mypy .` | Python (mypy) |
| `Cargo.toml` | `cargo fmt` | `cargo clippy -- -D warnings` | Rust |
| `Makefile` with `lint` target | — | `make lint` | Makefile |
| `Makefile` with `fmt` target | `make fmt` | — | Makefile |

A `—` cell means that stack has no command for that slot — skip it. If a `Makefile` with `lint` / `fmt` targets exists, prefer them over the raw tool for that slot — they may include project-specific setup.

Done-when: every marker present in the repo is mapped to its format/lint commands; the set of detected linters is fixed.

## Step 3 — Resolve Scope Directory

Pick where to run based on `scope` from Step 1:

- **`all`** — run every linter detected in Step 2. For each directory that carries its own markers (the repo root, plus each depth-1 subdirectory that has markers in a monorepo), run that directory's linters from within it. Enter each marked directory in turn; no single `cd`.
- **`backend`** — locate the backend directory, then run only the linters detected there:
  1. A backend directory carries `go.mod`, `pyproject.toml`, `Cargo.toml`, or a `package.json` with no frontend-framework dependency.
  2. Check the repo root first; if it has no backend marker, scan direct subdirectories (depth 1) for one.
  3. Exactly one match → `cd` into it. More than one → list the candidates and ask which to lint. Zero → fall back to `all` and note the fallback.
- **`frontend`** — locate the frontend directory, then run only the linters detected there:
  1. A frontend directory has a `package.json` that declares a frontend framework — detect with `grep -E '"(react|vue|svelte|next|nuxt|@angular/core|solid-js|astro|vite)"' package.json`.
  2. Check the repo root first, then direct subdirectories (depth 1).
  3. Exactly one match → `cd` into it. More than one → list the candidates and ask which to lint. Zero → fall back to `all` and note the fallback.

Done-when: the working directory (or set of directories) for the chosen scope is fixed, or the run has fallen back to `all`.

## Step 4 — Run Linters

For each in-scope linter, run format first, then check. Skip any table cell shown as `—`.

- **fix = false** — run the linter's Format Command then its Lint Command from the Step 2 table.
- **fix = true** — replace the table's Format Command with the auto-fix variant below, then still run the Lint Command. A detected linter with no fix variant listed here runs its table Lint Command unchanged (check-only):
  - Go: `gofmt -w .`
  - ESLint: `npx eslint . --fix`
  - Prettier: `npx prettier --write .`
  - ruff: `ruff check . --fix && ruff format .`
  - black: `black .`
  - Rust: `cargo fmt` then `cargo clippy --fix --allow-dirty`

For a TypeScript project, run both ESLint and `npx tsc --noEmit` — ESLint catches style, `tsc` catches types. `tsc --noEmit`, `mypy`, `flake8`, and `go vet` are check-only, so `--fix` leaves them unchanged.

If a tool named in the table is not installed (command not found), mark it `unavailable` and continue with the remaining linters.

Done-when: every detected in-scope linter has either produced output or been marked `unavailable`.

## Output

Emit exactly this structure — one `### <Linter Name>` block per detected in-scope linter, then one `### Summary`:

```
## Lint Results

### [Linter Name]
- Command: `[exact command run]`
- Result: PASS / N issues found / unavailable
- Details: [first 10 issues if any]

### Summary
- Format: PASS/FAIL
- Lint: PASS/FAIL (N issues)
- Types: PASS/FAIL (N errors)
```

Filled example:

```
## Lint Results

### Go (extended)
- Command: `golangci-lint run`
- Result: 2 issues found
- Details: cmd/main.go:14 ineffassign · internal/db/pool.go:88 errcheck

### Summary
- Format: PASS
- Lint: FAIL (2 issues)
- Types: PASS
```

## Done ONLY when

- [ ] Every linter detected in Step 2 that falls within scope was run, or explicitly reported as `unavailable`.
- [ ] The report has one `### <Linter>` block per detected in-scope linter — block count equals the detected in-scope linter count.

## Recap — non-negotiables

- Format before check, per stack; Makefile `lint` / `fmt` targets win over raw tools.
- Run only Step 2 table commands and Step 4 `--fix` variants — `--fix` is a modifier that rewrites files in place, never a scope.
- Empty or unrecognized scope → `all`; never narrow by guessing.
- For TypeScript run both ESLint and `tsc --noEmit`; check-only tools stay unchanged under `--fix`.
- Not done until every in-scope linter ran or was reported `unavailable`.
