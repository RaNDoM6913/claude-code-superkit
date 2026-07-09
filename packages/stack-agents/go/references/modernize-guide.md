# Modernize Guide

> Reference document for go-modernizer. Loaded on demand via Read tool.

## Go Version Feature Matrix

### Go 1.18 — Generics

**Risk: LOW** — well-tested, widely adopted.

**Before:**
```go
func ContainsInt(s []int, v int) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}

func ContainsString(s []string, v string) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}
```

**After:**
```go
func Contains[T comparable](s []T, v T) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}
```

**Migration recipe:**
1. Identify duplicated functions that differ only by type
2. Replace with generic version using type constraints
3. Update all call sites (usually type inference handles it)
4. Run tests — generics can change escape analysis behavior

### Go 1.20 — errors.Join, Multi-Error Wrapping

**Risk: LOW** — drop-in replacement for custom multi-error types.

**Before:**
```go
type MultiError struct {
    Errors []error
}

func (m *MultiError) Error() string {
    msgs := make([]string, len(m.Errors))
    for i, e := range m.Errors {
        msgs[i] = e.Error()
    }
    return strings.Join(msgs, "; ")
}

func validate(u *User) error {
    var me MultiError
    if u.Name == "" {
        me.Errors = append(me.Errors, errors.New("name required"))
    }
    if u.Email == "" {
        me.Errors = append(me.Errors, errors.New("email required"))
    }
    if len(me.Errors) > 0 {
        return &me
    }
    return nil
}
```

**After:**
```go
func validate(u *User) error {
    var errs []error
    if u.Name == "" {
        errs = append(errs, errors.New("name required"))
    }
    if u.Email == "" {
        errs = append(errs, errors.New("email required"))
    }
    return errors.Join(errs...) // nil if empty
}
```

**Migration recipe:**
1. Find custom multi-error types
2. Replace with `errors.Join`
3. Verify callers using `errors.Is`/`errors.As` still work (they do — Join supports both)

### Go 1.21 — slog, slices, maps, min/max, WithoutCancel

**Risk: LOW-MEDIUM** — slog is a larger migration, slices/maps are straightforward.

#### slog (structured logging)

**Before:**
```go
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
logger.Info("user created",
    zap.Int64("user_id", user.ID),
    zap.String("email", user.Email),
)
```

**After:**
```go
import "log/slog"

slog.Info("user created",
    "user_id", user.ID,
    "email", user.Email,
)
```

**Migration recipe:**
1. Replace `zap.NewProduction()` with `slog.New(slog.NewJSONHandler(os.Stdout, opts))`
2. Replace typed fields (`zap.String`, `zap.Int64`) with key-value pairs
3. Replace `logger.With(...)` with `slog.With(...)`
4. Custom handlers can wrap slog.Handler for sampling, routing

#### slices and maps packages

**Before:**
```go
sort.Slice(users, func(i, j int) bool {
    return users[i].Name < users[j].Name
})

found := false
for _, u := range users {
    if u.ID == targetID {
        found = true
        break
    }
}
```

**After:**
```go
slices.SortFunc(users, func(a, b User) int {
    return cmp.Compare(a.Name, b.Name)
})

found := slices.ContainsFunc(users, func(u User) bool {
    return u.ID == targetID
})
```

#### min/max builtins

**Before:**
```go
func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}
```

**After:**
```go
result := min(a, b) // builtin, works with any ordered type
result := max(a, b, c) // variadic!
```

**Migration recipe:**
1. Delete custom `min`/`max` helper functions
2. Replace `sort.Slice` with `slices.SortFunc`
3. Replace manual search loops with `slices.Contains`/`slices.ContainsFunc`

#### context.WithoutCancel

**Before:**
```go
// Hacky: create new context with just values
asyncCtx := context.Background()
asyncCtx = context.WithValue(asyncCtx, requestIDKey, RequestIDFromContext(ctx))
asyncCtx = context.WithValue(asyncCtx, userIDKey, UserIDFromContext(ctx))
```

**After:**
```go
asyncCtx := context.WithoutCancel(ctx) // keeps all values, ignores parent cancel
```

### Go 1.22 — Range-Over-Int, Loop Variable Fix, Enhanced ServeMux

**Risk: LOW** — most are drop-in improvements.

#### Range over integers

**Before:**
```go
for i := 0; i < n; i++ {
    process(i)
}
```

**After:**
```go
for i := range n {
    process(i)
}
```

#### Loop variable fix

**Before (Go < 1.22 — bug):**
```go
for _, item := range items {
    go func() {
        process(item) // BUG: all goroutines see last item
    }()
}

// Workaround:
for _, item := range items {
    item := item // capture
    go func() {
        process(item)
    }()
}
```

**After (Go 1.22+):**
```go
for _, item := range items {
    go func() {
        process(item) // FIXED: each iteration has its own variable
    }()
}
```

**Migration recipe:**
1. Remove `item := item` shadow copies in range loops
2. This is automatic with Go 1.22+ toolchain

#### Enhanced ServeMux

**Before:**
```go
mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case "GET":
        listUsers(w, r)
    case "POST":
        createUser(w, r)
    default:
        http.Error(w, "method not allowed", 405)
    }
})
```

**After:**
```go
mux.HandleFunc("GET /api/users", listUsers)
mux.HandleFunc("POST /api/users", createUser)
mux.HandleFunc("GET /api/users/{id}", getUser) // path parameters!
mux.HandleFunc("DELETE /api/users/{id}", deleteUser)

// Access path parameter:
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
}
```

#### math/rand/v2

**Before:**
```go
import "math/rand"

rand.Seed(time.Now().UnixNano()) // required before Go 1.20
n := rand.Intn(100)
```

**After:**
```go
import "math/rand/v2"

n := rand.IntN(100) // auto-seeded, better API
```

### Go 1.23 — Iterator Functions, unique Package

**Risk: MEDIUM** — iterators are a new paradigm.

**Before:**
```go
func (db *DB) Users() ([]*User, error) {
    // loads ALL users into memory
}
```

**After:**
```go
func (db *DB) Users() iter.Seq2[*User, error] {
    return func(yield func(*User, error) bool) {
        rows, err := db.Query(ctx, "SELECT ...")
        if err != nil {
            yield(nil, err)
            return
        }
        defer rows.Close()
        for rows.Next() {
            var u User
            if err := rows.Scan(&u.ID, &u.Name); err != nil {
                if !yield(nil, err) {
                    return
                }
                continue
            }
            if !yield(&u, nil) {
                return
            }
        }
    }
}

// Usage
for user, err := range db.Users() {
    if err != nil {
        return err
    }
    process(user)
}
```

### Go 1.24 — testing/synctest, omitzero, Weak Pointers, runtime.AddCleanup

**Risk: LOW-MEDIUM** — synctest is test-only, omitzero is targeted.

Use synctest.Test in Go 1.25+; synctest.Run was the Go 1.24 experimental API (behind GOEXPERIMENT=synctest).

#### testing/synctest

```go
// See testing-patterns.md for full example
synctest.Test(t, func(t *testing.T) {
    // Deterministic goroutine scheduling
    // time.Sleep is virtual (instant)
    // synctest.Wait() blocks until all goroutines are blocked
})
```

#### omitzero JSON tag

**Before:**
```go
type Event struct {
    Name      string    `json:"name"`
    Timestamp time.Time `json:"timestamp,omitempty"` // omitempty doesn't work for time.Time!
}
// {"name":"test","timestamp":"0001-01-01T00:00:00Z"} — zero time still serialized
```

**After:**
```go
type Event struct {
    Name      string    `json:"name"`
    Timestamp time.Time `json:"timestamp,omitzero"` // omits if IsZero() returns true
}
// {"name":"test"} — zero time omitted
```

#### Weak Pointers

```go
import "weak"

type Cache[K comparable, V any] struct {
    mu    sync.Mutex
    items map[K]weak.Pointer[V]
}

// Allows GC to collect values when no strong references exist
```

#### runtime.AddCleanup

Replaces `runtime.SetFinalizer` for releasing non-GC resources. Unlike finalizers, cleanups attach to any pointer, run concurrently, and don't resurrect the object.

```go
import "runtime"

func NewFile(fd int) *File {
    f := &File{fd: fd}
    // Release the OS descriptor once f is unreachable.
    runtime.AddCleanup(f, func(fd int) { syscall.Close(fd) }, fd)
    return f
}
```

Rules: `arg` must not equal `ptr` (`AddCleanup` panics), and neither `cleanup` nor `arg` may reference `ptr` (that keeps it alive forever, so the cleanup never runs). Prefer explicit `Close()`/`defer` — cleanups are a safety net, not a guarantee, and may not run before program exit.

### Go 1.25 — sync.WaitGroup.Go, reflect.TypeAssert, synctest stable

**Risk: LOW** — additive APIs; no behavior change to existing code.

#### sync.WaitGroup.Go

Collapses the `Add(1)` / `go` / `defer Done()` triad into one call.

**Before:**
```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func() {
        defer wg.Done()
        process(item)
    }()
}
wg.Wait()
```

**After:**
```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Go(func() { process(item) }) // Add + goroutine + Done in one call
}
wg.Wait()
```

`f` must not panic, and `wg.Go` propagates no error or cancellation — reach for `errgroup.WithContext` when you need either. See `sync-primitives.md`.

#### reflect.TypeAssert

```go
// Go 1.25: assert a concrete type straight off a reflect.Value
v, ok := reflect.TypeAssert[*User](rv) // was: rv.Interface().(*User)
```

Avoids the `interface{}` boxing of `Value.Interface()` on hot reflection paths.

#### Container-aware GOMAXPROCS

Go 1.25 defaults `GOMAXPROCS` to the cgroup CPU limit when running in a container — drop `go.uber.org/automaxprocs`, it's now redundant.

#### testing/synctest.Test now stable

`synctest.Test` graduated from the 1.24 experiment (`GOEXPERIMENT=synctest`, `synctest.Run`) — no build flag needed. See `testing-patterns.md`.

### Go 1.26 — errors.AsType, slog.NewMultiHandler, ReverseProxy.Rewrite

**Risk: LOW** — additive APIs plus one deprecation to migrate off.

#### errors.AsType

Generic typed extraction — drops the pointer-to-target dance of `errors.As`.

```go
// Before (Go <1.26)
var verr *ValidationError
if errors.As(err, &verr) { use(verr) }

// After (Go 1.26+)
if verr, ok := errors.AsType[*ValidationError](err); ok { use(verr) }
```

Signature: `func AsType[E error](err error) (E, bool)`. Keep `errors.As` while you still build against Go <1.26. See `error-inspection.md`.

#### slog.NewMultiHandler

```go
// Stdlib fan-out — one record to several handlers
logger := slog.New(slog.NewMultiHandler(jsonHandler, sentryHandler))
```

Covers simple fan-out without `samber/slog-multi`; keep slog-multi for middleware/routing depth.

#### httputil.ReverseProxy.Rewrite

`ReverseProxy.Director` is deprecated in favor of `.Rewrite`, which receives a `*httputil.ProxyRequest` (both inbound `In` and outbound `Out`).

```go
// Before: proxy.Director = func(req *http.Request) { ... }
proxy.Rewrite = func(r *httputil.ProxyRequest) {
    r.SetURL(backend)   // route the outbound request to backend (*url.URL)
    r.SetXForwarded()   // set X-Forwarded-For / -Host / -Proto
}
```

#### Green Tea GC now the default

The Green Tea garbage collector (experimental in 1.25 behind `GOEXPERIMENT=greenteagc`) is on by default — no code change; expect lower GC overhead on allocation-heavy workloads.

## Version Migration Decision Table

| Current Version | Target | Priority Items | Risk |
|-----------------|--------|---------------|------|
| 1.17 or below | 1.18+ | Generics for utility code | LOW |
| 1.18-1.19 | 1.21+ | slog, slices, maps, min/max | LOW-MED |
| 1.20 | 1.21+ | errors.Join already available, add slog/slices | LOW |
| 1.21 | 1.22+ | Enhanced ServeMux, range-over-int | LOW |
| 1.22 | 1.23+ | Iterators (if needed), unique package | MEDIUM |
| 1.23 | 1.24+ | synctest for tests, omitzero, weak pointers | LOW |
| 1.24 | 1.25+ | wg.Go, reflect.TypeAssert, synctest.Test stable, drop automaxprocs | LOW |
| 1.25 | 1.26+ | errors.AsType, slog.NewMultiHandler, ReverseProxy.Rewrite (Director deprecated) | LOW |

## When to Use

Apply when reviewing Go projects for modernization opportunities. Flag findings as:
- **CRITICAL**: Using deprecated APIs (math/rand.Seed, custom min/max with Go 1.21+)
- **WARNING**: Manual ServeMux routing with Go 1.22+, loop variable capture workarounds with Go 1.22+
- **SUGGESTION**: Could use slices package, slog instead of third-party logger, range-over-int
