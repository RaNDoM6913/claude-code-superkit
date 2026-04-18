# samber/oops — Structured Errors with Stack Traces

> Reference document for go-reviewer, go-error-reviewer. Loaded on demand via Read tool.
> Upstream: https://github.com/samber/oops

## What Stdlib Errors Don't Give You

`errors.New` + `fmt.Errorf("ctx: %w", err)` get you:

- An error message
- An unwrap chain (`errors.Is` / `errors.As`)

That's it. You don't get: stack traces, domain codes, request IDs, user-facing hints, owner/team routing, or structured key-value context. Every observability backend (Sentry, Datadog, New Relic) wants those. `samber/oops` adds them via a builder API that composes with `errors.Is` and `errors.As` so you don't lose stdlib interop.

## Core API

```go
import "github.com/samber/oops"

// Create
err := oops.
    Code("USER_NOT_FOUND").
    In("UserService.FindByID").
    With("user_id", userID).
    Errorf("user %d not found", userID)

// Wrap — adds attributes to an existing error
err := oops.
    In("OrderService.Create").
    With("order_id", orderID).
    User(currentUser.ID, "email", currentUser.Email).
    Wrap(repoErr)

// Wrap with a fresh message
err := oops.
    Trace(traceID).
    Wrapf(repoErr, "could not persist order %d", orderID)
```

All builder methods return an `oops.OopsErrorBuilder` — chain freely, call `Errorf`/`Wrap`/`Wrapf`/`New` last.

## Attribute Methods (highlights)

| Method | Purpose | APM field it usually maps to |
|--------|---------|-----------------------------|
| `.Code("USER_NOT_FOUND")` | Stable machine-readable error key | `error.code` |
| `.In("pkg.Service.Method")` | Domain / subsystem the error came from | `error.domain` |
| `.Tags("auth", "critical")` | Free-form labels | `error.tags` |
| `.With("key", value)` | Arbitrary structured context | `error.context.*` |
| `.User(id, "email", x)` | User identity attached to error | `user.id`, `user.email` |
| `.Tenant(id, "name", x)` | Tenant / org identity | `tenant.id` |
| `.Request(req)` | Capture `*http.Request` (method, URL, headers) | `http.*` |
| `.Trace(traceID)` | Distributed tracing correlation | `trace.id` |
| `.Hint("rotate API key")` | Operator-facing remediation hint | `error.hint` |
| `.Public("Account not found")` | User-safe message for HTTP body | `error.public_message` |
| `.Owner("payments-team")` | Team/owner routing | `error.owner` |
| `.Duration(elapsed)` | How long the failing op ran | `error.duration_ms` |
| `.Time(t)` | Override capture timestamp | `error.timestamp` |

## Stack Traces

Stack is captured automatically at the *first* `Errorf`/`Wrap`/`Wrapf`/`New` in a chain — not at every wrap. Depth is capped by `oops.StackTraceMaxDepth` (default 10 frames); set to 0 to disable:

```go
oops.StackTraceMaxDepth = 0 // disable for hot paths if profiling shows cost
```

Recover frames via `oopsErr.Stacktrace()` (returns `oops.OopsStackTrace`, which implements `fmt.Formatter`).

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
            "code",        oe.Code(),
            "domain",      oe.Domain(),
            "tags",        oe.Tags(),
            "context",     oe.Context(),
            "hint",        oe.Hint(),
            "owner",       oe.Owner(),
            "user",        oe.User(),
            "trace_id",    oe.Trace(),
            "stacktrace",  oe.Stacktrace(),
            "error",       err,
        )
        return
    }
    slog.Error("operation failed", "error", err)
}

// Or use the built-in slog attrs helper:
slog.Error("operation failed", slog.Any("error", oops.ToMap(err)))
```

`oops.ToMap(err)` walks the full chain and merges attributes (innermost wins on key conflict — but make keys unique anyway).

## HTTP Boundary: Public vs Private

Never expose internal error messages over HTTP. Use `.Public(msg)` to attach a user-facing string, keep the verbose message private:

```go
err := oops.
    Code("RATE_LIMIT").
    Public("Too many requests. Try again in a minute.").
    With("ip", clientIP).
    With("window", "60s").
    New("rate limit hit: %d req/min from %s", reqCount, clientIP)

// In middleware:
var oe oops.OopsError
if errors.As(err, &oe) {
    http.Error(w, oe.Public(), http.StatusTooManyRequests) // safe message
    logError(err)                                          // internal detail
    return
}
http.Error(w, "Internal Server Error", http.StatusInternalServerError)
```

## errors.Is / errors.As Compatibility

`oops.Wrap` preserves the chain; stdlib inspection keeps working.

```go
sentinel := errors.New("not found")
err := oops.Code("USER_NOT_FOUND").Wrap(sentinel)

errors.Is(err, sentinel)        // true
errors.As(err, &oops.OopsError{}) // true — extract attributes
```

Match on `Code` for domain logic, `errors.Is` for sentinel identity. Don't match on message text — that's fragile across wraps.

```go
// Match on code — stable
if oops.GetCode(err) == "USER_NOT_FOUND" {
    return http.StatusNotFound
}

// Match on sentinel — stable
if errors.Is(err, domain.ErrNotFound) {
    return http.StatusNotFound
}
```

## Comparison: stdlib vs pkg/errors vs samber/oops

| Feature | stdlib `errors` | `pkg/errors` | `samber/oops` |
|---------|-----------------|--------------|---------------|
| Wrap + message | `fmt.Errorf %w` | `errors.Wrap` | `.Wrapf` / `.Wrap` |
| Stack trace | No | Yes (always-on) | Yes (configurable) |
| Structured context (`key=value`) | No | No | Yes (`.With`) |
| Domain code | Sentinels only | Sentinels only | Yes (`.Code`) |
| User-safe message | Manual | Manual | Yes (`.Public`) |
| User / tenant attribution | No | No | Yes (`.User`, `.Tenant`) |
| APM-shape serialization | Manual | Manual | `oops.ToMap` |
| Maintenance status | Stdlib | Archived upstream | Active |

`pkg/errors` is archived; new code should use stdlib or oops, not pkg/errors.

## When NOT to Use oops

- **Library code with a public API** — don't force the oops dependency on consumers. Return stdlib errors; let callers add context.
- **Small internal tools** — `fmt.Errorf("ctx: %w", err)` is enough.
- **Inside a hot loop** — builder allocates; stack capture is non-trivial. Measure first.
- **When a sentinel + `errors.Is` is cleaner** — oops complements sentinels, doesn't replace them.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wrapping an oops error with oops again | Duplicate stack traces, attribute shadowing | Wrap once at the deepest point; add attributes elsewhere |
| Returning `nil` from a builder by accident | Chain like `.Code("X").With(...)` with no terminator leaks an `*OopsErrorBuilder` into the return | Always end with `.Errorf` / `.Wrap` / `.New` |
| Sending `.Public()` absent | HTTP response leaks internal detail | Default-deny at the HTTP boundary — if `.Public()` is empty, use a generic string |
| Expecting `errors.Is` to match on `Code` | `Code` is a separate attribute, not a sentinel | Use `oops.GetCode(err)` |
| Relying on stack trace after serializing over the wire | Stacks don't survive JSON → new process | Log at the origin; pass only structured context over the wire |

## Review Checklist

When reviewing code using samber/oops, flag:

- **CRITICAL** — Internal error returned directly to HTTP response without `.Public()` (info leak)
- **CRITICAL** — `fmt.Sprintf` with user input used as `.With(key, userInput)` where `key` is dynamic (cardinality explosion in APM)
- **WARNING** — `oops` used in library code exported to other modules (forces dep on consumers)
- **WARNING** — Double-wrapping: `oops.Wrap` applied to an already-oops error at every layer (noise + duplicate stacks)
- **WARNING** — `.Code` values not stable / not centralized (string drift across files)
- **SUGGESTION** — Consider `.Owner("team")` for multi-team projects so APM routes alerts correctly

## Further Reading

- Upstream docs: https://github.com/samber/oops
- `errors` stdlib deep dive: `packages/stack-agents/go/references/error-inspection.md`
- Wrapping conventions: `packages/stack-agents/go/references/error-wrapping.md`
