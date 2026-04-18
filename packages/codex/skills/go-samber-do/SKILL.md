---
name: go-samber-do
description: samber/do DI container knowledge — Provide/Invoke, named providers, scoped injectors, shutdown order, testing overrides, migration from manual wiring. Activate when Go code imports `github.com/samber/do` or `github.com/samber/do/v2`, or when user asks about Go dependency injection.
user-invocable: false
---

# samber/do — Dependency Injection Container

Upstream: https://github.com/samber/do · v2: https://github.com/samber/do/tree/v2

## When to Reach for DI

Manual `NewX(deps...)` wiring scales to ~10 services. Past that, the wiring file becomes the second-largest file in the project. `samber/do` adds: lazy construction, reverse-order shutdown, and Override for testing.

If none of those apply, stay with manual wiring.

## Core API (v1)

```go
import "github.com/samber/do"

injector := do.New()

do.Provide(injector, func(i *do.Injector) (*pgxpool.Pool, error) {
    return pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
})

do.Provide(injector, func(i *do.Injector) (*UserRepository, error) {
    pool := do.MustInvoke[*pgxpool.Pool](i)
    return NewUserRepository(pool), nil
})

repo, err := do.Invoke[*UserRepository](injector) // (T, error)
svc := do.MustInvoke[*UserService](injector)      // panics; main/init only

defer injector.Shutdown()
```

Providers are indexed by concrete type. Two providers for the same type is an error.

## Named Providers

For multiple instances of the same type (primary vs replica pool):

```go
do.ProvideNamed(injector, "primary", func(i *do.Injector) (*pgxpool.Pool, error) { ... })
do.ProvideNamed(injector, "replica", func(i *do.Injector) (*pgxpool.Pool, error) { ... })

primary := do.MustInvokeNamed[*pgxpool.Pool](injector, "primary")
```

Use `do.ProvideNamedValue(injector, "name", value)` for pre-built values.

## Scoped Injectors (v2)

Child injectors inherit providers, can override them. Use for request-scoped services or multi-tenant:

```go
root := do.New()
do.Provide(root, newLogger)

reqScope := root.Scope("request-42")
do.ProvideValue(reqScope, &TraceID{ID: "abc123"})

trace := do.MustInvoke[*TraceID](reqScope)  // scope-local
log := do.MustInvoke[*Logger](reqScope)     // inherited
reqScope.Shutdown()                         // root untouched
```

Don't create a scope per request if there are no scope-local providers — pure overhead.

## Shutdown Contract

Services implement `Shutdown() error` or `Shutdown(context.Context) error`. `injector.Shutdown()` calls them in reverse construction order. For signal handling: `injector.ShutdownOnSignals(syscall.SIGINT, syscall.SIGTERM)`.

Construction order is the tiebreaker — if A built before B but A's shutdown needs B alive, provide B first.

## Testing with Overrides

```go
injector := do.New()
do.ProvideValue[*UserRepository](injector, &mockRepo{})
do.Provide(injector, NewUserService)
svc := do.MustInvoke[*UserService](injector)

// Mid-flight
do.OverrideValue[*UserRepository](injector, &mockRepo{})
do.OverrideNamedValue[*pgxpool.Pool](injector, "primary", fakePool)
```

Override replaces providers. Already-held pointers do NOT change — re-Invoke after Override.

## Health Checks

```go
type HealthChecker interface { HealthCheck() error }
// Anything implementing it is checked:
if err := injector.HealthCheck(); err != nil { /* /readyz 503 */ }
```

## Migration Example

Before (6 services, manual):

```go
pool, _ := pgxpool.New(ctx, dsn)
defer pool.Close()
redis, _ := newRedis(url)
defer redis.Close()
repo := NewUserRepository(pool)
cache := NewUserCache(redis)
svc := NewUserService(repo, cache)
handler := NewHandler(svc)
```

After:

```go
injector := do.New()
do.Provide(injector, newPool)
do.Provide(injector, newRedis)
do.Provide(injector, NewUserRepository)
do.Provide(injector, NewUserCache)
do.Provide(injector, NewUserService)
do.Provide(injector, NewHandler)
handler := do.MustInvoke[*Handler](injector)
defer injector.Shutdown()
```

Only worth it if (a) more services coming, (b) tests swap deps, (c) shutdown ordering is fragile.

## Common Pitfalls

| Pitfall | Why it bites | Fix |
|---------|--------------|-----|
| Circular deps | Deadlock on first Invoke | Break cycle; add event bus |
| `MustInvoke` in handler | Panics in prod on registration drift | Use `Invoke` + err; `MustInvoke` only in main/init |
| Missing provider | Runtime error, not compile | Write boot-time smoke test that Invokes every top-level service |
| Double `Shutdown` | Double-close panic | Guard with `sync.Once`; keep injector as sole owner |
| Injector passed into business logic | Service locator anti-pattern, not DI | Inject deps directly via constructor |
| Holding pointers past Override | Stale references | Re-Invoke after Override |
| DI for 3-service tools | Container is larger than wiring | Keep manual |

## Review Checklist

Flag:

- **CRITICAL** — `do.MustInvoke` inside request handler or hot path
- **CRITICAL** — `Shutdown()` missing from a service owning OS resources
- **WARNING** — Multiple same-type providers without `ProvideNamed`
- **WARNING** — Injector passed down into business logic
- **WARNING** — No boot-time Invoke smoke test
- **SUGGESTION** — 3-5 services using `do` where manual wiring is clearer
- **SUGGESTION** — Scopes created per-request with no scope-local providers

## Alternatives

`google/wire` — compile-time DI, zero runtime reflection, but codegen step in the build. Pick wire when you want no runtime cost; pick do when you want lifecycle + test ergonomics.
