# Performance Profiling

> Reference document for go-performance-reviewer. Loaded on demand via Read tool.

## pprof Workflow

### Setup

```go
import _ "net/http/pprof" // register handlers on DefaultServeMux

func main() {
    // Option 1: Separate debug server
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()

    // Option 2: Add to existing mux (Go 1.22+ enhanced ServeMux)
    mux.HandleFunc("GET /debug/pprof/", pprof.Index)
    mux.HandleFunc("GET /debug/pprof/cmdline", pprof.Cmdline)
    mux.HandleFunc("GET /debug/pprof/profile", pprof.Profile)
    mux.HandleFunc("GET /debug/pprof/symbol", pprof.Symbol)
    mux.HandleFunc("GET /debug/pprof/trace", pprof.Trace)
}
```

### Profile Types

| Profile | URL / Flag | What It Shows |
|---------|-----------|---------------|
| CPU | `/debug/pprof/profile?seconds=30` | Where CPU time is spent |
| Heap | `/debug/pprof/heap` | Current memory allocations |
| Allocs | `/debug/pprof/allocs` | All past allocations (even freed) |
| Goroutine | `/debug/pprof/goroutine` | All goroutine stacks |
| Block | `/debug/pprof/block` | Where goroutines block on sync |
| Mutex | `/debug/pprof/mutex` | Mutex contention |
| Threadcreate | `/debug/pprof/threadcreate` | OS thread creation |

### Collection and Analysis

```bash
# Collect CPU profile (30 seconds)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Collect heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Interactive commands
(pprof) top 20          # top 20 functions by cost
(pprof) list funcName   # source-level annotation
(pprof) web             # open flame graph in browser
(pprof) peek funcName   # callers and callees

# From test
go test -cpuprofile cpu.prof -memprofile mem.prof -bench .
go tool pprof cpu.prof
```

## benchstat Workflow

Statistically rigorous benchmark comparison.

```bash
# Run benchmarks with multiple iterations
go test -bench=BenchmarkProcess -count=6 -benchmem > old.txt

# Make changes, then run again
go test -bench=BenchmarkProcess -count=6 -benchmem > new.txt

# Compare
benchstat old.txt new.txt
```

**Output interpretation:**

```
name          old time/op    new time/op    delta
Process-8     12.3ms ± 2%    8.7ms ± 1%   -29.27%  (p=0.002 n=6+6)

name          old alloc/op   new alloc/op   delta
Process-8     4.80kB ± 0%    1.20kB ± 0%   -75.00%  (p=0.002 n=6+6)

name          old allocs/op  new allocs/op  delta
Process-8       45.0 ± 0%      12.0 ± 0%   -73.33%  (p=0.002 n=6+6)
```

| Field | Meaning |
|-------|---------|
| `± N%` | Variation across runs (lower = more stable) |
| `delta` | Percentage change (negative = improvement) |
| `p=0.002` | p-value: < 0.05 means statistically significant |
| `n=6+6` | Sample sizes used |

**Rules:**
- Always use `-count=6` or higher (minimum for statistical significance)
- If `p > 0.05`, the change is not statistically significant — don't claim improvement
- Run on quiet machine, no other CPU-heavy processes
- Use `-benchtime=2s` for fast benchmarks to get stable numbers

## Escape Analysis

Understand what allocates on the heap vs stack.

```bash
go build -gcflags="-m" ./...
go build -gcflags="-m -m" ./... # more verbose
```

**Output examples:**

```
./main.go:15:6: can inline NewUser
./main.go:20:6: &User{} escapes to heap    # heap allocation!
./main.go:25:6: result does not escape      # stays on stack
```

**Common escape causes:**

| Pattern | Escapes? | Fix |
|---------|----------|-----|
| Return pointer to local | Yes | Return value if small |
| Store in interface | Yes | Use concrete type |
| Closure captures variable | Yes | Pass as parameter |
| Slice append beyond cap | Yes | Pre-allocate |
| Send to channel | Yes | Use sync.Pool |

```go
// ESCAPES — pointer returned
func newUser(name string) *User {
    u := User{Name: name} // escapes to heap
    return &u
}

// STAYS ON STACK — value returned
func newPoint(x, y int) Point {
    return Point{X: x, Y: y} // allocated on stack
}

// ESCAPES — stored in interface
func process(v any) { ... }
func main() {
    n := 42
    process(n) // n escapes to heap (boxed into interface)
}
```

## alloc_objects — Finding Hot Allocators

```bash
go tool pprof -alloc_objects http://localhost:6060/debug/pprof/heap

(pprof) top 10
Showing nodes accounting for 1523456 allocs
      flat  flat%   sum%        cum   cum%
    892340 58.57% 58.57%     892340 58.57%  encoding/json.(*Decoder).Token
    234567 15.40% 73.97%     234567 15.40%  bytes.(*Buffer).grow
    123456  8.10% 82.07%     123456  8.10%  fmt.Sprintf
```

**Common allocation hot spots and fixes:**

| Hot Spot | Fix |
|----------|-----|
| `fmt.Sprintf` | `strconv.Itoa`, `strconv.FormatInt`, string concat |
| `json.Marshal/Unmarshal` | Pre-allocated buffer, `json.NewEncoder`, sonic/jsoniter |
| `bytes.Buffer.grow` | Pre-sized `bytes.NewBuffer(make([]byte, 0, expectedSize))` |
| `append` growing | Pre-allocate with `make([]T, 0, n)` |
| String concatenation in loop | `strings.Builder` |

## GC Tuning

### GOGC

Controls GC frequency. Default: `GOGC=100` means GC triggers when heap doubles.

```bash
GOGC=200 ./myapp    # less frequent GC, more memory, less CPU
GOGC=50  ./myapp    # more frequent GC, less memory, more CPU
GOGC=off ./myapp    # disable GC (for short-lived batch jobs only!)
```

| GOGC Value | Heap Growth Before GC | Tradeoff |
|------------|----------------------|----------|
| 50 | 50% growth | Low memory, high CPU |
| 100 (default) | 100% growth | Balanced |
| 200 | 200% growth | High memory, low CPU |
| 400+ | 400%+ growth | For memory-rich servers |

### GOMEMLIMIT (Go 1.19+)

Hard ceiling on total Go memory. GC works harder as it approaches the limit.

```bash
GOMEMLIMIT=512MiB ./myapp   # GC gets aggressive near 512MB
GOMEMLIMIT=2GiB ./myapp     # for container with 2GB memory limit
```

**Best practice for containers:**

```bash
# Container has 4GB memory
# Reserve ~20% for non-Go memory (OS, cgo, etc.)
GOMEMLIMIT=3200MiB GOGC=100 ./myapp
```

### Runtime Metrics

```go
import "runtime/metrics"

func collectGCMetrics() {
    samples := []metrics.Sample{
        {Name: "/gc/cycles/total:gc-cycles"},
        {Name: "/gc/heap/allocs:bytes"},
        {Name: "/gc/heap/goal:bytes"},
        {Name: "/memory/classes/total:bytes"},
    }
    metrics.Read(samples)
}
```

## Caching Decision Tree

| Scenario | Solution | When |
|----------|----------|------|
| Process-local, bounded size | `sync.Map` or samber/hot | Single instance, < 100k entries |
| Process-local, eviction needed | samber/hot (LRU, LFU, ARC, etc.) | Need TTL or size-based eviction |
| Distributed, shared across instances | Redis | Multi-instance, needs consistency |
| Static assets | CDN (Cloudflare, CloudFront) | Images, JS, CSS, fonts |
| Computed results, cross-request | Process-local + Redis fallback | Expensive computation |
| Database query results | Application-level cache | Repeated queries, read-heavy |

```go
// samber/hot — in-memory cache with eviction
import "github.com/samber/hot"

cache := hot.NewHotCache[string, *User](hot.LRU, 10000)
cache.SetWithTTL("user:42", user, 5*time.Minute)

if user, ok := cache.Get("user:42"); ok {
    return user, nil
}
```

## When to Use

Apply when reviewing performance-sensitive code or investigating performance issues. Flag violations as:
- **CRITICAL**: Missing pprof endpoint in production service, GOGC=off in long-running service
- **WARNING**: Benchmark without -count (no statistical rigor), missing GOMEMLIMIT in containers
- **SUGGESTION**: Could use sync.Pool for hot-path allocations, pre-allocate slices, use strings.Builder
