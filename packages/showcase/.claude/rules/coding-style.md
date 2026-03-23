---
alwaysApply: true
---

# Coding Style — SocialApp

## Go
- Format: `gofmt` (enforced by format-on-edit hook)
- Error wrapping: `fmt.Errorf("ContextName.MethodName: %w", err)`
- Interface-based DI: constructors accept interfaces, not concrete types
- `Ready()` nil-safety on all repos
- `context.Context` as first parameter in service/repo methods
- No global state — everything injected via constructors

## TypeScript
- Strict mode always
- Zod validation at API boundaries
- Type-first: define types before implementation
- motion/react v12 — use `m.div`, never `motion.div`
- TanStack Query for all server state
- Zustand for client-only state (navigation, UI)

## Shared
- No magic numbers — use named constants
- No commented-out code — delete it (git has history)
- Prefer early returns over deep nesting
- Maximum function length: ~50 lines (split if larger)

## Testing
- Tests required for: new API endpoints, bug fixes, business logic, complex SQL
- Tests optional for: pure UI components, config changes, docs
- Go: table-driven `t.Run(tt.name, ...)`, `httptest`, mock interfaces not types
- Frontend: Playwright e2e for critical flows

## Search First
- Before new code: grep codebase for similar function/pattern
- Before new dep: check for well-maintained npm/Go module
- Check MCP tools (Yandex Places, Playwright, Context7) and project skills
- Only build custom when nothing suitable exists
