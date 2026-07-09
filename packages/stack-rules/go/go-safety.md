---
alwaysApply: false
applyWhenPaths:
  - "**/*.go"
tokens: 512
---

# Go Safety Guardrails

Apply to every Go file you write or edit. In reviews, a violation of these is at least WARNING; panic, data-race, or leak paths are CRITICAL.

## Nil Traps
- Always `make()` maps before write — nil map panics: `m := make(map[K]V)`
- Typed nil pointer in interface is NOT nil — `var p *MyType; var i MyInterface = p; i != nil` is TRUE
- Check pointer receivers for nil in public methods of exported types

## Concurrency
- Every goroutine needs a shutdown mechanism: `ctx.Done()`, done channel, or explicit signal
- Only senders close channels — closing a closed channel panics
- Every `select` that can block, in code where a `ctx` is in scope, needs a `ctx.Done()` case. Exempt: non-blocking `select` with `default`, and code with no context available
- No `time.After` in loops — creates new timer (and leak) per iteration. Use `time.NewTimer` + `Reset()`

## Memory
- `append` may grow into a new array or reuse the old one — always assign the result back to the SAME slice: `s = append(s, x)`. Hazard: `b := append(a, x)` compiles but `b` can share `a`'s backing array, so a write through one mutates the other. Need an independent slice → `copy` explicitly
- `defer` in loops accumulates all defers until function exit — wrap body in closure or extract to function
- Sub-slice of large slice retains entire backing array in memory — copy if keeping small piece of large data

## Numeric
- `int64` -> `int32` truncates silently — use explicit conversion with bounds check
- Float `==` comparison unreliable — use epsilon: `math.Abs(a-b) < epsilon`
- Integer overflow wraps silently — check bounds before arithmetic on user input

## Linter Suppression
- `//nolint` directives MUST name the specific linter AND carry a justification comment (nolintlint style: `//nolint:gosec // reason`). A bare or unjustified `//nolint` is at least WARNING
- NEVER suppress a security linter (`gosec`, `bodyclose`, `sqlclosecheck`) without a documented strong reason — a suppressed security linter with no documented reason is CRITICAL
