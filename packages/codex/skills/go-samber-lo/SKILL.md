---
name: go-samber-lo
description: samber/lo generic collection helpers knowledge — Map/Filter/Reduce/FilterMap/GroupBy/KeyBy/Chunk/Uniq/Must/Try, stdlib slices overlap, parallel.Map, performance caveats. Activate when Go code imports `github.com/samber/lo`, or when user asks about Go collection utilities, functional helpers, or Map/Filter/Reduce patterns.
user-invocable: false
---

# samber/lo — Generic Collection Utilities

Upstream: https://github.com/samber/lo

## What It Is

500+ generic helpers for slices, maps, channels, strings, tuples. Not a stdlib replacement — layers on `slices` and `maps` (Go 1.21+) where they're missing something.

## High-Frequency Functions

### Transform

```go
import "github.com/samber/lo"

names := lo.Map(users, func(u User, _ int) string { return u.Name })

active := lo.Filter(users, func(u User, _ int) bool { return u.Status == StatusActive })

// Filter + map in one pass — no intermediate slice
emails := lo.FilterMap(users, func(u User, _ int) (string, bool) {
    if u.Email == "" { return "", false }
    return strings.ToLower(u.Email), true
})

// FlatMap: T -> []U, flatten
tags := lo.FlatMap(posts, func(p Post, _ int) []string { return p.Tags })

lo.ForEach(users, func(u User, _ int) { log.Printf("user: %s", u.Name) })

total := lo.Reduce(prices, func(acc float64, p Price, _ int) float64 {
    return acc + p.Amount
}, 0.0)
```

### Dedup / Partition

```go
ids := lo.Uniq([]int{1, 2, 2, 3, 1})            // [1 2 3]
users := lo.UniqBy(all, func(u User) int64 { return u.ID })
batches := lo.Chunk(items, 100)                 // [][]Item
admins, others := lo.FilterReject(users, func(u User, _ int) bool {
    return u.Role == RoleAdmin
})
```

### Index / Group

```go
byStatus := lo.GroupBy(users, func(u User) Status { return u.Status }) // map[K][]V
byID := lo.KeyBy(users, func(u User) int64 { return u.ID })             // map[K]V (later wins)
nameToEmail := lo.Associate(users, func(u User) (string, string) {
    return u.Name, u.Email
})
```

### Control Flow

```go
status := lo.Ternary(isActive, "active", "inactive")

label := lo.If(age < 13, "child").
    ElseIf(age < 20, "teen").
    ElseIf(age < 65, "adult").
    Else("senior")

name := lo.Coalesce(u.DisplayName, u.Username, "anonymous") // first non-zero
```

### Error Ergonomics

```go
cfg := lo.Must(loadConfig())              // panics; init/main only
lo.Must0(db.Ping())                       // for funcs returning only error
value, err := lo.Try(func() error { ... }) // catches panic
iter, err := lo.Attempt(3, func(i int) error { return callAPI() })
// lo.AttemptWithDelay / lo.AttemptWhile for backoff
value, errOrAny := lo.TryWithErrorValue(func() error { ... }) // recover as `any`
```

## When to Prefer Stdlib

Go 1.21 `slices` / `maps` cover many cases. Prefer stdlib when available:

| Task | stdlib | lo |
|------|--------|-----|
| Find index | `slices.Index` | `lo.IndexOf` |
| Contains | `slices.Contains` | `lo.Contains` |
| Reverse in-place | `slices.Reverse` | `lo.Reverse` (copies) |
| Sort | `slices.Sort` / `SortFunc` | — |
| Delete at index | `slices.Delete` | — |
| Binary search | `slices.BinarySearch` | — |
| Map keys | `maps.Keys` (iter.Seq) | `lo.Keys` (slice) |
| Map values | `maps.Values` (iter.Seq) | `lo.Values` (slice) |

Rule: if stdlib has it, use stdlib. Use lo for transforms, grouping, and helpers stdlib lacks.

## Performance Caveats

Chained lo calls allocate intermediate slices:

```go
// 3 allocations
result := lo.Uniq(lo.Map(lo.Filter(xs, keep), transform))

// 1 allocation with FilterMap
result := lo.FilterMap(xs, func(x T, _ int) (U, bool) {
    if !keep(x, 0) { return *new(U), false }
    return transform(x, 0), true
})
```

- For 3-element slices: manual loop is faster and clearer.
- For 10k+ elements: comparable; readability wins.
- `lo.Contains` in a loop → O(n*m); build a map once: `seen := lo.Associate(xs, func(x T) (T, struct{}) { return x, struct{}{} })`.

## Parallel Variants

```go
import "github.com/samber/lo/parallel"

results := parallel.Map(urls, func(url string, _ int) *Response {
    return fetch(url) // I/O-bound
})
```

I/O-bound work: good. CPU-bound: usually not worth the overhead unless 1000+ elements. Does NOT bound goroutine count — for huge inputs, build your own worker pool.

## Anti-Patterns

### `lo.Must` in Request Handlers

```go
// WRONG — panics server
user := lo.Must(h.repo.Find(r.Context(), id))

// RIGHT
user, err := h.repo.Find(r.Context(), id)
if err != nil { http.Error(w, err.Error(), 500); return }
```

### Overkill on Trivial Cases

```go
// WRONG — obscure
isUnique := lo.Uniq([]int{a, b, c})
if len(isUnique) == 3 { ... }

// RIGHT
if a != b && b != c && a != c { ... }
```

### `lo.ForEach` for Plain Iteration

```go
// Noise
lo.ForEach(users, func(u User, _ int) { log.Printf(u.Name) })

// Prefer
for _, u := range users { log.Printf(u.Name) }
```

## Review Checklist

Flag:

- **CRITICAL** — `lo.Must` / `lo.Must0` in request handlers, middleware, or non-process-owning goroutines
- **WARNING** — Chained `Filter` → `Map` → `Uniq` on large inputs
- **WARNING** — `parallel.Map` over unbounded input (goroutine explosion)
- **WARNING** — `lo.Contains` in a loop (convert outer set to map once)
- **SUGGESTION** — Using lo where stdlib `slices` / `maps` covers it
- **SUGGESTION** — 3-line loop rewritten as lo chain for no readability gain
