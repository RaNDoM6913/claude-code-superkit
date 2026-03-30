# Data Structures

> Reference document for go-reviewer. Loaded on demand via Read tool.

## Slices

### Append Semantics

`append` may allocate a new underlying array. **Always reassign** the result.

```go
// CORRECT — reassign
s = append(s, item)

// BUG — discards potential new allocation
func addItem(s []int, item int) {
    append(s, item) // result not captured!
}
```

### Capacity and Growth

```go
// Pre-allocate when size is known — avoids repeated copying
users := make([]User, 0, len(ids))
for _, id := range ids {
    u, err := repo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }
    users = append(users, *u)
}

// Growth policy: Go runtime doubles small slices, grows ~25% for large ones
// Check current capacity
fmt.Println(len(s), cap(s))
```

### Copy for Safety

Slices share underlying arrays. Copy when you need independent data.

```go
// DANGEROUS — modifying returned slice affects internal state
func (c *Cache) GetIDs() []int64 {
    return c.ids // caller can modify c.ids!
}

// SAFE — return a copy
func (c *Cache) GetIDs() []int64 {
    result := make([]int64, len(c.ids))
    copy(result, c.ids)
    return result
}

// SAFE — slices.Clone (Go 1.21+)
func (c *Cache) GetIDs() []int64 {
    return slices.Clone(c.ids)
}
```

### Nil vs Empty Slices

```go
var s []int          // nil slice:  s == nil, len(s) == 0, json → null
s = []int{}          // empty slice: s != nil, len(s) == 0, json → []
s = make([]int, 0)   // empty slice: s != nil, len(s) == 0, json → []
```

**Decision table — nil vs empty:**

| Context | Use | Why |
|---------|-----|-----|
| JSON API response | `[]int{}` or `make` | Clients expect `[]`, not `null` |
| Internal return, no results | `nil` | Idiomatic, `len`/`append` work on nil |
| Struct field default | `nil` (zero value) | Initialize on first use |
| Test assertion | Be explicit | `assert.Nil` vs `assert.Empty` differ |

### Slice Tricks

```go
// Delete element at index i (preserves order)
s = slices.Delete(s, i, i+1) // Go 1.21+
// or: s = append(s[:i], s[i+1:]...)

// Delete without preserving order (fast)
s[i] = s[len(s)-1]
s = s[:len(s)-1]

// Filter in-place
s = slices.DeleteFunc(s, func(v int) bool {
    return v < 0
})

// Deduplicate sorted slice
slices.Sort(s)
s = slices.Compact(s)
```

## Maps

### Initialization

```go
// Must initialize before writing — nil map write panics!
var m map[string]int
m["key"] = 1 // PANIC: assignment to entry in nil map

// CORRECT ways to initialize
m := make(map[string]int)
m := make(map[string]int, expectedSize) // pre-size hint
m := map[string]int{"key": 1}           // literal
```

### Iteration Order

Map iteration order is **randomized** by the Go runtime. Never depend on order.

```go
// If you need ordered keys:
keys := make([]string, 0, len(m))
for k := range m {
    keys = append(keys, k)
}
slices.Sort(keys)
for _, k := range keys {
    fmt.Println(k, m[k])
}
```

### Concurrency

| Operation | Safe without sync? |
|-----------|-------------------|
| Concurrent reads (no writes) | Yes |
| Concurrent read + write | NO — data race, may crash |
| Concurrent writes | NO — data race, may crash |

```go
// WRONG — data race
go func() { m["a"] = 1 }()
go func() { _ = m["a"] }()

// CORRECT — mutex protection
type SafeMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func (sm *SafeMap) Get(key string) (int, bool) {
    sm.mu.RLock()
    defer sm.mu.RUnlock()
    v, ok := sm.m[key]
    return v, ok
}

func (sm *SafeMap) Set(key string, value int) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    sm.m[key] = value
}
```

### sync.Map

Use **only** when one of these applies:
- Append-only (keys written once, read many)
- Disjoint key sets per goroutine

**Do not** use sync.Map as a general concurrent map — it's slower for mixed read/write workloads.

```go
var cache sync.Map

// Store
cache.Store("key", value)

// Load
if v, ok := cache.Load("key"); ok {
    user := v.(*User)
}

// LoadOrStore — atomic get-or-set
actual, loaded := cache.LoadOrStore("key", newValue)
```

## Arrays vs Slices

| Feature | Array | Slice |
|---------|-------|-------|
| Type | Value type (copied on assignment) | Reference type (shares backing array) |
| Size | Fixed, part of type: `[5]int` | Dynamic: `[]int` |
| Comparison | `==` works | `==` doesn't compile (use `slices.Equal`) |
| Function args | Copied entirely | Header only (24 bytes) |
| Common use | Rare (crypto hashes, IP addrs) | Everywhere |

```go
// Array — value type, full copy
a := [3]int{1, 2, 3}
b := a         // b is an independent copy
b[0] = 99      // a[0] is still 1

// Slice — reference type, shared backing
s := []int{1, 2, 3}
t := s          // t shares same backing array
t[0] = 99       // s[0] is now 99!
```

## Generics (Go 1.18+)

### Type Constraints

```go
// Built-in constraints
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Custom constraint
type Number interface {
    ~int | ~int32 | ~int64 | ~float32 | ~float64
}

func Sum[T Number](values []T) T {
    var total T
    for _, v := range values {
        total += v
    }
    return total
}
```

### Generic Data Structures

```go
type Set[T comparable] struct {
    m map[T]struct{}
}

func NewSet[T comparable](items ...T) *Set[T] {
    s := &Set[T]{m: make(map[T]struct{}, len(items))}
    for _, item := range items {
        s.m[item] = struct{}{}
    }
    return s
}

func (s *Set[T]) Contains(item T) bool {
    _, ok := s.m[item]
    return ok
}

func (s *Set[T]) Add(item T) {
    s.m[item] = struct{}{}
}
```

### When to Use Generics

| Use generics | Don't use generics |
|--------------|-------------------|
| Collection utilities (Map, Filter, Reduce) | Business logic (unclear types) |
| Data structures (Set, Queue, Stack) | When `any` or `interface{}` suffices |
| Algorithms that work on multiple types | When only 1-2 types will ever be used |
| Type-safe wrappers | When it hurts readability |

## Pointer Types

**Decision table — pointer vs value:**

| Condition | Use Pointer | Use Value |
|-----------|-------------|-----------|
| Struct > 64 bytes | Yes — avoid copy cost | |
| Needs mutation | Yes | |
| Implements interface with pointer receiver | Yes | |
| Optional / nullable field | Yes (`*string`) | |
| Small struct (< 4 fields, no slices/maps) | | Yes |
| Immutable data | | Yes |
| Map key | | Yes (pointers can't be map keys) |
| Concurrency without sync | | Yes (value copy is safe) |

```go
// Pointer — large struct, needs mutation
func (s *Service) UpdateUser(ctx context.Context, user *User) error {
    user.UpdatedAt = time.Now()
    return s.repo.Save(ctx, user)
}

// Value — small, immutable
type Point struct {
    X, Y float64
}

func Distance(a, b Point) float64 {
    dx := a.X - b.X
    dy := a.Y - b.Y
    return math.Sqrt(dx*dx + dy*dy)
}

// Optional fields
type UpdateInput struct {
    Name  *string `json:"name,omitempty"`  // nil = don't update
    Email *string `json:"email,omitempty"` // nil = don't update
}
```

## When to Use

Apply when reviewing Go data structure usage. Flag violations as:
- **CRITICAL**: Writing to nil map, not reassigning append result, concurrent map access without sync
- **WARNING**: Returning internal slice without copy, using sync.Map for general concurrent access
- **SUGGESTION**: Missing pre-allocation, using arrays instead of slices, unnecessary pointer for small types
