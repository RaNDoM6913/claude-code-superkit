# Structs and Interfaces

> Reference document for go-reviewer. Loaded on demand via Read tool.

## Interface Design Principles

### Small Interfaces (1-3 methods)

The larger the interface, the weaker the abstraction. Prefer many small interfaces over few large ones.

```go
// EXCELLENT — single method, maximum flexibility
type Reader interface {
    Read(p []byte) (n int, err error)
}

// GOOD — 2-3 methods, clear contract
type UserStore interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    Save(ctx context.Context, user *User) error
}

// BAD — too large, violates ISP
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindAll(ctx context.Context, filter Filter) ([]*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int64) error
    Count(ctx context.Context, filter Filter) (int64, error)
    Exists(ctx context.Context, id int64) (bool, error)
}
// Split into: UserFinder, UserWriter, UserCounter
```

### Consumer-Side Interfaces

Define interfaces where they are **used**, not where they are implemented. This is the opposite of Java/C#.

```go
// package notification — CONSUMER defines what it needs
type UserFinder interface {
    FindByID(ctx context.Context, id int64) (*User, error)
}

type Service struct {
    users UserFinder // accepts any type with FindByID
}

// package user — PROVIDER just implements methods
type Repository struct {
    db *pgxpool.Pool
}

func (r *Repository) FindByID(ctx context.Context, id int64) (*User, error) { ... }
func (r *Repository) FindAll(ctx context.Context) ([]*User, error) { ... }
func (r *Repository) Save(ctx context.Context, u *User) error { ... }
// Satisfies notification.UserFinder implicitly — no "implements" keyword
```

### Implicit Satisfaction

Go interfaces are satisfied implicitly. No `implements` keyword. A type satisfies an interface if it has all the methods.

```go
// Compile-time interface check (zero-cost)
var _ UserFinder = (*Repository)(nil)
var _ io.ReadCloser = (*MyReader)(nil)
```

## Composition via Embedding

### Struct Embedding

Embeds fields and methods. The embedded type's methods are promoted to the outer type.

```go
type BaseEntity struct {
    ID        int64     `json:"id" db:"id"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type User struct {
    BaseEntity             // promotes ID, CreatedAt, UpdatedAt
    Name       string      `json:"name" db:"name"`
    Email      string      `json:"email" db:"email"`
}

// Access promoted fields directly
u := User{Name: "Alice"}
u.ID = 42          // from BaseEntity
u.CreatedAt = now   // from BaseEntity
```

**Embedding pitfalls:**

```go
// PITFALL 1 — Embedding a mutex exposes Lock/Unlock
type SafeCounter struct {
    sync.Mutex // BAD: Lock() and Unlock() are exported
    count int
}

// CORRECT — use named field
type SafeCounter struct {
    mu    sync.Mutex // unexported, not promoted
    count int
}

// PITFALL 2 — Embedding for convenience, not "is-a"
type Server struct {
    *http.Server // Promotes ALL http.Server methods — is that intended?
}
```

### Interface Embedding

Compose larger interfaces from smaller ones.

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

type ReadWriter interface {
    Reader
    Writer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

## Type Assertions and Type Switches

### Prefer errors.As Over Type Assertion

```go
// WRONG — breaks on wrapped errors
if verr, ok := err.(*ValidationError); ok {
    // won't match if err was wrapped with fmt.Errorf("%w", ...)
}

// CORRECT — traverses the error chain
var verr *ValidationError
if errors.As(err, &verr) {
    log.Warn("validation failed", "fields", verr.Fields)
}
```

### Type Switch

```go
func describe(v any) string {
    switch t := v.(type) {
    case string:
        return fmt.Sprintf("string of length %d", len(t))
    case int:
        return fmt.Sprintf("integer %d", t)
    case []byte:
        return fmt.Sprintf("bytes of length %d", len(t))
    case nil:
        return "nil"
    case error:
        return fmt.Sprintf("error: %s", t.Error())
    default:
        return fmt.Sprintf("unknown type %T", t)
    }
}
```

## noCopy Pattern

Prevent accidental copying of types that must not be copied (types with internal pointers to themselves, sync primitives).

```go
// noCopy is detected by go vet
type noCopy struct{}
func (*noCopy) Lock()   {}
func (*noCopy) Unlock() {}

type Pool struct {
    noCopy noCopy // go vet warns on copy of Pool
    mu     sync.Mutex
    items  []Item
}
```

## Method Sets

The method set determines which interfaces a type satisfies.

| Receiver type | Method set includes |
|---------------|-------------------|
| Value `T` | Only value receiver methods |
| Pointer `*T` | Both value AND pointer receiver methods |

```go
type Counter struct {
    n int
}

func (c Counter) Value() int  { return c.n } // value receiver
func (c *Counter) Inc()       { c.n++ }       // pointer receiver

type Valuer interface {
    Value() int
}

type Incrementer interface {
    Inc()
}

var _ Valuer = Counter{}       // OK: value has Value()
var _ Valuer = &Counter{}      // OK: pointer has Value()
var _ Incrementer = &Counter{} // OK: pointer has Inc()
// var _ Incrementer = Counter{} // COMPILE ERROR: value doesn't have Inc()
```

**Decision table — value vs pointer receiver:**

| Condition | Receiver | Why |
|-----------|----------|-----|
| Method mutates state | `*T` | Must modify the actual instance |
| Large struct (> 64 bytes) | `*T` | Avoid copy overhead |
| Consistency (other methods use `*T`) | `*T` | All methods should use same receiver |
| Small, immutable type | `T` | Value semantics, safe for concurrent use |
| Needs to work in map keys | `T` | Values can be map keys |

**Rule: Don't mix receivers.** If any method uses pointer receiver, all methods should use pointer receiver.

## Zero Value Design

Design structs so their zero value is immediately usable without initialization.

```go
// GOOD — zero value is usable
type Buffer struct {
    data []byte // nil slice: append works on nil
}

func (b *Buffer) Write(p []byte) {
    b.data = append(b.data, p...) // works even when b.data is nil
}

// GOOD — sync.Mutex zero value is an unlocked mutex
type SafeMap struct {
    mu sync.Mutex       // zero value: unlocked, ready to use
    m  map[string]int   // nil: must lazy-init on first write
}

func (sm *SafeMap) Set(key string, value int) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    if sm.m == nil {
        sm.m = make(map[string]int)
    }
    sm.m[key] = value
}
```

## Struct Tags

| Tag | Package | Purpose | Example |
|-----|---------|---------|---------|
| `json` | encoding/json | JSON field name, omit rules | `json:"name,omitempty"` |
| `db` | sqlx, pgx | DB column name | `db:"user_id"` |
| `validate` | go-playground/validator | Validation rules | `validate:"required,email"` |
| `env` | caarlos0/env | Environment variable | `env:"PORT" envDefault:"8080"` |
| `mapstructure` | mitchellh/mapstructure | Config decoding | `mapstructure:"server_port"` |

```go
type User struct {
    ID        int64     `json:"id" db:"id"`
    Name      string    `json:"name" db:"name" validate:"required,min=1,max=100"`
    Email     string    `json:"email" db:"email" validate:"required,email"`
    Password  string    `json:"-" db:"password_hash"` // json:"-" hides from JSON
    IsActive  bool      `json:"is_active" db:"is_active"`
    Role      Role      `json:"role,omitempty" db:"role"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"` // nullable
}
```

**Go 1.24+ omitzero tag:**

```go
type Event struct {
    Name      string    `json:"name"`
    Timestamp time.Time `json:"timestamp,omitzero"` // omit if zero value
}
```

## When to Use

Apply when reviewing struct definitions, interface design, and type system usage. Flag violations as:
- **CRITICAL**: Mixing value/pointer receivers, exposing embedded mutex, large interfaces (6+ methods)
- **WARNING**: Provider-side interface definitions, missing compile-time checks, embedded type for convenience
- **SUGGESTION**: Zero value not usable, missing struct tags, type assertion instead of errors.As
