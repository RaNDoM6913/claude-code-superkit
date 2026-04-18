# samber/lo — Generic Collection Utilities

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: https://github.com/samber/lo

## What It Is

500+ generic helpers for slices, maps, channels, strings, and tuples. Shaped like Lodash / Ramda, but generics-native (Go 1.18+). Not a replacement for the stdlib `slices` (Go 1.21+) and `maps` packages — it layers on top where stdlib is missing something or where readability wins.

## High-Frequency Functions

### Transform

```go
import "github.com/samber/lo"

// Map: T -> U
names := lo.Map(users, func(u User, _ int) string {
    return u.Name
})

// Filter: keep elements matching predicate
active := lo.Filter(users, func(u User, _ int) bool {
    return u.Status == StatusActive
})

// FilterMap: filter + map in one pass (no intermediate slice)
emails := lo.FilterMap(users, func(u User, _ int) (string, bool) {
    if u.Email == "" {
        return "", false
    }
    return strings.ToLower(u.Email), true
})

// FlatMap: T -> []U, then flatten
tagPairs := lo.FlatMap(posts, func(p Post, _ int) []string {
    return p.Tags
})

// ForEach: side-effect iteration (no return)
lo.ForEach(users, func(u User, _ int) {
    log.Printf("user: %s", u.Name)
})

// Reduce
total := lo.Reduce(prices, func(acc float64, p Price, _ int) float64 {
    return acc + p.Amount
}, 0.0)
```

### Dedup / Partition

```go
// Uniq — preserves order
ids := lo.Uniq([]int{1, 2, 2, 3, 1}) // [1 2 3]

// UniqBy — dedupe by key
users := lo.UniqBy(allUsers, func(u User) int64 { return u.ID })

// Chunk — split into fixed-size batches (last chunk may be shorter)
batches := lo.Chunk(items, 100) // [][]Item

// Partition — split by predicate into (matched, rest)
admins, others := lo.FilterReject(users, func(u User, _ int) bool {
    return u.Role == RoleAdmin
})
```

### Index / Group

```go
// GroupBy — map[K][]V
byStatus := lo.GroupBy(users, func(u User) Status { return u.Status })

// KeyBy — map[K]V (later wins on collision; use UniqBy first if that matters)
byID := lo.KeyBy(users, func(u User) int64 { return u.ID })

// Associate — map[K]V via (key, value) callback
nameToEmail := lo.Associate(users, func(u User) (string, string) {
    return u.Name, u.Email
})
```

### Control Flow

```go
// Ternary — expression-form conditional
status := lo.Ternary(isActive, "active", "inactive")

// If / ElseIf / Else — chainable conditional
label := lo.If(age < 13, "child").
    ElseIf(age < 20, "teen").
    ElseIf(age < 65, "adult").
    Else("senior")

// Coalesce — first non-zero value
name := lo.Coalesce(u.DisplayName, u.Username, "anonymous")

// CoalesceOrEmpty — same but returns zero value instead of bool
```

### Error Ergonomics

```go
// Must — panic on error. init/main only; never in request handlers.
cfg := lo.Must(loadConfig())

// Must0 — for funcs returning only error: `lo.Must0(db.Ping())`

// Try — run a fn, catch panic, return (value, error)
value, err := lo.Try(func() error {
    doSomethingThatMightPanic()
    return nil
})

// Attempt — retry up to N times or until fn returns nil error
iter, err := lo.Attempt(3, func(i int) error {
    return callFlakeyAPI()
})

// AttemptWithDelay / AttemptWhile for backoff + predicate-controlled loops

// TryWithErrorValue — recover panic payload as `any` (not just error)
value, errOrAny := lo.TryWithErrorValue(func() error { ... })
```

## When to Prefer Stdlib

Go 1.21 shipped `slices` and `maps` packages covering the common cases. Prefer stdlib when:

| Task | Stdlib | samber/lo |
|------|--------|-----------|
| Find index | `slices.Index(s, v)` | `lo.IndexOf(s, v)` |
| Contains | `slices.Contains(s, v)` | `lo.Contains(s, v)` |
| Reverse (in-place) | `slices.Reverse(s)` | `lo.Reverse(s)` (copies) |
| Sort | `slices.Sort(s)` / `SortFunc` | `lo.Sort` — don't use |
| Delete at index | `slices.Delete(s, i, j)` | not equivalent |
| Binary search | `slices.BinarySearch` | no equivalent |
| Get map keys | `maps.Keys(m)` (iter.Seq) | `lo.Keys(m)` (slice) |
| Get map values | `maps.Values(m)` (iter.Seq) | `lo.Values(m)` (slice) |

Rule of thumb: if stdlib has it, use stdlib. Use lo for transforms (`Map`/`Filter`/`Reduce`), grouping (`GroupBy`/`KeyBy`), and control flow helpers that stdlib doesn't have.

## Performance Caveats

`lo.Map` allocates a new slice sized to `len(input)` — fine. But chained calls allocate an intermediate slice at every step:

```go
// 3 allocations: filtered, mapped, uniqued
result := lo.Uniq(lo.Map(lo.Filter(xs, keep), transform))

// 1 allocation with FilterMap
result := lo.FilterMap(xs, func(x T, _ int) (U, bool) {
    if !keep(x, 0) { return *new(U), false }
    return transform(x, 0), true
})
```

`lo.Map` takes `func(T, int) U` — that closure can escape to the heap if it captures a variable. For hot paths, benchmark against a manual loop:

```go
names := make([]string, 0, len(users))
for _, u := range users {
    names = append(names, u.Name)
}
```

For 3-element slices, the loop is faster and clearer than `lo.Map`. For 10k+ elements, both perform comparably — readability wins.

`lo.Contains` is O(n) — if you do it in a loop, convert the slice to a map once: `seen := lo.Associate(xs, func(x T) (T, struct{}) { return x, struct{}{} })`.

## Parallel Variants (lo/parallel subpackage)

```go
import "github.com/samber/lo/parallel"

// Fan out Map across all workers (runtime.NumCPU by default)
results := parallel.Map(urls, func(url string, _ int) *Response {
    return fetch(url) // blocking I/O
})
```

Use when the callback is I/O-bound (HTTP, DB). For CPU-bound work, the overhead usually isn't worth it unless `len(input) > 1000`. `parallel.Map` does not preserve order of execution but preserves order of the output slice. It does NOT bound the goroutine count — for 100k elements, build your own worker pool.

## Anti-Patterns

### Using lo.Must in Request Handlers

```go
// WRONG — panics the whole server process
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
    user := lo.Must(h.repo.Find(r.Context(), id))
    // ...
}

// RIGHT
user, err := h.repo.Find(r.Context(), id)
if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
}
```

`lo.Must` is for `init()`, `main()`, and test helpers. Nowhere else.

### Using lo for Trivial Cases

```go
// WRONG — less clear than a 3-line loop
isUnique := lo.Uniq([]int{a, b, c})
if len(isUnique) == 3 { ... }

// RIGHT
if a != b && b != c && a != c { ... }
```

### lo.ForEach When You Don't Need It

```go
// Noise — for _, x := range is clearer
lo.ForEach(users, func(u User, _ int) {
    log.Printf("%s", u.Name)
})

// Prefer
for _, u := range users {
    log.Printf("%s", u.Name)
}
```

`ForEach` is useful in expression position (inside a builder) — not as a replacement for `for range`.

### Chaining With Shared Closure State

```go
// Risky — closure captures `total` which is shared across goroutines if parallel variant
var total int
lo.ForEach(xs, func(x int, _ int) { total += x })

// Prefer reduce for clarity and purity
total := lo.Reduce(xs, func(a, x, _ int) int { return a + x }, 0)
```

## Review Checklist

When reviewing code using samber/lo, flag:

- **CRITICAL** — `lo.Must` / `lo.Must0` in request handlers, middleware, or goroutines that don't own the process (will panic the server)
- **WARNING** — Chained `Filter` → `Map` → `Uniq` on large inputs (replace with `FilterMap` + `Uniq`, or a single loop)
- **WARNING** — `parallel.Map` over unbounded input (goroutine explosion — use a bounded worker pool)
- **WARNING** — `lo.Contains` in a loop (O(n*m); convert outer set to map once)
- **SUGGESTION** — Using lo where stdlib `slices` / `maps` covers it (slices.Contains, slices.Index, etc.)
- **SUGGESTION** — 3-line loop rewritten as lo chain for no readability gain

## Further Reading

- Upstream docs: https://github.com/samber/lo (README lists all 500+ helpers)
- stdlib `slices`: https://pkg.go.dev/slices
- stdlib `maps`: https://pkg.go.dev/maps
- Parallel subpackage: https://github.com/samber/lo/tree/master/parallel
