# Goroutine Lifecycle

> Reference document for go-concurrency-reviewer. Loaded on demand via Read tool.

## Spawn Patterns

Always spawn goroutines with a clear exit path. Never fire-and-forget.

```go
// CORRECT — goroutine with context cancellation
func (s *Service) StartWorker(ctx context.Context) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return // clean exit
            case job := <-s.jobs:
                s.process(ctx, job)
            }
        }
    }()
}

// CORRECT — goroutine with WaitGroup for lifecycle tracking
func (s *Service) StartWorkers(ctx context.Context, n int) {
    s.wg.Add(n)
    for range n {
        go func() {
            defer s.wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                case job := <-s.jobs:
                    s.process(ctx, job)
                }
            }
        }()
    }
}

// WRONG — fire and forget, no exit path
func (s *Service) StartWorker() {
    go func() {
        for job := range s.jobs { // blocks forever if channel never closed
            s.process(context.Background(), job)
        }
    }()
}
```

## Shutdown Mechanisms

### Context Cancellation (preferred)

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // cancels all child goroutines

go worker(ctx)
go worker(ctx)

// Later: cancel() signals all workers to stop
```

### Done Channel

```go
type Server struct {
    done chan struct{}
}

func (s *Server) Start() {
    s.done = make(chan struct{})
    go s.run()
}

func (s *Server) Stop() {
    close(s.done) // signal all goroutines
}

func (s *Server) run() {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    for {
        select {
        case <-s.done:
            return
        case <-ticker.C:
            s.tick()
        }
    }
}
```

### Signal-Based Shutdown

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(),
        syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    srv := NewServer()
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal("listen", "error", err)
        }
    }()

    <-ctx.Done() // block until signal
    log.Info("shutting down")

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        log.Error("shutdown", "error", err)
    }
    log.Info("shutdown complete")
}
```

## Graceful Shutdown Pattern

Full production-ready graceful shutdown with multiple components:

```go
func run(ctx context.Context) error {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    g, ctx := errgroup.WithContext(ctx)

    // HTTP server
    srv := &http.Server{Addr: ":8080", Handler: mux}
    g.Go(func() error {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            return err
        }
        return nil
    })
    g.Go(func() error {
        <-ctx.Done()
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        return srv.Shutdown(shutdownCtx)
    })

    // Background worker
    g.Go(func() error {
        return worker.Run(ctx) // must respect ctx.Done()
    })

    // Metrics flusher
    g.Go(func() error {
        <-ctx.Done()
        return metrics.Flush(context.Background())
    })

    return g.Wait()
}
```

## Leak Prevention

Every goroutine must have a guaranteed exit path. Common leak patterns:

### Leak: Blocked Channel Read

```go
// LEAK — ch may never receive a value
func leaky() {
    ch := make(chan int)
    go func() {
        val := <-ch // blocks forever if nobody sends
        process(val)
    }()
    // function returns, ch goes out of scope, goroutine leaks
}

// FIXED — use context or done channel
func fixed(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            process(val)
        case <-ctx.Done():
            return
        }
    }()
}
```

### Leak: Blocked Channel Write

```go
// LEAK — unbuffered channel, nobody reads
func leaky() {
    ch := make(chan result)
    go func() {
        ch <- doWork() // blocks forever if nobody reads
    }()
    // function returns without reading from ch
}

// FIXED — buffered channel of 1
func fixed() {
    ch := make(chan result, 1) // won't block even if nobody reads
    go func() {
        ch <- doWork()
    }()
}
```

### Leak: Forgotten Ticker

```go
// LEAK — ticker not stopped
func leaky() {
    ticker := time.NewTicker(time.Second)
    go func() {
        for range ticker.C {
            // ...
        }
    }()
}

// FIXED — stop ticker on exit
func fixed(ctx context.Context) {
    ticker := time.NewTicker(time.Second)
    go func() {
        defer ticker.Stop()
        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                // ...
            }
        }
    }()
}
```

## goleak Integration

Detect goroutine leaks in tests.

```go
import "go.uber.org/goleak"

// Option 1: TestMain — checks all tests in package
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}

// Option 2: Per-test — more granular
func TestNoLeak(t *testing.T) {
    defer goleak.VerifyNone(t)
    // test code...
}

// Option 3: Ignore known goroutines
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m,
        goleak.IgnoreTopFunction("database/sql.(*DB).connectionOpener"),
        goleak.IgnoreAnyFunction("go.opencensus.io/stats/view.(*worker).start"),
    )
}
```

## Worker Pool Pattern

Bounded concurrency using a semaphore channel.

```go
func ProcessAll(ctx context.Context, items []Item, maxWorkers int) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(maxWorkers) // errgroup built-in limiter (Go 1.20+)

    for _, item := range items {
        g.Go(func() error {
            return process(ctx, item)
        })
    }

    return g.Wait()
}

// Manual semaphore pattern (pre-errgroup.SetLimit)
func ProcessAll(ctx context.Context, items []Item, maxWorkers int) error {
    sem := make(chan struct{}, maxWorkers)
    g, ctx := errgroup.WithContext(ctx)

    for _, item := range items {
        sem <- struct{}{} // acquire
        g.Go(func() error {
            defer func() { <-sem }() // release
            return process(ctx, item)
        })
    }

    return g.Wait()
}
```

## Error Propagation with errgroup

```go
func FetchAll(ctx context.Context, urls []string) ([]Response, error) {
    results := make([]Response, len(urls))
    g, ctx := errgroup.WithContext(ctx)

    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = resp // safe: each goroutine writes to unique index
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err // returns first error, cancels remaining via ctx
    }
    return results, nil
}
```

## Decision Table: Goroutine Lifecycle Tools

| Need | Tool | Why |
|------|------|-----|
| Wait for N goroutines | `sync.WaitGroup` | Simple count-based waiting |
| Wait + first error cancels all | `errgroup.Group` | Combines WaitGroup + context cancel |
| Bounded parallelism | `errgroup.SetLimit(n)` | Limits concurrent goroutines |
| Background worker with shutdown | `context.WithCancel` | Parent controls lifecycle |
| Periodic task | `time.Ticker` + select | Cancelable periodic execution |
| OS signal handling | `signal.NotifyContext` | Converts signal to context cancel |
| HTTP server shutdown | `srv.Shutdown(ctx)` | Drains in-flight requests |

## When to Use

Apply when reviewing goroutine creation, lifecycle management, and shutdown patterns. Flag violations as:
- **CRITICAL**: Goroutine without exit path (leak), fire-and-forget with no cancellation, missing WaitGroup/errgroup
- **WARNING**: No graceful shutdown for long-running services, ticker without Stop, blocked channel without timeout
- **SUGGESTION**: Could use errgroup.SetLimit instead of manual semaphore, missing goleak in tests
