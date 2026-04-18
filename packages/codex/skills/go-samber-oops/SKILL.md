---
name: go-samber-oops
description: samber/oops structured errors knowledge — attributes (Code/In/With/Hint/Owner/Public), stack traces, APM serialization, HTTP boundary safety, errors.Is/As compatibility. Activate when Go code imports `github.com/samber/oops`, or when user asks about structured Go errors, error codes, or APM error context.
user-invocable: false
---

# samber/oops — Structured Errors

Upstream: https://github.com/samber/oops

## What Stdlib Doesn't Give You

`fmt.Errorf("ctx: %w", err)` gives you: a message, an unwrap chain. That's it. It does NOT give: stack traces, domain codes, request IDs, user-facing hints, owner/team routing, key-value context. `oops` adds those via a builder API, staying compatible with `errors.Is` / `errors.As`.

## Core API

```go
import "github.com/samber/oops"

// Create
err := oops.
    Code("USER_NOT_FOUND").
    In("UserService.FindByID").
    With("user_id", userID).
    Errorf("user %d not found", userID)

// Wrap — add attributes to existing error
err := oops.
    In("OrderService.Create").
    With("order_id", orderID).
    Wrap(repoErr)

// Wrap with a fresh message
err := oops.Trace(traceID).Wrapf(repoErr, "could not persist order %d", orderID)
```

Builder methods return `OopsErrorBuilder`; call `Errorf` / `Wrap` / `Wrapf` / `New` last.

## Attributes

| Method | Purpose | APM field |
|--------|---------|-----------|
| `.Code("X")` | Stable domain key | `error.code` |
| `.In("pkg.Service.Method")` | Subsystem | `error.domain` |
| `.Tags("auth", "critical")` | Free-form labels | `error.tags` |
| `.With("key", v)` | Structured context | `error.context.*` |
| `.User(id, "email", x)` | User identity | `user.*` |
| `.Tenant(id, ...)` | Tenant identity | `tenant.*` |
| `.Request(req)` | HTTP request capture | `http.*` |
| `.Trace(traceID)` | Tracing correlation | `trace.id` |
| `.Hint("...")` | Operator remediation | `error.hint` |
| `.Public("...")` | User-safe HTTP body | `error.public_message` |
| `.Owner("team")` | Alert routing | `error.owner` |
| `.Duration(d)` | Op duration | `error.duration_ms` |

## Stack Traces

Captured automatically at the first `Errorf`/`Wrap`/`Wrapf`/`New` in a chain — not at every wrap. Depth cap: `oops.StackTraceMaxDepth` (default 10). Set to 0 to disable on hot paths.

## Extraction for Logging / APM

```go
import (
    "errors"
    "log/slog"
    "github.com/samber/oops"
)

func logError(err error) {
    var oe oops.OopsError
    if errors.As(err, &oe) {
        slog.Error("operation failed",
            "code", oe.Code(),
            "domain", oe.Domain(),
            "tags", oe.Tags(),
            "context", oe.Context(),
            "hint", oe.Hint(),
            "owner", oe.Owner(),
            "user", oe.User(),
            "trace_id", oe.Trace(),
            "stacktrace", oe.Stacktrace(),
            "error", err,
        )
        return
    }
    slog.Error("operation failed", "error", err)
}

// Or: slog.Error("failed", slog.Any("error", oops.ToMap(err)))
```

`oops.ToMap(err)` walks the full chain, merges attributes. Innermost wins on key collision — keep keys unique anyway.

## HTTP Boundary: Public vs Private

Never expose internal messages over HTTP. Attach a user-facing string via `.Public`:

```go
err := oops.
    Code("RATE_LIMIT").
    Public("Too many requests. Try again in a minute.").
    With("ip", clientIP).
    New("rate limit hit: %d req/min from %s", count, clientIP)

// Middleware:
var oe oops.OopsError
if errors.As(err, &oe) {
    http.Error(w, oe.Public(), http.StatusTooManyRequests)
    logError(err) // internal detail stays internal
    return
}
http.Error(w, "Internal Server Error", http.StatusInternalServerError)
```

## errors.Is / errors.As Compatibility

`oops.Wrap` preserves the chain:

```go
sentinel := errors.New("not found")
err := oops.Code("USER_NOT_FOUND").Wrap(sentinel)

errors.Is(err, sentinel)          // true
errors.As(err, &oops.OopsError{}) // true
```

Match on `Code` for domain logic; `errors.Is` for sentinel identity. Never match on message text.

```go
if oops.GetCode(err) == "USER_NOT_FOUND" { return http.StatusNotFound }
if errors.Is(err, domain.ErrNotFound)    { return http.StatusNotFound }
```

## Comparison

| Feature | stdlib | pkg/errors | samber/oops |
|---------|--------|------------|-------------|
| Wrap + message | `fmt.Errorf %w` | `errors.Wrap` | `.Wrapf` |
| Stack trace | No | Yes | Yes (configurable) |
| Structured context | No | No | Yes |
| Domain code | Sentinels | Sentinels | Yes |
| User-safe message | Manual | Manual | Yes |
| APM-shape serialization | Manual | Manual | `oops.ToMap` |
| Status | Stdlib | Archived | Active |

`pkg/errors` is archived — use stdlib or oops, not pkg/errors.

## When NOT to Use oops

- Library code with a public API (don't force dep on consumers)
- Small internal tools (stdlib `fmt.Errorf` is enough)
- Hot loops (builder allocates; benchmark first)
- When sentinel + `errors.Is` is cleaner

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wrapping an oops error with oops again | Duplicate stacks, attr shadowing | Wrap once at deepest point |
| Forgetting a terminator | Chain leaks `*OopsErrorBuilder` as return | Always end with Errorf/Wrap/New |
| `.Public()` missing | Internal detail leaked over HTTP | Default-deny at HTTP boundary |
| Expecting `errors.Is` to match `Code` | Code is not a sentinel | Use `oops.GetCode(err)` |
| Relying on stack trace across wire | Stacks don't survive JSON | Log at origin |

## Review Checklist

Flag:

- **CRITICAL** — Internal error returned to HTTP without `.Public()` (info leak)
- **CRITICAL** — Dynamic `.With(userInput, ...)` key (APM cardinality explosion)
- **WARNING** — `oops` used in library code with an exported API
- **WARNING** — Double-wrapping at every layer
- **WARNING** — `.Code` values not centralized (string drift)
- **SUGGESTION** — Consider `.Owner("team")` for multi-team alert routing
