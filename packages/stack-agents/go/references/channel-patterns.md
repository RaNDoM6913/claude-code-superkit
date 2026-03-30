# Channel Patterns

> Reference document for go-concurrency-reviewer. Loaded on demand via Read tool.

## Fan-Out / Fan-In

Distribute work across multiple goroutines (fan-out), collect results into one channel (fan-in).

```go
// Fan-out: spawn N workers reading from one input channel
func fanOut(ctx context.Context, input <-chan Job, workers int) []<-chan Result {
    outputs := make([]<-chan Result, workers)
    for i := range workers {
        out := make(chan Result)
        outputs[i] = out
        go func() {
            defer close(out)
            for job := range input {
                select {
                case <-ctx.Done():
                    return
                case out <- process(job):
                }
            }
        }()
    }
    return outputs
}

// Fan-in: merge multiple channels into one
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    merged := make(chan Result)
    var wg sync.WaitGroup
    wg.Add(len(channels))

    for _, ch := range channels {
        go func() {
            defer wg.Done()
            for result := range ch {
                select {
                case <-ctx.Done():
                    return
                case merged <- result:
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

// Usage
input := make(chan Job)
outputs := fanOut(ctx, input, 4)
results := fanIn(ctx, outputs...)
```

## Pipeline

Chain of stages where each stage reads from input, processes, writes to output.

```go
// Stage 1: generate
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case <-ctx.Done():
                return
            case out <- n:
            }
        }
    }()
    return out
}

// Stage 2: square
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case <-ctx.Done():
                return
            case out <- n * n:
            }
        }
    }()
    return out
}

// Stage 3: filter
func filter(ctx context.Context, in <-chan int, predicate func(int) bool) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if predicate(n) {
                select {
                case <-ctx.Done():
                    return
                case out <- n:
                }
            }
        }
    }()
    return out
}

// Compose pipeline
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

nums := generate(ctx, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
squared := square(ctx, nums)
even := filter(ctx, squared, func(n int) bool { return n%2 == 0 })

for result := range even {
    fmt.Println(result) // 4, 16, 36, 64, 100
}
```

## Signaling Patterns

### Done Channel

```go
// Signal completion without data
done := make(chan struct{})

go func() {
    defer close(done) // signal by closing
    doWork()
}()

<-done // wait for completion
```

### Context Done

```go
go func(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("cancelled:", ctx.Err())
            return
        case data := <-dataCh:
            process(data)
        }
    }
}(ctx)
```

## Channel Ownership Rules

**Only the sender closes a channel. Never the receiver.**

```go
// CORRECT — producer owns and closes
func produce(ctx context.Context) <-chan Item {
    ch := make(chan Item)
    go func() {
        defer close(ch) // producer closes
        for item := range items {
            select {
            case <-ctx.Done():
                return
            case ch <- item:
            }
        }
    }()
    return ch // return read-only channel
}

// Consumer just ranges — never closes
for item := range produce(ctx) {
    process(item)
}
```

### Directed Channel Types

Use directed types in function signatures to enforce ownership.

```go
// Send-only: can write, cannot read
func producer(out chan<- int) {
    out <- 42
    close(out)
}

// Receive-only: can read, cannot write or close
func consumer(in <-chan int) {
    for v := range in {
        fmt.Println(v)
    }
}
```

## Buffered vs Unbuffered

| Type | Behavior | Use When |
|------|----------|----------|
| Unbuffered `make(chan T)` | Send blocks until receiver ready | Synchronization between goroutines |
| Buffered `make(chan T, n)` | Send blocks only when buffer full | Throughput, decoupling speed differences |

```go
// Unbuffered — synchronization point
// Both goroutines must be ready simultaneously
sync := make(chan struct{})
go func() {
    prepareData()
    sync <- struct{}{} // blocks until main reads
}()
<-sync // blocks until goroutine sends
useData()

// Buffered — throughput
// Producer can run ahead of consumer
jobs := make(chan Job, 100)
go func() {
    for _, j := range allJobs {
        jobs <- j // won't block until buffer full
    }
    close(jobs)
}()
```

### Buffer Size Guidelines

| Size | Use Case |
|------|----------|
| 0 (unbuffered) | Synchronization, handoff |
| 1 | Signal that can be "pending" (e.g., notify channel) |
| N (known batch) | Pre-buffering known workload |
| N (worker count) | One slot per worker |

```go
// Size 1 — "at most one pending notification"
notify := make(chan struct{}, 1)

// Non-blocking send: notify if not already pending
select {
case notify <- struct{}{}:
default: // already pending, skip
}
```

## Select with Default (Non-Blocking)

```go
// Non-blocking receive
select {
case msg := <-ch:
    process(msg)
default:
    // ch not ready, do something else
}

// Non-blocking send
select {
case ch <- msg:
    // sent
default:
    // channel full or not ready, drop or queue
}

// Try-lock pattern
select {
case sem <- struct{}{}: // acquire
    defer func() { <-sem }() // release
    doCriticalWork()
default:
    // someone else holds it
    return ErrBusy
}
```

## Nil Channel Tricks

A nil channel blocks forever on both send and receive. This is useful in select to dynamically disable cases.

```go
func merge(ctx context.Context, a, b <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for a != nil || b != nil {
            select {
            case <-ctx.Done():
                return
            case v, ok := <-a:
                if !ok {
                    a = nil // disable this case
                    continue
                }
                out <- v
            case v, ok := <-b:
                if !ok {
                    b = nil // disable this case
                    continue
                }
                out <- v
            }
        }
    }()
    return out
}
```

### Dynamic Channel Selection

```go
func processWithTimeout(ch <-chan Data, timeout time.Duration) (Data, error) {
    var timer <-chan time.Time // nil — won't fire
    if timeout > 0 {
        t := time.NewTimer(timeout)
        defer t.Stop()
        timer = t.C // now it will fire
    }

    select {
    case data := <-ch:
        return data, nil
    case <-timer: // skipped entirely if timer is nil
        return Data{}, ErrTimeout
    }
}
```

## Common Mistakes

### Forgetting to Close

```go
// BUG — consumer ranges forever
func produce() <-chan int {
    ch := make(chan int)
    go func() {
        for i := range 10 {
            ch <- i
        }
        // forgot close(ch) — consumer blocks forever after 10 items
    }()
    return ch
}
```

### Closing from Receiver Side

```go
// BUG — panic if sender writes after close
go func() {
    for data := range input {
        process(data)
    }
    close(input) // WRONG: receiver should not close
}()
```

### Range Over Non-Closed Channel

```go
// BUG — deadlock if channel is never closed
for v := range ch { // blocks forever after last value
    process(v)
}
```

## When to Use

Apply when reviewing channel usage and concurrent communication patterns. Flag violations as:
- **CRITICAL**: Receiver closing channel, unbuffered channel in goroutine without exit path, range over channel that's never closed
- **WARNING**: Missing context/done in select, oversized buffer without justification, send on closed channel risk
- **SUGGESTION**: Could use directed channel types, nil channel trick for dynamic disable, pipeline pattern for data processing
