# Error Inspection

> Reference document for go-error-reviewer. Loaded on demand via Read tool.

## errors.Is — Match Sentinels Through Chain

Traverses the entire error chain (unwrapping recursively) to find a target error.

```go
// Setup
var ErrNotFound = errors.New("not found")

// Wrap several levels deep
err := fmt.Errorf("handler: %w",
    fmt.Errorf("service: %w",
        fmt.Errorf("repo: %w", ErrNotFound)))

// errors.Is traverses the full chain
errors.Is(err, ErrNotFound) // true
errors.Is(err, io.EOF)      // false
```

### Custom Is Method

Implement `Is(target error) bool` on your error type for custom matching logic.

```go
type HTTPError struct {
    StatusCode int
    Message    string
}

func (e *HTTPError) Error() string {
    return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

// Custom Is: match by status code family
func (e *HTTPError) Is(target error) bool {
    t, ok := target.(*HTTPError)
    if !ok {
        return false
    }
    // Match by status code family (4xx matches any 4xx)
    return e.StatusCode/100 == t.StatusCode/100
}

// Usage
err := &HTTPError{StatusCode: 404, Message: "user not found"}
target := &HTTPError{StatusCode: 400} // any 4xx
errors.Is(err, target) // true — same family
```

## errors.As — Extract Typed Errors

Finds the first error in the chain that matches the target type and sets the target pointer.

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s — %s", e.Field, e.Message)
}

// Wrap the typed error
err := fmt.Errorf("handler: %w",
    fmt.Errorf("service: %w",
        &ValidationError{Field: "email", Message: "invalid format"}))

// Extract through the chain
var verr *ValidationError
if errors.As(err, &verr) {
    fmt.Println(verr.Field)   // "email"
    fmt.Println(verr.Message) // "invalid format"
}
```

### Custom As Method

Implement `As(target any) bool` for custom extraction logic.

```go
type DomainError struct {
    Code    string
    Message string
    Cause   error
}

func (e *DomainError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *DomainError) Unwrap() error {
    return e.Cause
}

// Custom As: allow extracting as *DomainError even from subtypes
func (e *DomainError) As(target any) bool {
    if t, ok := target.(**DomainError); ok {
        *t = e
        return true
    }
    return false
}
```

## errors.AsType — Extract Typed Errors (Go 1.26+)

Generic form of `errors.As`: returns the extracted error and a bool instead of writing through a pointer. Same chain-traversal semantics — one fewer variable.

```go
// Extract through the chain (Go 1.26+)
if verr, ok := errors.AsType[*ValidationError](err); ok {
    fmt.Println(verr.Field)   // "email"
    fmt.Println(verr.Message) // "invalid format"
}
```

The signature is `func AsType[E error](err error) (E, bool)` — the type parameter is constrained to `error`, so `E` must itself be an error type. Prefer it over `errors.As` for the common single-extraction case: no `var target` declaration, no `&target`, and the result type is inferred at the call site.

Keep `errors.As` while you still compile against Go <1.26 (`AsType` didn't exist before), and when you already hold a pointer to write into.

## errors.Unwrap — Manual Traversal

Returns the next error in the chain. Rarely needed directly — prefer `errors.Is`/`errors.As`.

```go
err := fmt.Errorf("outer: %w", fmt.Errorf("inner: %w", io.EOF))

e1 := errors.Unwrap(err)    // "inner: EOF"
e2 := errors.Unwrap(e1)     // io.EOF
e3 := errors.Unwrap(e2)     // nil (end of chain)
```

## Multi-Error Inspection (Go 1.20+)

Errors from `errors.Join` or types implementing `Unwrap() []error` are traversed by `errors.Is` and `errors.As` across all branches.

```go
err := errors.Join(
    fmt.Errorf("validation: %w", ErrInvalidInput),
    fmt.Errorf("auth: %w", ErrUnauthorized),
    fmt.Errorf("rate: %w", ErrRateLimited),
)

// errors.Is checks ALL branches
errors.Is(err, ErrInvalidInput) // true
errors.Is(err, ErrUnauthorized) // true
errors.Is(err, ErrRateLimited)  // true
errors.Is(err, ErrNotFound)     // false

// errors.As also checks all branches
var verr *ValidationError
if errors.As(err, &verr) {
    // found first ValidationError in any branch
}
```

### Building Multi-Errors Incrementally

```go
type MultiError struct {
    errs []error
}

func (m *MultiError) Add(err error) {
    if err != nil {
        m.errs = append(m.errs, err)
    }
}

func (m *MultiError) Err() error {
    if len(m.errs) == 0 {
        return nil
    }
    return errors.Join(m.errs...)
}

// Usage
func processBatch(items []Item) error {
    var me MultiError
    for _, item := range items {
        me.Add(processOne(item))
    }
    return me.Err() // nil if no errors
}
```

## Migration from == to errors.Is

**Before (broken with wrapping):**
```go
// WRONG — breaks as soon as anyone wraps the error
if err == sql.ErrNoRows {
    return nil, ErrNotFound
}
if err == context.DeadlineExceeded {
    return nil, ErrTimeout
}
```

**After (works through any chain):**
```go
// CORRECT — works with any level of wrapping
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}
if errors.Is(err, context.DeadlineExceeded) {
    return nil, ErrTimeout
}
```

**Migration checklist:**

| Old Pattern | New Pattern |
|-------------|-------------|
| `err == ErrX` | `errors.Is(err, ErrX)` |
| `err != ErrX` | `!errors.Is(err, ErrX)` |
| `err.(*TypeX)` | `errors.As(err, &target)` |
| `errors.As(err, &target)` | `errors.AsType[T](err)` (Go 1.26+) |
| `switch err.(type)` | Sequential `errors.As` checks |
| `err == nil` | Keep as `err == nil` (no change needed) |

## Common Mistakes

### 1. Comparing Error Strings

```go
// WRONG — fragile, locale-dependent, breaks on wrapping
if err.Error() == "connection refused" {
    // retry
}
if strings.Contains(err.Error(), "timeout") {
    // retry
}

// CORRECT — use sentinel or type check
if errors.Is(err, syscall.ECONNREFUSED) {
    // retry
}
if errors.Is(err, context.DeadlineExceeded) {
    // retry
}
```

### 2. Type-Asserting Wrapped Errors

```go
// WRONG — fails when error is wrapped
if verr, ok := err.(*ValidationError); ok {
    // This won't match: fmt.Errorf("svc: %w", &ValidationError{...})
}

// CORRECT — traverses the chain
var verr *ValidationError
if errors.As(err, &verr) {
    // Always finds it, regardless of wrapping depth
}
```

### 3. Checking for nil After errors.As

```go
// WRONG — errors.As already confirms non-nil
var verr *ValidationError
if errors.As(err, &verr) {
    if verr != nil { // redundant — always true here
        // ...
    }
}

// CORRECT — verr is guaranteed non-nil inside the if
var verr *ValidationError
if errors.As(err, &verr) {
    log.Warn("validation", "field", verr.Field)
}
```

### 4. Wrong errors.As Target Type

```go
// WRONG — target must be pointer to the error type (or pointer-to-pointer)
var verr ValidationError // not a pointer!
if errors.As(err, &verr) { // compile error or unexpected behavior
}

// CORRECT — pointer to pointer for pointer-receiver error types
var verr *ValidationError
if errors.As(err, &verr) {
    // verr is *ValidationError
}
```

### 5. Ignoring Multi-Error Branches

```go
// WRONG — only checks first error
err := errors.Join(errA, errB, errC)
if errors.Unwrap(err) == errA { // only gets first

// CORRECT — errors.Is checks all branches
if errors.Is(err, errA) { // checks errA, errB, errC
```

## Comprehensive Error Handling Pattern

```go
func (h *Handler) HandleRequest(w http.ResponseWriter, r *http.Request) {
    result, err := h.svc.Process(r.Context(), input)
    if err != nil {
        // Check domain errors first (most specific)
        var verr *ValidationError
        if errors.As(err, &verr) {
            respondJSON(w, http.StatusBadRequest, ErrorResponse{
                Code:    "VALIDATION_ERROR",
                Message: verr.Error(),
                Field:   verr.Field,
            })
            return
        }

        // Check sentinels
        switch {
        case errors.Is(err, domain.ErrNotFound):
            respondJSON(w, http.StatusNotFound, ErrorResponse{Code: "NOT_FOUND"})
        case errors.Is(err, domain.ErrForbidden):
            respondJSON(w, http.StatusForbidden, ErrorResponse{Code: "FORBIDDEN"})
        case errors.Is(err, context.DeadlineExceeded):
            respondJSON(w, http.StatusGatewayTimeout, ErrorResponse{Code: "TIMEOUT"})
        default:
            h.logger.Error("unhandled error", "error", err)
            respondJSON(w, http.StatusInternalServerError, ErrorResponse{Code: "INTERNAL"})
        }
        return
    }

    respondJSON(w, http.StatusOK, result)
}
```

## When to Use

Apply when reviewing error checking and inspection patterns. Flag violations as:
- **CRITICAL**: Using `==` instead of `errors.Is` for sentinel comparison, type assertion instead of `errors.As` for wrapped errors
- **WARNING**: String comparison for error checking, ignoring multi-error semantics
- **SUGGESTION**: Could use custom Is/As methods, redundant nil checks after errors.As
