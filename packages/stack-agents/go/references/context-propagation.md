# Context Propagation

> Reference document for go-concurrency-reviewer. Loaded on demand via Read tool.

## Context Creation

| Function | Use When | Example |
|----------|----------|---------|
| `context.Background()` | Entry points: main, init, top-level | `main()`, `TestMain()` |
| `context.TODO()` | Temporary placeholder during refactoring | Grep for these and replace |
| `context.WithCancel(parent)` | Explicit cancellation needed | Worker lifecycle |
| `context.WithTimeout(parent, d)` | Operation has time budget | HTTP client call |
| `context.WithDeadline(parent, t)` | Absolute deadline | "Must complete by 5pm" |
| `context.WithValue(parent, k, v)` | Request-scoped metadata | Request ID, auth token |
| `context.WithoutCancel(parent)` | Detach from parent deadline (Go 1.21+) | Async cleanup after response |

```go
// Entry point — Background
func main() {
    ctx := context.Background()
    if err := run(ctx); err != nil {
        log.Fatal(err)
    }
}

// Cancellation — stops all child goroutines
func (s *Service) Start(ctx context.Context) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel() // always defer cancel

    go s.worker(ctx)
    go s.monitor(ctx)

    <-ctx.Done()
}

// Timeout — for bounded operations
func (c *Client) Fetch(ctx context.Context, url string) (*Response, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel() // release resources even if completed early

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    return c.http.Do(req)
}

// Deadline — absolute time
func (s *Scheduler) RunBefore(ctx context.Context, deadline time.Time) error {
    ctx, cancel := context.WithDeadline(ctx, deadline)
    defer cancel()
    return s.execute(ctx)
}
```

## Cancellation Flow

Cancelling a parent context cancels **all** children. This is the core mechanism for graceful shutdown.

```go
//       root (Background)
//        |
//    parentCtx (WithCancel)
//      /    \
//  child1   child2 (WithTimeout)
//    |         |
//  child3   child4
//
// cancel(parentCtx) → cancels child1, child2, child3, child4
// cancel(child2)    → cancels child4 only

func example() {
    root := context.Background()

    parentCtx, parentCancel := context.WithCancel(root)
    defer parentCancel()

    child1, cancel1 := context.WithCancel(parentCtx)
    defer cancel1()

    child2, cancel2 := context.WithTimeout(parentCtx, 5*time.Second)
    defer cancel2()

    // Cancelling parent stops everything
    parentCancel() // child1.Done() and child2.Done() both fire
}
```

## Timeout Patterns

### Server Middleware

```go
func TimeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Usage
mux.Handle("POST /api/upload", TimeoutMiddleware(30*time.Second)(uploadHandler))
mux.Handle("GET /api/users", TimeoutMiddleware(5*time.Second)(listHandler))
```

### Client Calls with Per-Request Timeout

```go
func (c *APIClient) GetUser(ctx context.Context, id int64) (*User, error) {
    // Respect caller's deadline, but add our own if none exists
    if _, ok := ctx.Deadline(); !ok {
        var cancel context.CancelFunc
        ctx, cancel = context.WithTimeout(ctx, 3*time.Second)
        defer cancel()
    }

    req, err := http.NewRequestWithContext(ctx, "GET",
        fmt.Sprintf("%s/users/%d", c.baseURL, id), nil)
    if err != nil {
        return nil, fmt.Errorf("APIClient.GetUser: %w", err)
    }

    resp, err := c.http.Do(req)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return nil, fmt.Errorf("APIClient.GetUser: %w", domain.ErrTimeout)
        }
        return nil, fmt.Errorf("APIClient.GetUser: %w", err)
    }
    defer resp.Body.Close()

    var user User
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        return nil, fmt.Errorf("APIClient.GetUser: decode: %w", err)
    }
    return &user, nil
}
```

### Database Query with Timeout

```go
func (r *Repo) Search(ctx context.Context, query string) ([]*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()

    rows, err := r.db.Query(ctx,
        "SELECT id, name, email FROM users WHERE name ILIKE $1 LIMIT 100",
        "%"+query+"%")
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return nil, fmt.Errorf("Repo.Search: query too slow: %w", domain.ErrTimeout)
        }
        return nil, fmt.Errorf("Repo.Search: %w", err)
    }
    defer rows.Close()
    // ...
}
```

## Context Value Keys

**Always use typed, unexported keys.** Never use strings or built-in types as keys.

```go
// CORRECT — typed unexported key
type contextKey struct{}

var requestIDKey = contextKey{}

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

func RequestIDFromContext(ctx context.Context) string {
    id, _ := ctx.Value(requestIDKey).(string)
    return id
}
```

```go
// WRONG — string key (collisions between packages)
ctx = context.WithValue(ctx, "request_id", id)

// WRONG — exported key (anyone can overwrite)
var RequestIDKey = "request_id"
```

### Common Context Values

```go
// Each value gets its own key type and accessor pair
type requestIDKeyType struct{}
type userIDKeyType struct{}
type traceIDKeyType struct{}

var (
    requestIDKey = requestIDKeyType{}
    userIDKey    = userIDKeyType{}
    traceIDKey   = traceIDKeyType{}
)

// Middleware sets values
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := extractUserID(r)
        ctx := context.WithValue(r.Context(), userIDKey, userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Service reads values
func (s *Service) Process(ctx context.Context) error {
    userID, _ := ctx.Value(userIDKey).(int64)
    requestID, _ := ctx.Value(requestIDKey).(string)
    s.logger.Info("processing",
        "user_id", userID,
        "request_id", requestID,
    )
    // ...
}
```

## context.WithoutCancel (Go 1.21+)

Detach a context from its parent's cancellation while preserving values. Useful for operations that must continue after the parent is cancelled.

```go
// Async audit logging — must complete even if request is cancelled
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
    if err := h.svc.Delete(r.Context(), id); err != nil {
        respondError(w, err)
        return
    }

    // Audit log must succeed even if client disconnects
    auditCtx := context.WithoutCancel(r.Context()) // keeps values, ignores cancel
    go h.audit.Log(auditCtx, AuditEvent{
        Action: "delete",
        UserID: UserIDFromContext(r.Context()),
    })

    respondOK(w)
}

// Cleanup after response — needs its own timeout
func (s *Service) Process(ctx context.Context) error {
    result, err := s.doWork(ctx)
    if err != nil {
        return err
    }

    // Cleanup with independent timeout
    cleanupCtx := context.WithoutCancel(ctx)
    cleanupCtx, cancel := context.WithTimeout(cleanupCtx, 5*time.Second)
    defer cancel()
    s.cleanup(cleanupCtx, result)

    return nil
}
```

## Anti-Patterns

### Storing Context in Structs

```go
// WRONG — context should flow through function calls, not be stored
type Service struct {
    ctx context.Context // BAD: stale context, can't be per-request
}

// CORRECT — context as first parameter
func (s *Service) Process(ctx context.Context, data Data) error {
    // ctx is per-request, fresh
}
```

### Using context.Background() Deep in Call Stack

```go
// WRONG — ignores caller's cancellation/deadline
func (r *Repo) Save(ctx context.Context, u *User) error {
    _, err := r.db.Exec(context.Background(), query, u.ID) // ignores ctx!
    return err
}

// CORRECT — propagate the received context
func (r *Repo) Save(ctx context.Context, u *User) error {
    _, err := r.db.Exec(ctx, query, u.ID) // respects caller's deadline
    return err
}
```

### Overloading Context Values

```go
// WRONG — passing dependencies through context
ctx = context.WithValue(ctx, "db", db)       // use DI instead
ctx = context.WithValue(ctx, "logger", log)   // use struct fields instead

// CORRECT — context values are for request-scoped data only
ctx = context.WithValue(ctx, requestIDKey, reqID) // request ID
ctx = context.WithValue(ctx, userIDKey, userID)    // authenticated user
ctx = context.WithValue(ctx, traceIDKey, traceID)  // distributed trace
```

## When to Use

Apply when reviewing context usage across function boundaries. Flag violations as:
- **CRITICAL**: Storing context in struct, using `context.Background()` deep in call stack, string context keys
- **WARNING**: Missing `defer cancel()`, no timeout on external calls, context values for dependencies
- **SUGGESTION**: Could use `WithoutCancel` for async cleanup, missing deadline check before expensive operation
