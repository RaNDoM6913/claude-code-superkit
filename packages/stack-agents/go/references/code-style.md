# Code Style

> Reference document for go-reviewer. Loaded on demand via Read tool.

## Formatting

`gofmt` is the canonical formatter. All Go code must be gofmt-compliant. There is no debate about brace placement, indentation, or spacing.

**Soft line length limit: ~100 characters.** Not enforced by gofmt, but improves readability. Break long lines at logical points (function arguments, method chains).

```go
// Long function signature — break after opening paren
func (s *UserService) CreateWithNotification(
    ctx context.Context,
    user *User,
    notifyChannels []NotifyChannel,
) (*User, error) {

// Long function call — break at arguments
result, err := s.repo.FindByFilters(
    ctx,
    WithStatus(StatusActive),
    WithRole(RoleAdmin),
    WithPagination(offset, limit),
)
```

## Variable Declarations

| Context | Use | Example |
|---------|-----|---------|
| Inside function, with value | Short form `:=` | `name := "alice"` |
| Inside function, zero value needed | `var` | `var count int` |
| Package-level | `var` (never `:=`) | `var defaultTimeout = 30 * time.Second` |
| Constants | `const` | `const maxRetries = 3` |
| Multiple related | Grouped `var()` or `const()` | See below |

```go
// Grouped declarations
var (
    ErrNotFound    = errors.New("not found")
    ErrForbidden   = errors.New("forbidden")
)

const (
    maxRetries   = 3
    retryBackoff = 100 * time.Millisecond
)

// Inside functions — prefer short form
func process(data []byte) error {
    result := parse(data)       // short form with value
    var accumulated []string    // zero value, will append
    count := 0                  // short form even for zero — when immediately used
}
```

## Control Flow

### Early Returns (Guard Clauses)

Always return early on error or invalid state. Never nest the happy path inside an `else`.

```go
// CORRECT — early return, flat happy path
func (s *Service) Process(ctx context.Context, id int64) (*Result, error) {
    if id <= 0 {
        return nil, ErrInvalidInput
    }

    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("Service.Process: %w", err)
    }

    if !user.IsActive() {
        return nil, ErrInactiveUser
    }

    return s.transform(user), nil
}

// WRONG — unnecessary nesting
func (s *Service) Process(ctx context.Context, id int64) (*Result, error) {
    if id > 0 {
        user, err := s.repo.FindByID(ctx, id)
        if err == nil {
            if user.IsActive() {
                return s.transform(user), nil
            } else {
                return nil, ErrInactiveUser
            }
        } else {
            return nil, fmt.Errorf("Service.Process: %w", err)
        }
    } else {
        return nil, ErrInvalidInput
    }
}
```

### No Else After Return

```go
// CORRECT
if err != nil {
    return err
}
// continue with happy path

// WRONG
if err != nil {
    return err
} else {
    // happy path inside else
}
```

### Switch Over If-Else Chains

```go
// CORRECT — switch for multiple conditions
switch {
case n < 0:
    return "negative"
case n == 0:
    return "zero"
case n < 100:
    return "small"
default:
    return "large"
}

// WRONG — long if-else chain
if n < 0 {
    return "negative"
} else if n == 0 {
    return "zero"
} else if n < 100 {
    return "small"
} else {
    return "large"
}
```

## Function Design

| Rule | Guideline |
|------|-----------|
| Length | < 50 lines (strongly prefer < 30) |
| Responsibility | Single — does one thing well |
| Parameters | < 5 (use options struct or functional options for more) |
| Return values | max 3 (typically value + error) |
| Named returns | Only for documentation or naked returns in short functions |
| `context.Context` | Always first parameter |
| `error` | Always last return value |

```go
// CORRECT — focused, short, clear
func (s *Service) Activate(ctx context.Context, userID int64) error {
    user, err := s.repo.FindByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("Service.Activate: %w", err)
    }

    if user.Status == StatusActive {
        return nil // already active, idempotent
    }

    user.Status = StatusActive
    user.ActivatedAt = time.Now()

    if err := s.repo.Update(ctx, user); err != nil {
        return fmt.Errorf("Service.Activate: %w", err)
    }

    s.events.Publish(ctx, UserActivated{UserID: userID})
    return nil
}
```

## Import Grouping

Three groups, separated by blank lines, in this order:

```go
import (
    // 1. Standard library
    "context"
    "fmt"
    "net/http"

    // 2. External packages
    "github.com/jackc/pgx/v5"
    "go.uber.org/zap"

    // 3. Internal packages
    "myapp/internal/domain"
    "myapp/internal/repository"
)
```

### Import Rules

| Rule | Detail |
|------|--------|
| Blank imports | Only in `main` or `_test.go` files: `_ "net/http/pprof"` |
| Dot imports | Never: `. "testing"` — makes code unreadable |
| Alias imports | Only for conflicts: `pgxpool "github.com/jackc/pgx/v5/pgxpool"` |
| Import ordering | Alphabetical within each group (goimports handles this) |

```go
// CORRECT — blank import in main for side effects
package main

import (
    "net/http"
    _ "net/http/pprof" // register pprof handlers
)

// WRONG — blank import in library code
package user

import (
    _ "github.com/lib/pq" // should be in main or init package
)
```

## Misc Style Rules

- **No naked returns** in functions longer than ~10 lines
- **Avoid `init()`** — makes testing and reasoning harder; prefer explicit initialization
- **Comments** — exported symbols must have doc comments starting with the name: `// Service handles user operations.`
- **TODO format** — `// TODO(username): description` with context on when/why
- **Magic numbers** — extract to named constants: `const maxPageSize = 100`

## When to Use

Apply these rules during any Go code review for style compliance. Flag violations as:
- **CRITICAL**: Missing error returns, deeply nested control flow (>3 levels)
- **WARNING**: Functions over 50 lines, missing doc comments on exports, else-after-return
- **SUGGESTION**: Line length over 100, unnamed constants, unnecessary named returns
