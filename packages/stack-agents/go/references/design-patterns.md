# Design Patterns

> Reference document for go-reviewer. Loaded on demand via Read tool.

## 1. Functional Options

The most idiomatic Go pattern for configurable constructors. Allows extensibility without breaking API.

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *slog.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        port:    8080,                    // sensible default
        timeout: 30 * time.Second,        // sensible default
        logger:  slog.Default(),          // sensible default
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
srv := NewServer("localhost",
    WithPort(9090),
    WithTimeout(10*time.Second),
)
```

## 2. Constructor Pattern

Always provide `NewX` functions. Return pointer for structs with internal state.

```go
func NewUserService(repo UserRepository, cache Cache) *UserService {
    return &UserService{
        repo:  repo,
        cache: cache,
    }
}
```

**Decision table — return type:**

| Condition | Return | Example |
|-----------|--------|---------|
| Has internal state / methods | `*T` | `NewServer() *Server` |
| Small, immutable value | `T` | `NewPoint(x, y int) Point` |
| May fail to construct | `(*T, error)` | `NewClient(cfg Config) (*Client, error)` |
| Interface implementation | Interface type | `NewLogger() Logger` |

## 3. Enums with iota

Always start with an Unknown/Invalid zero value to catch uninitialized fields.

```go
type Status int

const (
    StatusUnknown Status = iota // 0 — zero value catches bugs
    StatusActive                // 1
    StatusInactive              // 2
    StatusBanned                // 3
)

func (s Status) String() string {
    switch s {
    case StatusActive:
        return "active"
    case StatusInactive:
        return "inactive"
    case StatusBanned:
        return "banned"
    default:
        return "unknown"
    }
}

func (s Status) IsValid() bool {
    return s >= StatusActive && s <= StatusBanned
}
```

## 4. Builder Pattern

For constructing complex objects step by step. Less common in Go than functional options, but useful for immutable value objects.

```go
type QueryBuilder struct {
    table      string
    conditions []string
    args       []any
    limit      int
    offset     int
}

func NewQueryBuilder(table string) *QueryBuilder {
    return &QueryBuilder{table: table}
}

func (b *QueryBuilder) Where(cond string, args ...any) *QueryBuilder {
    b.conditions = append(b.conditions, cond)
    b.args = append(b.args, args...)
    return b
}

func (b *QueryBuilder) Limit(n int) *QueryBuilder {
    b.limit = n
    return b
}

func (b *QueryBuilder) Build() (string, []any) {
    q := "SELECT * FROM " + b.table
    if len(b.conditions) > 0 {
        q += " WHERE " + strings.Join(b.conditions, " AND ")
    }
    if b.limit > 0 {
        q += fmt.Sprintf(" LIMIT %d", b.limit)
    }
    return q, b.args
}
```

## 5. Dependency Injection (Interface-Based)

Define small interfaces at the consumer side. Inject concrete implementations via constructors.

```go
// Consumer defines what it needs (not the provider)
type UserFinder interface {
    FindByID(ctx context.Context, id int64) (*User, error)
}

type NotificationSender interface {
    Send(ctx context.Context, userID int64, msg string) error
}

type OrderService struct {
    users   UserFinder
    notify  NotificationSender
}

func NewOrderService(users UserFinder, notify NotificationSender) *OrderService {
    return &OrderService{users: users, notify: notify}
}
```

## 6. Factory Functions

Return different implementations behind an interface based on configuration.

```go
func NewCache(cfg Config) (Cache, error) {
    switch cfg.Type {
    case "redis":
        return NewRedisCache(cfg.RedisURL)
    case "memory":
        return NewMemoryCache(cfg.MaxSize)
    case "noop":
        return NoopCache{}, nil
    default:
        return nil, fmt.Errorf("unknown cache type: %s", cfg.Type)
    }
}
```

## 7. Singleton (sync.Once)

Thread-safe lazy initialization. Use sparingly — prefer dependency injection.

```go
var (
    defaultClient *Client
    clientOnce    sync.Once
)

func DefaultClient() *Client {
    clientOnce.Do(func() {
        defaultClient = &Client{
            http:    &http.Client{Timeout: 30 * time.Second},
            baseURL: "https://api.example.com",
        }
    })
    return defaultClient
}
```

## 8. Composition Over Inheritance

Go has no inheritance. Use struct embedding for code reuse and interface embedding for contract composition.

```go
// Struct embedding — reuse behavior
type BaseRepository struct {
    db *pgxpool.Pool
}

func (r *BaseRepository) Health(ctx context.Context) error {
    return r.db.Ping(ctx)
}

type UserRepository struct {
    BaseRepository // embeds Health() and db field
}

// Interface embedding — compose contracts
type ReadWriter interface {
    Reader
    Writer
}
```

## 9. Accept Interfaces, Return Structs

Functions should accept interfaces (flexibility) and return concrete types (clarity).

```go
// CORRECT
func NewService(repo UserRepository) *Service { // accepts interface, returns struct
    return &Service{repo: repo}
}

// WRONG
func NewService(repo *PostgresRepo) ServiceInterface { // accepts struct, returns interface
    return &Service{repo: repo}
}
```

## 10. Table-Driven Logic

Replace complex switch/if chains with a lookup table.

```go
var statusTransitions = map[Status][]Status{
    StatusDraft:     {StatusPending},
    StatusPending:   {StatusApproved, StatusRejected},
    StatusApproved:  {StatusPublished},
    StatusRejected:  {StatusDraft},
    StatusPublished: {StatusArchived},
}

func (s Status) CanTransitionTo(target Status) bool {
    allowed, ok := statusTransitions[s]
    if !ok {
        return false
    }
    return slices.Contains(allowed, target)
}
```

## 11. Errors as Values

Errors are values that can be inspected, wrapped, and composed. Never use panics for control flow.

```go
type ValidationError struct {
    Fields map[string]string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed: %d fields", len(e.Fields))
}

func (e *ValidationError) HasField(name string) bool {
    _, ok := e.Fields[name]
    return ok
}
```

## 12. Nil-Safe Methods

Design methods that handle nil receivers gracefully.

```go
type User struct {
    Name string
}

func (u *User) DisplayName() string {
    if u == nil {
        return "anonymous"
    }
    if u.Name == "" {
        return "unnamed"
    }
    return u.Name
}
```

## 13. Sentinel Values

Package-level values used as signals. Always check with `errors.Is`.

```go
var (
    ErrNotFound    = errors.New("not found")
    ErrConflict    = errors.New("conflict")
    ErrForbidden   = errors.New("forbidden")
)

// Check
if errors.Is(err, ErrNotFound) {
    // handle not found
}
```

## 14. Guard Clauses

Validate preconditions at function entry before proceeding to logic.

```go
func Transfer(ctx context.Context, from, to *Account, amount decimal.Decimal) error {
    if from == nil || to == nil {
        return ErrInvalidInput
    }
    if amount.IsNegative() || amount.IsZero() {
        return ErrInvalidAmount
    }
    if from.ID == to.ID {
        return ErrSameAccount
    }
    if from.Balance.LessThan(amount) {
        return ErrInsufficientFunds
    }

    // proceed with transfer logic
    from.Balance = from.Balance.Sub(amount)
    to.Balance = to.Balance.Add(amount)
    return nil
}
```

## 15. Configuration with Defaults

Provide usable defaults, allow override. Combine with functional options or config structs.

```go
type Config struct {
    Host         string        `env:"HOST" default:"localhost"`
    Port         int           `env:"PORT" default:"8080"`
    ReadTimeout  time.Duration `env:"READ_TIMEOUT" default:"5s"`
    WriteTimeout time.Duration `env:"WRITE_TIMEOUT" default:"10s"`
    MaxBodySize  int64         `env:"MAX_BODY_SIZE" default:"1048576"` // 1MB
}

func DefaultConfig() Config {
    return Config{
        Host:         "localhost",
        Port:         8080,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        MaxBodySize:  1 << 20, // 1MB
    }
}
```

## 16. Middleware Pattern

Wrap handlers with cross-cutting concerns. Chain middlewares in order.

```go
type Middleware func(http.Handler) http.Handler

func WithLogging(logger *slog.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            next.ServeHTTP(w, r)
            logger.Info("request",
                "method", r.Method,
                "path", r.URL.Path,
                "duration", time.Since(start),
            )
        })
    }
}

func Chain(h http.Handler, mws ...Middleware) http.Handler {
    for i := len(mws) - 1; i >= 0; i-- {
        h = mws[i](h)
    }
    return h
}
```

## When to Use

Apply when reviewing Go code architecture and API design. Flag violations as:
- **CRITICAL**: Panic for control flow, global mutable state without sync, inheritance simulation
- **WARNING**: Missing functional options for 5+ config params, large interfaces, deeply nested logic
- **SUGGESTION**: Could use table-driven logic, nil-unsafe methods, missing guard clauses
