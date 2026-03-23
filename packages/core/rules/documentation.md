---
alwaysApply: true
---

# Documentation Updates

## Rule
Code changes affecting logic, API, architecture, or database schema MUST include
documentation updates in the same response. Code without updated docs = incomplete task.

## When to update

| Change Type | Update |
|------------|--------|
| New/changed API endpoint | `docs/architecture/api-reference.md` |
| New migration / schema change | `docs/architecture/database-schema.md` |
| Auth flow change | `docs/architecture/auth-and-sessions.md` |
| New service / layer change | `docs/architecture/backend-layers.md` |
| Frontend state / routing change | `docs/architecture/frontend-state.md` |
| File structure change | `docs/trees/` (regenerate) |
| Deploy process change | `docs/architecture/deployment.md` |

## When NOT needed
- Pure refactors (no behavior change)
- Bug fixes in existing documented behavior
- Test-only changes
- Dependency updates (unless API changes)
