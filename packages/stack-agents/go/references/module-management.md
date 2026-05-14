# Go Module Management

`go.mod` / `go.sum` discipline. Covers `go mod`, versioning, vendor, monorepo workspaces.

## go.mod essentials

```
module github.com/org/project

go 1.23

require (
    github.com/jackc/pgx/v5 v5.5.0
    go.uber.org/fx v1.20.1
)

require (
    github.com/jackc/pgpassfile v1.0.0 // indirect
    // ...
)
```

- First `require` block: direct dependencies
- Second `require` block: indirect (pulled in by direct deps)
- `// indirect` marker is auto-managed by `go mod tidy`

## Daily commands

| Command | Purpose |
|---------|---------|
| `go mod tidy` | Add missing, remove unused; updates go.sum |
| `go mod download` | Pre-fetch deps for CI / build cache |
| `go mod vendor` | Copy deps into `vendor/` (rarely needed) |
| `go list -m all` | List all module deps with versions |
| `go list -m -u all` | Show available updates |
| `go get pkg@latest` | Upgrade to latest |
| `go get pkg@v1.2.3` | Pin to specific version |
| `go mod why pkg` | Explain why a module is in the graph |
| `go mod graph` | Print dep graph (machine-readable) |

## Versioning

- **v0.x.y** — pre-stable, breaking changes allowed
- **v1.x.y** — stable, semver
- **v2.x.y+** — major version is part of the import path: `github.com/org/proj/v2`

Go's "major version in path" rule means upgrading to v2 of a library requires updating import statements.

## Pinning vs latest

```go
// Pinned (recommended)
require github.com/jackc/pgx/v5 v5.5.0

// Range (avoid in production)
require github.com/jackc/pgx/v5 v5.5.0 // indirect
```

Always commit `go.sum` — it's the integrity checklist. Without it, builds aren't reproducible.

## Replace directives

```go
require example.com/lib v1.2.3
replace example.com/lib => ../local-fork
```

Use cases:
- Local fork for debugging
- Monorepo modules pointing at sibling packages
- Patched upstream waiting on release

**Caution:** `replace` doesn't propagate to consumers. Anyone importing your module gets the original, not the replacement.

## Workspaces (Go 1.18+)

For monorepos with multiple modules:

```go
// go.work
go 1.23

use (
    ./api
    ./shared
    ./worker
)
```

Each subdirectory has its own `go.mod`. Workspace mode unifies builds without `replace`.

## Private modules

```bash
# Tell go to skip the proxy for private repos
export GOPRIVATE=github.com/org/*
export GONOPROXY=github.com/org/*
export GONOSUMCHECK=github.com/org/*
```

For SSH-based git: `git config --global url.git@github.com:.insteadOf https://github.com/`.

## Build tags

Conditional compilation:

```go
//go:build linux && amd64

package main
```

For test-only files: `//go:build integration` then `go test -tags=integration ./...`.

## Vulnerability scan

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

Run in CI; failures are usually CVEs in deps that need an upgrade.

## Common issues

| Symptom | Fix |
|---------|-----|
| `verifying X: checksum mismatch` | `rm go.sum && go mod tidy` (only if you trust the source) |
| `missing go.sum entry` | `go mod tidy` |
| `module declares its path as X but was required as Y` | The dep changed its module path; update the import |
| Slow CI builds | Cache `~/go/pkg/mod` and `~/.cache/go-build` |
| `replace` ignored | Replace only works in the main module, not transitively |

## Anti-patterns

- **Committing `vendor/` without need** — bloats repo; only commit if you need air-gapped builds
- **Ignoring `go.sum`** — destroys build reproducibility
- **Range-version requires** (`v1.0.0`) — pins should be exact
- **Stale `go mod tidy`** — run it on every PR
- **Mixing `replace` and `workspace`** — pick one

## CI checklist

```yaml
- run: go mod download
- run: go mod tidy && git diff --exit-code go.mod go.sum  # fail if tidy changed anything
- run: govulncheck ./...
- run: go vet ./...
- run: go test -race ./...
```
