# Dependency Injection Frameworks (uber-fx, uber-dig, google-wire)

Standalone DI frameworks for Go applications. Different from `samber/do` (which is in `samber-do.md`).

## When to use a DI framework

- Application has 10+ services with shared dependencies (db, logger, config, cache)
- Manual `main.go` wiring becomes hard to read (200+ lines of construction)
- Multiple environments (prod, test, dev) need different concrete implementations
- Lifecycle management (start / stop / health-check) needs to be orderly

## When NOT to use a DI framework

- Small CLI or single-service app — manual wiring is clearer
- Hot-path code where reflection-based DI adds startup latency
- Team is unfamiliar with the pattern — added complexity outweighs benefit

## uber-fx — Highest-level, most opinionated

Use when: you want a full application lifecycle framework (start, stop, signal handling, structured logs).

```go
import "go.uber.org/fx"

type Server struct {
    db  *sql.DB
    cfg *Config
}

func NewServer(lc fx.Lifecycle, db *sql.DB, cfg *Config) *Server {
    s := &Server{db: db, cfg: cfg}
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error { return s.Start(ctx) },
        OnStop:  func(ctx context.Context) error { return s.Stop(ctx) },
    })
    return s
}

func main() {
    fx.New(
        fx.Provide(
            NewConfig,
            NewDB,
            NewServer,
        ),
        fx.Invoke(func(*Server) {}),
    ).Run()
}
```

**Pros:** Lifecycle hooks, parameter/result objects, fx.Module for grouping, built-in signal handling.
**Cons:** Reflection-based — startup is slower. Errors at startup, not at compile time.

## uber-dig — Just the DI container

Use when: you want fx's container without the lifecycle/run machinery.

```go
container := dig.New()
container.Provide(NewConfig)
container.Provide(NewDB)
container.Provide(NewServer)

err := container.Invoke(func(s *Server) {
    s.Listen()
})
```

**Pros:** Smaller than fx, same reflection model.
**Cons:** No lifecycle hooks — you manage start/stop yourself.

## google-wire — Compile-time DI via codegen

Use when: you want zero runtime cost and compile-time guarantees.

```go
//go:build wireinject

package main

import "github.com/google/wire"

func InitializeServer() (*Server, error) {
    wire.Build(NewConfig, NewDB, NewServer)
    return nil, nil
}
```

Then run `wire ./...` to generate `wire_gen.go` containing the actual constructor calls.

**Pros:** Zero reflection, zero runtime cost, errors are compile-time. Generated code is readable.
**Cons:** Extra build step (`wire gen`). Errors require understanding the codegen output.

## Comparison

| Aspect | uber-fx | uber-dig | google-wire | samber/do |
|--------|---------|----------|-------------|-----------|
| Resolution | Runtime (reflection) | Runtime (reflection) | Compile-time (codegen) | Runtime (generics) |
| Startup cost | Medium | Low | Zero | Low |
| Lifecycle hooks | Yes | No | No | Yes (via shutdown) |
| Type safety | Runtime | Runtime | Compile | Compile (generics) |
| Codegen | No | No | Yes | No |
| Learning curve | Medium | Low | High initially | Low |

## Anti-patterns

- **Service locator hidden in DI**: passing the container itself into services. Defeats the point — services should only see their dependencies.
- **DI for everything**: simple cases (a `*sql.DB` and a config) don't need a framework.
- **No teardown**: starting things without stopping them. Leaks connections, goroutines, files.
- **Mixing two frameworks**: pick one. Mixing fx with wire (or with samber/do) creates two parallel object graphs.

## Choosing one

| Situation | Pick |
|-----------|------|
| Full microservice with HTTP + workers + signal handling | **uber-fx** |
| Library that needs an injection container, not an app framework | **uber-dig** |
| Compile-time guarantees mandated, codegen acceptable | **google-wire** |
| Lightweight, generics-first, no codegen | **samber/do** (see samber-do.md) |
| Small CLI / single-process tool | Manual wiring (no framework) |

## See also

- `samber-do.md` — generics-based alternative
- `samber-libraries.md` — overview of samber's Go libs
