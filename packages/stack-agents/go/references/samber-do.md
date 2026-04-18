# samber/do — Dependency Injection Container

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: https://github.com/samber/do (v2: https://github.com/samber/do/tree/v2)

## When to Reach for DI

Hand-wired `NewX(deps...)` constructors scale cleanly to roughly 10 services. Past that, the wiring function becomes the second-largest file in the project and every test that needs a single dependency has to rebuild the whole graph. `samber/do` solves three specific problems:

1. **Lazy construction** — providers run the first time something invokes them, not at boot.
2. **Shutdown ordering** — services are shut down in reverse construction order automatically.
3. **Override for testing** — swap a concrete dependency with a mock without rewriting callers.

If none of those apply, stay with manual wiring. DI containers are infrastructure you have to learn to debug.

## Core API (v1)

```go
import "github.com/samber/do"

injector := do.New()

// Provide a service — factory runs on first Invoke
do.Provide(injector, func(i *do.Injector) (*pgxpool.Pool, error) {
    return pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
})

do.Provide(injector, func(i *do.Injector) (*UserRepository, error) {
    pool := do.MustInvoke[*pgxpool.Pool](i)
    return NewUserRepository(pool), nil
})

// Resolve — returns (T, error)
repo, err := do.Invoke[*UserRepository](injector)

// Resolve-or-panic — only in main/init
svc := do.MustInvoke[*UserService](injector)

// Graceful shutdown (reverse order)
if err := injector.Shutdown(); err != nil {
    log.Printf("shutdown error: %v", err)
}
```

Providers are indexed by the concrete Go type returned (`*UserRepository`). Two providers for the same type in one injector is an error.

## Named Providers

When you need two instances of the same type (read replica vs primary pool, two Kafka consumers), use named providers:

```go
do.ProvideNamed(injector, "primary", func(i *do.Injector) (*pgxpool.Pool, error) {
    return pgxpool.New(ctx, primaryDSN)
})
do.ProvideNamed(injector, "replica", func(i *do.Injector) (*pgxpool.Pool, error) {
    return pgxpool.New(ctx, replicaDSN)
})

primary := do.MustInvokeNamed[*pgxpool.Pool](injector, "primary")
replica := do.MustInvokeNamed[*pgxpool.Pool](injector, "replica")
```

Prefer `do.ProvideNamedValue(injector, "name", value)` for pre-constructed values (config, already-open connections from tests).

## Scoped Injectors (v2)

`do/v2` adds scopes — child injectors that inherit providers but can override them. Use for request-scoped services (per-request logger with trace ID) or multi-tenant apps where each tenant gets its own cache.

```go
root := do.New()
do.Provide(root, newLogger)

// Per-request scope
reqScope := root.Scope("request-42")
do.ProvideValue(reqScope, &TraceID{ID: "abc123"})

logger := do.MustInvoke[*Logger](reqScope)     // inherited from root
trace  := do.MustInvoke[*TraceID](reqScope)    // scope-local

reqScope.Shutdown() // tears down scope only, root untouched
```

Do not create a scope per HTTP request if you never register scope-local providers — you pay allocation overhead for nothing.

## Shutdown Contract

Services implement `Shutdown() error` or `Shutdown(context.Context) error`. `injector.Shutdown()` calls them in reverse construction order (last built, first torn down).

```go
type UserService struct{ repo *UserRepository }

func (s *UserService) Shutdown() error {
    // Release in-flight work, flush caches, etc.
    return nil
}
```

For tight timeouts, use `ShutdownOnSignals(syscall.SIGINT, syscall.SIGTERM)` which wires an `os/signal.Notify` and blocks until a signal arrives.

If service A was built before B but A depends on B, manual `NewX()` has the same ordering problem — the container doesn't fix dependency ordering, it just matches construction order. Don't provide `A` before `B` if `A.Shutdown` needs `B` alive.

## Testing with Overrides

```go
func TestUserService_Create(t *testing.T) {
    injector := do.New()
    do.ProvideValue[*UserRepository](injector, &mockRepo{})
    do.Provide(injector, NewUserService)

    svc := do.MustInvoke[*UserService](injector)
    // ...
}

// Mid-flight override (integration tests)
do.OverrideValue[*UserRepository](injector, &mockRepo{})
do.OverrideNamedValue[*pgxpool.Pool](injector, "primary", fakePool)
```

`Override` replaces an existing provider; `OverrideValue` replaces with a pre-built value. Both are safe to call after `Invoke` — the next Invoke returns the new instance, but already-held pointers do NOT change.

## Health Checks

```go
type HealthChecker interface {
    HealthCheck() error
}

// Run health checks on every service that implements the interface
if err := injector.HealthCheck(); err != nil {
    http.Error(w, err.Error(), http.StatusServiceUnavailable)
}
```

Wire this to `/readyz` — it returns the first failing check with the service name.

## Migration from Manual DI

**Before** (6 services, 30-line main):

```go
pool, err := pgxpool.New(ctx, dsn)
if err != nil { return err }
defer pool.Close()

redis, err := newRedis(redisURL)
if err != nil { return err }
defer redis.Close()

userRepo  := NewUserRepository(pool)
userCache := NewUserCache(redis)
userSvc   := NewUserService(userRepo, userCache)
authSvc   := NewAuthService(userRepo)
handler   := NewHandler(userSvc, authSvc)
```

**After**:

```go
injector := do.New()
do.Provide(injector, newPool)
do.Provide(injector, newRedis)
do.Provide(injector, NewUserRepository)
do.Provide(injector, NewUserCache)
do.Provide(injector, NewUserService)
do.Provide(injector, NewAuthService)
do.Provide(injector, NewHandler)

handler := do.MustInvoke[*Handler](injector)
defer injector.Shutdown()
```

The refactor is only worth it if (a) more services are coming, (b) tests need to swap a dep, or (c) shutdown ordering is getting fragile.

## Common Pitfalls

| Pitfall | Why it bites | Fix |
|---------|--------------|-----|
| Circular dependencies | `Provide` runs factories lazily but a cycle still deadlocks on first Invoke | Break the cycle — introduce an event bus or split the interface |
| `MustInvoke` in a request handler | Panics in prod when a provider silently disappeared | Use `Invoke` + error return; only `MustInvoke` in `main`/`init` |
| Forgetting to register a provider | Error surfaces at Invoke time (runtime), not compile time | Write a boot-time smoke test that Invokes every top-level service |
| Calling `Shutdown` twice | Double-close on pools panics | Guard with `sync.Once` or trust the injector to be the sole owner |
| Holding pointers past `Override` | Stale references survive the override | Re-Invoke after Override in tests |
| Using DI for 3-service CLI tools | The container is more code than the wiring it replaces | Keep manual wiring |

## Review Checklist

When reviewing code using samber/do, flag:

- **CRITICAL** — `do.MustInvoke` inside a request handler or hot path (will panic the process on any registration drift)
- **CRITICAL** — `Shutdown()` missing from a service that owns OS resources (DB pool, file, network listener)
- **WARNING** — Multiple same-type providers without `ProvideNamed` (non-deterministic resolution)
- **WARNING** — Injector passed down into business logic (service receives `*do.Injector` as a field — that's a service locator anti-pattern, not DI)
- **WARNING** — No boot-time `Invoke` smoke test for each top-level service
- **SUGGESTION** — 3-5 services using `do` when manual wiring is clearer
- **SUGGESTION** — Scopes created per-request with no scope-local providers (pure overhead)

## Further Reading

- Upstream docs: https://github.com/samber/do
- v2 scopes + health checks: https://github.com/samber/do/tree/v2
- Comparison with `google/wire` (compile-time DI): https://github.com/google/wire — pick wire when you want zero runtime reflection; pick do when you want lifecycle and testing ergonomics.
