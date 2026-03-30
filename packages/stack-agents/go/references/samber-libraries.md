# samber Libraries

> Reference document for go-reviewer, go-error-reviewer. Loaded on demand via Read tool.

## Overview

The samber ecosystem provides high-quality, generics-based Go libraries. Each has specific adoption criteria — do not add as a dependency without a clear justification.

## lo — Generic Collection Utilities

**Import:** `github.com/samber/lo`

500+ generic functions for slices, maps, channels, strings, and more.

### Key API

```go
import "github.com/samber/lo"

// Filter
activeUsers := lo.Filter(users, func(u User, _ int) bool {
    return u.Status == StatusActive
})

// Map (transform)
names := lo.Map(users, func(u User, _ int) string {
    return u.Name
})

// Uniq
unique := lo.Uniq(ids)

// GroupBy
byStatus := lo.GroupBy(users, func(u User) Status {
    return u.Status
})

// Chunk — split slice into batches
batches := lo.Chunk(items, 100) // [][]Item, 100 per batch

// KeyBy — slice to map
userMap := lo.KeyBy(users, func(u User) int64 {
    return u.ID
}) // map[int64]User

// Reduce
total := lo.Reduce(prices, func(acc float64, p Price, _ int) float64 {
    return acc + p.Amount
}, 0)

// Contains
if lo.Contains(roles, RoleAdmin) { ... }

// Intersect / Difference
common := lo.Intersect(listA, listB)
diff := lo.Difference(listA, listB)

// Flatten
flat := lo.Flatten([][]int{{1, 2}, {3, 4}}) // [1, 2, 3, 4]

// Compact — remove zero values
nonEmpty := lo.Compact([]string{"a", "", "b", ""}) // ["a", "b"]

// Ternary
status := lo.Ternary(isActive, "active", "inactive")

// Must — panic on error (only in init/main)
cfg := lo.Must(loadConfig())

// Async — parallel map
results := lo.Map(urls, func(url string, _ int) *Response {
    return lo.Must(fetch(url))
})
```

### When to Use lo

| Situation | Use lo? | Why |
|-----------|---------|-----|
| > 3 collection operations in one function | Yes | Readability, less boilerplate |
| Simple single filter/map | Maybe | stdlib + loop is fine for simple cases |
| Performance-critical hot path | Measure first | lo is generally efficient, but measure |
| Team unfamiliar with lo | Add gradually | Don't refactor everything at once |

### When NOT to Use lo

- Don't use `lo.Must` in library code or request handlers — only `main`/`init`
- Don't use lo for trivial operations where a 3-line loop is clearer
- Don't use lo to avoid learning Go idioms — understand the underlying patterns first

## oops — Structured Errors with Stack Traces

**Import:** `github.com/samber/oops`

Rich error context for APM integration: stack traces, domain codes, tags, user context.

### Key API

```go
import "github.com/samber/oops"

// Create errors with context
err := oops.
    Code("USER_NOT_FOUND").
    In("UserService").
    Tags("auth", "critical").
    With("user_id", userID).
    Errorf("user %d not found", userID)

// Wrap existing errors
err := oops.
    In("OrderService.Create").
    With("order_id", orderID).
    Wrap(repoErr)

// Extract context for logging/APM
if oopsErr, ok := oops.AsOops(err); ok {
    slog.Error("operation failed",
        "code", oopsErr.Code(),
        "domain", oopsErr.Domain(),
        "tags", oopsErr.Tags(),
        "context", oopsErr.Context(),
        "stacktrace", oopsErr.Stacktrace(),
    )
}

// slog integration
logger.Error("failed",
    slog.Any("error", oops.ToMap(err)), // structured error as map
)
```

### When to Use oops

| Situation | Use oops? | Why |
|-----------|-----------|-----|
| Errors need domain/tags for APM | Yes | Structured context for observability |
| Error dashboard needs error codes | Yes | `Code()` maps to alerting rules |
| Need stack traces for debugging | Yes | Automatic stack capture |
| Simple internal errors | No | Standard `errors.New` / `fmt.Errorf` is fine |
| Library code (public API) | No | Don't force dependency on consumers |

## do — Dependency Injection Container

**Import:** `github.com/samber/do`

Lightweight DI container with lazy initialization and lifecycle management.

### Key API

```go
import "github.com/samber/do"

// Define injector
injector := do.New()

// Provide services
do.Provide(injector, func(i *do.Injector) (*pgxpool.Pool, error) {
    return pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
})

do.Provide(injector, func(i *do.Injector) (*UserRepository, error) {
    pool := do.MustInvoke[*pgxpool.Pool](i)
    return NewUserRepository(pool), nil
})

do.Provide(injector, func(i *do.Injector) (*UserService, error) {
    repo := do.MustInvoke[*UserRepository](i)
    return NewUserService(repo), nil
})

// Invoke (lazy — created on first use)
svc := do.MustInvoke[*UserService](injector)

// Shutdown (calls Close/Shutdown on all services in reverse order)
injector.Shutdown()
```

### When to Use do

| Condition | Use do? | Alternative |
|-----------|---------|-------------|
| > 10 services with complex wiring | Yes | Manual wiring is error-prone |
| 3-5 services | No | Manual `NewX()` constructors |
| Need lifecycle management (graceful shutdown) | Yes | do handles ordering |
| Library code | No | Don't force DI framework |

## slog Handlers

**Import:** Various `github.com/samber/slog-*`

20+ handlers for slog that provide sampling, multi-output, and third-party integrations.

### Key Handlers

| Handler | Import | Use |
|---------|--------|-----|
| slog-multi | `slog-multi` | Fan-out to multiple handlers |
| slog-sampling | `slog-sampling` | Rate-limit log volume |
| slog-sentry | `slog-sentry` | Send errors to Sentry |
| slog-datadog | `slog-datadog` | Datadog log format |
| slog-loki | `slog-loki` | Grafana Loki sink |
| slog-slack | `slog-slack` | Alert critical errors to Slack |

```go
import (
    slogmulti "github.com/samber/slog-multi"
    slogsampling "github.com/samber/slog-sampling"
)

// Production pipeline: sample DEBUG, send WARN+ to Sentry
handler := slogmulti.Pipe(
    slogsampling.NewMiddleware(
        &slogsampling.UniformSamplingOption{Rate: 0.1}, // 10% of DEBUG/INFO
    ),
).Handler(
    slogmulti.Fanout(
        slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}),
        slogsentry.Option{Level: slog.LevelWarn}.NewSentryHandler(),
    ),
)

logger := slog.New(handler)
```

## hot — In-Memory Cache

**Import:** `github.com/samber/hot`

9 eviction algorithms in one library: LRU, LFU, ARC, TwoQueue, FIFO, LIFO, Random, Clock, SLRU.

### Key API

```go
import "github.com/samber/hot"

// Create cache with LRU eviction
cache := hot.NewHotCache[string, *User](hot.LRU, 10000). // max 10k entries
    WithTTL(5 * time.Minute).
    Build()

// Set
cache.Set("user:42", user)
cache.SetWithTTL("user:42", user, 10*time.Minute) // custom TTL

// Get
if user, ok := cache.Get("user:42"); ok {
    return user, nil
}

// Delete
cache.Delete("user:42")

// GetOrSet — atomic
user, err := cache.GetOrSet("user:42", func() (*User, error) {
    return repo.FindByID(ctx, 42)
})
```

### Algorithm Selection

| Algorithm | Best For | Overhead |
|-----------|----------|----------|
| LRU | General purpose, recency matters | O(1) |
| LFU | Frequency matters, popular items | O(log n) |
| ARC | Adapts to access patterns | O(1) |
| TwoQueue | Mix of recency and frequency | O(1) |
| FIFO | Simple, predictable | O(1) |

### When to Use hot

| Condition | Use hot? | Alternative |
|-----------|----------|-------------|
| Need eviction (LRU/LFU/ARC) | Yes | Manual map has no eviction |
| Need TTL | Yes | Manual expiry is error-prone |
| Simple key-exists check | No | `sync.Map` or `map` + `Mutex` |
| Distributed cache needed | No | Use Redis |

## mo — Monads (Option/Result)

**Import:** `github.com/samber/mo`

Functional types: Option (nullable), Result (value-or-error), Either, Future.

### Key API

```go
import "github.com/samber/mo"

// Option — explicit nullable
type UserProfile struct {
    Name     string
    Bio      mo.Option[string]    // explicitly optional
    Website  mo.Option[string]
}

bio := mo.Some("Hello world")
bio := mo.None[string]()

if val, ok := bio.Get(); ok {
    fmt.Println(val)
}

bio.OrElse("No bio") // default value

// Result — value or error
func divide(a, b float64) mo.Result[float64] {
    if b == 0 {
        return mo.Err[float64](errors.New("division by zero"))
    }
    return mo.Ok(a / b)
}

result := divide(10, 3)
value := result.MustGet()      // panics on error
value := result.OrElse(0)      // default on error
value, err := result.Get()     // standard Go pattern
```

### When to Use mo

| Condition | Use mo? | Alternative |
|-----------|---------|-------------|
| API fields that are explicitly nullable | Yes (Option) | `*string` works too |
| Functional pipeline transformations | Yes (Result) | Standard error handling |
| Team uses functional patterns | Yes | |
| Standard Go codebase, no FP | No | Stick to `*T` and `(T, error)` |

## ro — Reactive Extensions

**Import:** `github.com/samber/ro`

ReactiveX-style observable streams for Go.

### When to Use ro

| Condition | Use ro? | Alternative |
|-----------|---------|-------------|
| Event stream processing | Yes | Channels + goroutines |
| Complex event composition (merge, filter, debounce) | Yes | Manual implementation |
| Simple pub/sub | No | Channels are simpler |
| Team unfamiliar with Rx | No | Learning curve is steep |

## Adoption Decision Table

| Library | Add When | Don't Add When |
|---------|----------|---------------|
| lo | 3+ collection operations, repeated boilerplate | Simple loops suffice, performance-critical without measuring |
| oops | APM integration needed, error dashboard | Simple CLI tool, library code |
| do | > 10 services, need lifecycle management | Small project, < 5 services |
| slog-* | Need sampling/multi-output/APM integration | Single stdout logging is enough |
| hot | Need in-memory cache with eviction/TTL | Simple map lookup, distributed cache |
| mo | Functional patterns, explicit nullability | Standard Go idioms preferred by team |
| ro | Complex event stream composition | Simple channel patterns suffice |

## When to Use

Reference this document when reviewing code that uses samber libraries or when considering adding them as dependencies. Flag findings as:
- **CRITICAL**: `lo.Must` in request handlers (will panic on error), adding samber dependency without justification
- **WARNING**: Using oops in library public API (forces dependency), using mo when team prefers standard patterns
- **SUGGESTION**: Could use lo for repeated collection operations, hot for cache that currently has no eviction, oops for better error observability
