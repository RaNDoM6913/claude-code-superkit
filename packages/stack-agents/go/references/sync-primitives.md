# Sync Primitives

> Reference document for go-concurrency-reviewer. Loaded on demand via Read tool.

## sync.Mutex / sync.RWMutex

Protects shared mutable state. Use `RWMutex` when reads vastly outnumber writes.

```go
// Mutex — exclusive access
type UserCache struct {
    mu    sync.Mutex
    users map[int64]*User
}

func (c *UserCache) Set(id int64, u *User) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.users[id] = u
}

func (c *UserCache) Get(id int64) (*User, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    u, ok := c.users[id]
    return u, ok
}

// RWMutex — concurrent reads, exclusive writes
type ConfigStore struct {
    mu     sync.RWMutex
    config Config
}

func (s *ConfigStore) Get() Config {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.config // safe concurrent reads
}

func (s *ConfigStore) Update(cfg Config) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.config = cfg // exclusive write
}
```

**Decision table — Mutex vs RWMutex:**

| Read:Write Ratio | Use | Why |
|-------------------|-----|-----|
| ~50:50 | `sync.Mutex` | RWMutex overhead not worth it |
| 90:10 or higher | `sync.RWMutex` | Concurrent reads improve throughput |
| Rarely contested | `sync.Mutex` | Simpler, less overhead |

**Anti-patterns:**

```go
// WRONG — copying a mutex
type Bad struct {
    mu sync.Mutex
}
b1 := Bad{}
b2 := b1 // copies mutex! go vet warns

// WRONG — locking in wrong order (deadlock)
func transfer(a, b *Account) {
    a.mu.Lock()
    b.mu.Lock() // if another goroutine locks b then a → deadlock
}

// CORRECT — consistent lock ordering
func transfer(a, b *Account) {
    first, second := a, b
    if a.ID > b.ID {
        first, second = b, a
    }
    first.mu.Lock()
    defer first.mu.Unlock()
    second.mu.Lock()
    defer second.mu.Unlock()
}
```

## sync.Map

Specialized concurrent map. **Not** a general-purpose concurrent map.

**Use only when:**
- Keys are written once, read many times (append-only cache)
- Goroutines access disjoint key sets
- The key set is stable after initialization

**Do NOT use when:**
- Mixed read/write workload (use `Mutex` + `map`)
- Need to iterate consistently
- Need to check length efficiently

```go
var cache sync.Map

// Store
cache.Store("key", &User{Name: "Alice"})

// Load
if v, ok := cache.Load("key"); ok {
    user := v.(*User) // type assertion required
}

// LoadOrStore — atomic get-or-set
actual, loaded := cache.LoadOrStore("key", &User{Name: "Bob"})
// loaded=true: key existed, actual is existing value
// loaded=false: key was new, actual is the stored value

// LoadAndDelete — atomic get-and-remove
v, loaded := cache.LoadAndDelete("key")

// Range — iterate (not consistent snapshot)
cache.Range(func(key, value any) bool {
    fmt.Printf("%v: %v\n", key, value)
    return true // continue iteration
})
```

## sync.Pool

Reuse temporary objects to reduce GC pressure. Objects may be reclaimed at any GC cycle.

**Use when:**
- Hot-path allocations (buffers, encoders, decoders)
- Object creation is expensive
- Objects are short-lived and reusable

**Always reset before Put:**

```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func process(data []byte) string {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset() // CRITICAL: reset before returning to pool
        bufPool.Put(buf)
    }()

    buf.Write(data)
    buf.WriteString(" processed")
    return buf.String()
}
```

**Pool for JSON encoders:**

```go
var encoderPool = sync.Pool{
    New: func() any {
        return json.NewEncoder(io.Discard) // placeholder, replaced on Get
    },
}

func writeJSON(w http.ResponseWriter, v any) error {
    enc := encoderPool.Get().(*json.Encoder)
    defer encoderPool.Put(enc)

    enc.Reset(w) // point to actual writer
    return enc.Encode(v)
}
```

**Anti-patterns:**

```go
// WRONG — not resetting before Put (data leak between requests)
buf := bufPool.Get().(*bytes.Buffer)
buf.Write(sensitiveData)
bufPool.Put(buf) // next Get() sees leftover data!

// WRONG — storing pointers to pool objects (may be reclaimed)
obj := pool.Get().(*BigStruct)
cache[key] = obj // obj may be reclaimed by GC!
pool.Put(obj)
```

## sync.Once

Execute a function exactly once, regardless of how many goroutines call it. Thread-safe lazy initialization.

```go
type DBPool struct {
    once sync.Once
    pool *pgxpool.Pool
    err  error
}

func (d *DBPool) Get(ctx context.Context) (*pgxpool.Pool, error) {
    d.once.Do(func() {
        d.pool, d.err = pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
    })
    return d.pool, d.err
}
```

**sync.OnceValue / sync.OnceValues (Go 1.21+):**

```go
// Returns a function that computes the value once
var getConfig = sync.OnceValue(func() *Config {
    cfg, err := loadConfig()
    if err != nil {
        panic(err) // or handle differently
    }
    return cfg
})

// Returns a function that computes value + error once
var getDB = sync.OnceValues(func() (*pgxpool.Pool, error) {
    return pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
})

// Usage
cfg := getConfig()        // computed on first call, cached after
db, err := getDB()        // computed on first call, cached after
```

## sync.WaitGroup

Wait for a fixed number of goroutines to complete.

### Go 1.25+: wg.Go

`wg.Go(f)` spawns `f` in a new goroutine and tracks it in one call — replacing the `Add(1)` / `go` / `defer Done()` triad and its easy-to-forget footguns (the classic Add-inside-goroutine race shown below).

```go
func processAll(ctx context.Context, items []Item) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Go(func() { process(ctx, item) }) // Add + goroutine + Done, atomically
    }

    wg.Wait()
}
```

**Rules:**
- Go 1.25+ only — keep the classic `Add`/`Done` form below as the fallback for older toolchains.
- `f` must not panic — `wg.Go` does not recover; a panic crashes the program. Recover inside `f` if it can fail.
- No error or cancellation propagation. When you need to collect the first error or cancel siblings, use `errgroup.WithContext` (see the errgroup section below), not `wg.Go`.

### Classic Add/Done (all versions)

```go
func processAll(ctx context.Context, items []Item) {
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        go func() {
            defer wg.Done()
            process(ctx, item)
        }()
    }

    wg.Wait() // blocks until all Done() calls
}
```

**Rules:**
- Call `Add` before spawning the goroutine (not inside it)
- Always `defer wg.Done()` to handle panics
- Never pass WaitGroup by value (use pointer)

```go
// WRONG — Add inside goroutine (race condition)
go func() {
    wg.Add(1) // may run after Wait()!
    defer wg.Done()
    work()
}()
wg.Wait()

// WRONG — passing by value
func worker(wg sync.WaitGroup) { // copies WaitGroup!
    defer wg.Done() // decrements the copy
}
```

## Atomic Operations

Lock-free operations for simple counters and flags. Faster than mutex for single-value access.

```go
import "sync/atomic"

// Counter
var requestCount atomic.Int64

func handleRequest() {
    requestCount.Add(1)
    // ...
}

func getMetrics() int64 {
    return requestCount.Load()
}

// Bool flag
var isReady atomic.Bool

func init() {
    go func() {
        prepare()
        isReady.Store(true)
    }()
}

// Pointer swap (atomic config reload)
var currentConfig atomic.Pointer[Config]

func reloadConfig() {
    newCfg := loadConfig()
    currentConfig.Store(newCfg)
}

func getConfig() *Config {
    return currentConfig.Load()
}
```

**Decision table — atomic vs mutex:**

| Scenario | Use |
|----------|-----|
| Single counter/flag | `atomic` |
| Multiple related fields | `sync.Mutex` |
| Read-mostly single value | `atomic` |
| Complex state transitions | `sync.Mutex` |
| Pointer swap | `atomic.Pointer` |

## errgroup

Fan-out with error collection and automatic context cancellation.

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, urls []string) ([]Response, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Response, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = resp
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err // first error, context was cancelled
    }
    return results, nil
}

// With concurrency limit (Go 1.20+ errgroup)
g.SetLimit(10) // max 10 concurrent goroutines
```

## Decision Table: Which Primitive?

| Need | Primitive | Example |
|------|-----------|---------|
| Protect map/struct from concurrent access | `sync.Mutex` | Shared cache |
| Many concurrent readers, rare writes | `sync.RWMutex` | Config store |
| Append-only concurrent map | `sync.Map` | DNS cache |
| Reuse expensive temporary objects | `sync.Pool` | Byte buffers |
| One-time initialization | `sync.Once` | DB connection |
| Wait for N goroutines | `sync.WaitGroup` | Batch processing |
| Simple counter/flag | `atomic.Int64` / `atomic.Bool` | Metrics |
| Atomic pointer swap | `atomic.Pointer[T]` | Config reload |
| Fan-out with error handling | `errgroup.Group` | Parallel HTTP calls |

## When to Use

Apply when reviewing concurrent code for correct synchronization. Flag violations as:
- **CRITICAL**: Missing synchronization on shared mutable state, copying mutex/WaitGroup, sync.Pool without Reset
- **WARNING**: Using sync.Map for general concurrent access, mutex where atomic suffices, WaitGroup.Add inside goroutine
- **SUGGESTION**: Could use RWMutex for read-heavy workload, sync.OnceValue instead of sync.Once+field, errgroup.SetLimit
