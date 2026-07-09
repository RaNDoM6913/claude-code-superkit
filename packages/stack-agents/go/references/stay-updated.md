# Staying Updated with Go

Go ships every 6 months. New features and standard library additions can replace third-party libs entirely. This reference covers how to keep code idiomatic.

## Track Go releases

- **Major release every 6 months** (Feb / Aug)
- Release notes: https://go.dev/doc/go${VERSION}
- Each major release is supported for **two cycles** (~1 year)

Subscribe to the [go-announce](https://groups.google.com/g/golang-announce) mailing list.

## Recent additions worth knowing (1.21+)

### 1.21
- `min`, `max`, `clear` built-ins
- `slices` package (`slices.Sort`, `slices.Index`, `slices.Contains`)
- `maps` package (`maps.Clone`, `maps.Equal`)
- Profile-Guided Optimization (PGO)

### 1.22
- `for range int` syntax: `for i := range 10 { }`
- New `math/rand/v2` (better defaults)
- `net/http.ServeMux` got method matching: `mux.HandleFunc("GET /users/{id}", ...)`

### 1.23
- Range over functions: `for x := range generator { }`
- `unique` package for canonicalization
- Timer leak fixes (`time.Timer.Reset` semantics)

### 1.24
- Generic type aliases
- Updated `os.Root` for safe file ops
- Updated runtime cleanup hooks

### 1.25
- `sync.WaitGroup.Go(f)` — spawn + track a goroutine in one call (replaces `Add(1)`/`go`/`defer Done()`)
- `testing/synctest.Test` now stable (was `synctest.Run` behind `GOEXPERIMENT=synctest` in 1.24)
- `net/http.CrossOriginProtection` — built-in CSRF defense for browser requests
- Container-aware `GOMAXPROCS` default — respects cgroup CPU limits (`go.uber.org/automaxprocs` now redundant)
- `reflect.TypeAssert[T](v)` — typed assertion off a `reflect.Value` without `.Interface()`
- Green Tea GC experimental (`GOEXPERIMENT=greenteagc`)

### 1.26
- `errors.AsType[E error](err)` — generic typed extraction, no pointer-to-target dance (see `error-inspection.md`)
- `slog.NewMultiHandler(...)` — stdlib fan-out to multiple handlers
- Green Tea GC now the default (no flag)
- `httputil.ReverseProxy.Rewrite` replaces the deprecated `.Director`
- `encoding/json/v2` experimental behind `GOEXPERIMENT=jsonv2` — keep `encoding/json`

## Standard library now replaces these third-party libs

| Was: | Now use: |
|------|----------|
| `github.com/google/uuid` (sometimes) | nothing — uuid is still external |
| `pkg/errors` | `errors.Wrap` → standard `fmt.Errorf("%w", err)` |
| `github.com/stretchr/objx` | `slices` / `maps` for most cases |
| `github.com/go-redis/cache` | depends — keep using |
| `github.com/google/wire` | still works for compile-time DI, but archived Aug 25 2025 — feature-complete and unmaintained |
| Manual rand seeding | `math/rand/v2` (auto-seeded) |
| Hand-written http muxers | `net/http.ServeMux` with method matching (1.22+) |

## go-modernize

The `go fix` tool is being replaced by `go fix -modernize`. Run it periodically:

```bash
# Go 1.24+ tool directive: pin the version in go.mod, run reproducibly
go get -tool golang.org/x/tools/gopls/internal/analysis/modernize/cmd/modernize
go tool modernize -fix ./...
```

Catches:
- `for i := 0; i < n; i++` → `for i := range n`
- `sort.Slice(s, func(i,j int) bool { ... })` → `slices.SortFunc(s, ...)`
- `interface{}` → `any`
- Explicit zero comparisons that `clear` covers

## Linter discipline

`golangci-lint` aggregates many linters. Pin the version in CI:

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - revive
    - gosimple
    - ineffassign
    - unused
    - misspell
    - prealloc
    - gocritic
    - gosec
```

Run: `golangci-lint run --fix ./...`.

## Dependency freshness

```bash
# Weekly:
go list -m -u all | grep -v indirect
go-mod-outdated -update -direct < <(go list -u -m -json all)

# Audit for CVEs:
govulncheck ./...
```

Treat updates with judgment:
- Patch updates (1.2.3 → 1.2.4): usually safe to auto-merge
- Minor (1.2 → 1.3): read release notes
- Major (v1 → v2): plan carefully; module path changes

## When to upgrade Go version

Upgrade in your repo when:
- A specific new feature unlocks code you'd otherwise hand-write
- A CVE in the standard library forces it
- The version you're on is 2 releases behind (out of support)

Pin the Go version in `go.mod` (`go 1.23`) and in CI Docker image. Don't pin to `latest` — reproducible builds matter.

## Anti-patterns

- **Stuck on Go 1.18** because "it works" — you miss `slices`, `maps`, range int, ServeMux
- **Auto-upgrading deps in CI** without governance — supply-chain risk
- **Using `pkg/errors`** in new code — standard `errors.Is` / `errors.As` / `fmt.Errorf("%w")` covers it
- **Custom string slice helpers** when `slices.Contains` / `slices.Sort` exist

## Quarterly check

Every 3 months ask:
1. Are we on a supported Go version?
2. Did anything new in the stdlib (slices, maps, math/rand/v2, ServeMux) replace a third-party we're using?
3. Did `govulncheck` flag anything?
4. Did `modernize` find rewrites worth applying?
5. Are any dep major versions ready for a planned upgrade?

## See also

- `modernize-guide.md` — concrete migrations
- `module-management.md` — go.mod / go.sum / workspaces
- `samber-libraries.md` — wrapper libs worth knowing
