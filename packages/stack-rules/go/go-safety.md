---
alwaysApply: false
applyWhenPaths:
  - "**/*.go"
---

# Go Safety Guardrails

## Nil Traps
- Always `make()` maps before write — nil map panics: `m := make(map[K]V)`
- Typed nil pointer in interface is NOT nil — `var p *MyType; var i MyInterface = p; i != nil` is TRUE
- Check pointer receivers for nil in public methods of exported types

## Concurrency
- Every goroutine needs a shutdown mechanism: `ctx.Done()`, done channel, or explicit signal
- Only senders close channels — closing a closed channel panics
- Include `ctx.Done()` case in every `select` statement
- No `time.After` in loops — creates new timer (and leak) per iteration. Use `time.NewTimer` + `Reset()`

## Memory
- Append can alias backing array — always use return value: `s = append(s, x)`, never `append(s, x)` alone
- `defer` in loops accumulates all defers until function exit — wrap body in closure or extract to function
- Sub-slice of large slice retains entire backing array in memory — copy if keeping small piece of large data

## Numeric
- `int64` -> `int32` truncates silently — use explicit conversion with bounds check
- Float `==` comparison unreliable — use epsilon: `math.Abs(a-b) < epsilon`
- Integer overflow wraps silently — check bounds before arithmetic on user input
