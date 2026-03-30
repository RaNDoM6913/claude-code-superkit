# Error Wrapping

> Reference document for go-error-reviewer. Loaded on demand via Read tool.

## The fmt.Errorf %w Pattern

The primary mechanism for adding context to errors while preserving the error chain.

```go
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    row := r.db.QueryRow(ctx, "SELECT ... WHERE id = $1", id)
    var u User
    if err := row.Scan(&u.ID, &u.Name, &u.Email); err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("UserRepository.FindByID: %w", domain.ErrNotFound)
        }
        return nil, fmt.Errorf("UserRepository.FindByID: %w", err)
    }
    return &u, nil
}
```

## Wrapping Depth Rule

**One wrap per function boundary.** Each function that propagates an error adds exactly one layer of context.

```go
// Repository layer
func (r *Repo) Save(ctx context.Context, u *User) error {
    _, err := r.db.Exec(ctx, query, u.ID, u.Name)
    if err != nil {
        return fmt.Errorf("Repo.Save: %w", err) // ONE wrap
    }
    return nil
}

// Service layer
func (s *Service) CreateUser(ctx context.Context, u *User) error {
    if err := s.repo.Save(ctx, u); err != nil {
        return fmt.Errorf("Service.CreateUser: %w", err) // ONE wrap
    }
    return nil
}

// Handler layer
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    if err := h.svc.CreateUser(r.Context(), user); err != nil {
        // Log the full chain, respond with appropriate status
        h.logger.Error("create user failed", "error", err)
        // err message: "Service.CreateUser: Repo.Save: connection refused"
    }
}
```

## Context Format

The standard wrapping format is `TypeName.MethodName: %w`.

```go
// CORRECT — clear provenance
return fmt.Errorf("UserRepository.FindByID: %w", err)
return fmt.Errorf("OrderService.PlaceOrder: %w", err)
return fmt.Errorf("AuthMiddleware.Validate: %w", err)

// ALSO ACCEPTABLE — shorter, for internal helpers
return fmt.Errorf("findByID: %w", err)
return fmt.Errorf("validate email: %w", err)

// WRONG — redundant "error" / "failed"
return fmt.Errorf("error in UserRepository.FindByID: %w", err) // "error" redundant
return fmt.Errorf("failed to find user by ID: %w", err)        // "failed to" noise
return fmt.Errorf("UserRepository: FindByID: %w", err)         // use dot, not colon

// WRONG — no context at all
return fmt.Errorf("%w", err) // pointless wrap, just return err
return err                    // OK if same package, no context needed
```

## When to Wrap vs Return As-Is

**Decision table:**

| Situation | Action | Why |
|-----------|--------|-----|
| Crossing package boundary | Wrap | Caller needs to know where error originated |
| Crossing layer boundary (repo→service) | Wrap | Each layer adds its context |
| Within same package, different func | Optional | Wrap if func name adds useful context |
| Within same function, sequential ops | Don't re-wrap | Already at the right context level |
| Returning sentinel directly | Don't wrap | `return ErrNotFound` is clear enough |
| Returning sentinel with context | Wrap | `fmt.Errorf("user %d: %w", id, ErrNotFound)` |

```go
// SAME PACKAGE — wrapping is optional
func (s *Service) process(ctx context.Context, data []byte) error {
    parsed, err := s.parse(data)
    if err != nil {
        return err // same package, parse already has context
    }
    return s.store(ctx, parsed)
}

// CROSSING BOUNDARY — always wrap
func (h *Handler) Process(w http.ResponseWriter, r *http.Request) {
    if err := h.svc.Process(r.Context(), body); err != nil {
        return fmt.Errorf("Handler.Process: %w", err)
    }
}
```

## Chain Inspection

### errors.Unwrap

Manually traverses one level of the error chain.

```go
err := fmt.Errorf("outer: %w", fmt.Errorf("inner: %w", io.EOF))

unwrapped := errors.Unwrap(err)
// unwrapped.Error() == "inner: end of file"

unwrapped2 := errors.Unwrap(unwrapped)
// unwrapped2 == io.EOF
```

### Multi-Error Unwrap (Go 1.20+)

Errors created with `errors.Join` implement `Unwrap() []error`.

```go
err := errors.Join(
    fmt.Errorf("step 1: %w", ErrNotFound),
    fmt.Errorf("step 2: %w", ErrTimeout),
)

// errors.Is checks ALL errors in the tree
errors.Is(err, ErrNotFound) // true
errors.Is(err, ErrTimeout)  // true

// Custom multi-error
type MultiError struct {
    Errors []error
}

func (e *MultiError) Error() string { ... }

func (e *MultiError) Unwrap() []error {
    return e.Errors
}
```

## %w vs %v

| Verb | Chain preserved? | Caller can inspect? | Use when |
|------|-----------------|--------------------|----|
| `%w` | Yes | Yes — `errors.Is`/`errors.As` work | Default choice — expose error chain |
| `%v` | No | No — chain is broken | Intentionally hiding implementation details |

```go
// %w — preserves chain (default choice)
return fmt.Errorf("UserService.Create: %w", err)
// Caller can: errors.Is(err, pgx.ErrNoRows) → true

// %v — breaks chain (intentional hiding)
return fmt.Errorf("external API error: %v", err)
// Caller cannot inspect the original error
// Use when: internal implementation detail should not leak
```

**When to use %v (break chain):**
- External API errors that should be opaque to callers
- Implementation details that may change (DB driver errors in a service layer)
- Security-sensitive errors (don't expose internal error messages to HTTP responses)

## Anti-Patterns

### Double Wrapping

```go
// WRONG — redundant context
func (s *Service) Get(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("Service.Get: failed to get user: %w", err)
        //                      ^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
        //                      context     redundant "failed to get user"
    }
    return user, nil
}

// CORRECT
return nil, fmt.Errorf("Service.Get: %w", err)
```

### Wrapping Then Checking

```go
// WRONG — wrap then check loses the type info
wrapped := fmt.Errorf("context: %w", err)
if wrapped == ErrNotFound { // always false for wrapped errors
    // ...
}

// CORRECT — check before wrapping, or use errors.Is on wrapped
if errors.Is(err, ErrNotFound) {
    return nil, fmt.Errorf("Service.Get: %w", domain.ErrNotFound)
}
return nil, fmt.Errorf("Service.Get: %w", err)
```

### String Comparison

```go
// WRONG — fragile, breaks on wrapping
if err.Error() == "not found" {
    // ...
}

// CORRECT
if errors.Is(err, ErrNotFound) {
    // ...
}
```

## When to Use

Apply when reviewing error propagation through function and package boundaries. Flag violations as:
- **CRITICAL**: Using `%v` where `%w` is needed (breaks caller inspection), comparing error strings
- **WARNING**: Missing context on wrap, double-wrapping with redundant messages, wrapping at every call within same function
- **SUGGESTION**: Could simplify by returning unwrapped within same package, inconsistent context format
