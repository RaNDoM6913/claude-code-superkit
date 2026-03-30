# Error Creation

> Reference document for go-error-reviewer. Loaded on demand via Read tool.

## Sentinel Errors

Package-level variables representing specific error conditions. Always defined with `errors.New`.

```go
package user

import "errors"

var (
    ErrNotFound      = errors.New("user not found")
    ErrAlreadyExists = errors.New("user already exists")
    ErrInvalidInput  = errors.New("invalid input")
    ErrForbidden     = errors.New("forbidden")
    ErrInactive      = errors.New("user is inactive")
)
```

**Naming rules:**
- Prefix with `Err`
- Exported (capital E) if used outside package
- Descriptive but concise: `ErrNotFound` not `ErrTheUserWasNotFound`
- Message: lowercase, no punctuation, no "failed to" prefix

**When to use sentinels:**
- Caller needs to check for specific condition with `errors.Is`
- Condition is a well-known domain concept
- No additional context needed beyond "this happened"

## Custom Error Types

Implement the `error` interface when errors carry structured data.

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s — %s", e.Field, e.Message)
}

// Usage
func ValidateEmail(email string) error {
    if !strings.Contains(email, "@") {
        return &ValidationError{
            Field:   "email",
            Message: "must contain @",
        }
    }
    return nil
}

// Caller inspects with errors.As
var verr *ValidationError
if errors.As(err, &verr) {
    log.Warn("field failed validation",
        "field", verr.Field,
        "message", verr.Message,
    )
}
```

### Multi-Field Validation Error

```go
type ValidationErrors struct {
    Errors []ValidationError
}

func (e *ValidationErrors) Error() string {
    msgs := make([]string, len(e.Errors))
    for i, ve := range e.Errors {
        msgs[i] = ve.Error()
    }
    return strings.Join(msgs, "; ")
}

func (e *ValidationErrors) HasErrors() bool {
    return len(e.Errors) > 0
}

func (e *ValidationErrors) Add(field, message string) {
    e.Errors = append(e.Errors, ValidationError{Field: field, Message: message})
}
```

### Rich Domain Error

```go
type DomainError struct {
    Code    string // machine-readable: "USER_NOT_FOUND"
    Message string // human-readable
    Err     error  // wrapped cause
}

func (e *DomainError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
    }
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *DomainError) Unwrap() error {
    return e.Err
}
```

## errors.Join (Go 1.20+)

Combine multiple errors into one. Useful for batch operations and multi-step validation.

```go
func ValidateUser(u *User) error {
    var errs []error

    if u.Name == "" {
        errs = append(errs, fmt.Errorf("name is required"))
    }
    if u.Email == "" {
        errs = append(errs, fmt.Errorf("email is required"))
    }
    if u.Age < 0 {
        errs = append(errs, fmt.Errorf("age must be non-negative"))
    }

    return errors.Join(errs...) // nil if errs is empty
}

// Batch operation
func DeleteUsers(ctx context.Context, ids []int64) error {
    var errs []error
    for _, id := range ids {
        if err := deleteUser(ctx, id); err != nil {
            errs = append(errs, fmt.Errorf("delete user %d: %w", id, err))
        }
    }
    return errors.Join(errs...)
}
```

**Key behavior of errors.Join:**
- Returns `nil` if all errors are nil or the slice is empty
- The joined error's `Error()` joins messages with `\n`
- `errors.Is` and `errors.As` check **all** contained errors

## Error Message Format

| Rule | Good | Bad |
|------|------|-----|
| Lowercase start | `"user not found"` | `"User not found"` |
| No trailing punctuation | `"invalid email"` | `"invalid email."` |
| No "failed to" prefix | `"parse config: %w"` | `"failed to parse config: %w"` |
| Context: noun + verb | `"user.Save: %w"` | `"%w"` (no context) |
| No redundant wrapping | wrap once per boundary | double-wrapping same context |

```go
// CORRECT message format
return fmt.Errorf("user not found: id=%d", id)
return fmt.Errorf("parse config: %w", err)
return fmt.Errorf("UserService.Create: %w", err)

// WRONG
return fmt.Errorf("Failed to find user: %w", err)   // capital, "failed to"
return fmt.Errorf("error finding user: %w.", err)    // "error", punctuation
return errors.New("An error occurred")               // vague, capital
```

## Wrapping vs Creating

**Decision table:**

| Situation | Action | Example |
|-----------|--------|---------|
| Propagating from lower layer | Wrap with `%w` | `fmt.Errorf("Repo.Save: %w", err)` |
| New condition detected | Create new error | `return ErrInvalidInput` |
| Adding context to sentinel | Wrap the sentinel | `fmt.Errorf("email field: %w", ErrInvalidInput)` |
| Multiple errors accumulated | Join | `errors.Join(errs...)` |
| Error should not be inspected by caller | Use `%v` | `fmt.Errorf("internal: %v", err)` |

## Domain Error Vocabulary

Standard set of domain errors every service should define:

```go
package domain

var (
    // Resource errors
    ErrNotFound      = errors.New("not found")
    ErrAlreadyExists = errors.New("already exists")
    ErrConflict      = errors.New("conflict")          // optimistic lock, version mismatch

    // Input errors
    ErrInvalidInput  = errors.New("invalid input")
    ErrMissingField  = errors.New("missing required field")

    // Auth errors
    ErrUnauthorized  = errors.New("unauthorized")      // not authenticated
    ErrForbidden     = errors.New("forbidden")          // authenticated but not allowed

    // State errors
    ErrInactive      = errors.New("inactive")
    ErrExpired       = errors.New("expired")
    ErrRateLimited   = errors.New("rate limited")

    // System errors
    ErrTimeout       = errors.New("timeout")
    ErrUnavailable   = errors.New("service unavailable")
)
```

### Mapping Domain Errors to HTTP Status

```go
func DomainErrorToHTTPStatus(err error) int {
    switch {
    case errors.Is(err, domain.ErrNotFound):
        return http.StatusNotFound
    case errors.Is(err, domain.ErrAlreadyExists):
        return http.StatusConflict
    case errors.Is(err, domain.ErrConflict):
        return http.StatusConflict
    case errors.Is(err, domain.ErrInvalidInput),
         errors.Is(err, domain.ErrMissingField):
        return http.StatusBadRequest
    case errors.Is(err, domain.ErrUnauthorized):
        return http.StatusUnauthorized
    case errors.Is(err, domain.ErrForbidden):
        return http.StatusForbidden
    case errors.Is(err, domain.ErrRateLimited):
        return http.StatusTooManyRequests
    case errors.Is(err, domain.ErrTimeout):
        return http.StatusGatewayTimeout
    default:
        return http.StatusInternalServerError
    }
}
```

## When to Use

Apply when reviewing error definitions and creation patterns. Flag violations as:
- **CRITICAL**: Sentinel errors defined with `fmt.Errorf` (not wrappable), error messages starting with capital letters in chains
- **WARNING**: Missing domain error vocabulary, creating errors inline instead of sentinels for repeated conditions
- **SUGGESTION**: Could use `errors.Join` for batch operations, missing structured error type for validation
