---
alwaysApply: false
paths:
  - "**/*.go"
---

# Go Conventions

## Naming
- MixedCaps for all names (not snake_case, not SCREAMING_CASE). Acronyms fully capitalized: `HTTPClient`, `userID`, `parseURL`
- Package names: lowercase, single word, no underscores. Never `util`, `common`, `base`, `helpers`
- Interfaces: verb or -er suffix (`Reader`, `Validator`, `Closer`). Max 3 methods. Declare at consumer side
- Error variables: `ErrNotFound`, `ErrValidation` (Err prefix + PascalCase)
- Avoid stuttering: `http.Client` not `http.HTTPClient`, `user.New()` not `user.NewUser()`

## Patterns
- Constructors: `NewX(deps) *X`, validate inside, return error if validation can fail
- >3 optional params: use functional options pattern (`func WithTimeout(d time.Duration) Option`)
- Enums: `iota` with `Unknown = 0` as zero value. Always include `String()` method
- Early returns (guard clauses), not deep nesting. Happy path at lowest indentation
- Accept interfaces, return structs. Keep interfaces small

## Error Handling
- Always wrap: `fmt.Errorf("MethodName: %w", err)` — lowercase, no punctuation
- Log OR return, never both. Handlers log; services/repos return
- Sentinel errors (`var ErrNotFound = errors.New(...)`) for expected domain conditions
- `errors.Is()` / `errors.As()` for inspection, never `==` or type assertion
- Domain errors map to HTTP status in handlers only — services return domain errors

## Context
- `ctx context.Context` always first parameter, always named `ctx`
- Never store context in structs — pass explicitly
- `context.Background()` only in main, init, tests
- `defer cancel()` immediately after `context.WithCancel` / `WithTimeout` / `WithDeadline`
