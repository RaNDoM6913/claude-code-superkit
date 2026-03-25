---
alwaysApply: true
---

# Documentation Updates — MANDATORY

## HARD RULE
Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

## Pre-commit checklist

Before EVERY `git commit`, ask yourself:

1. **API changed?** → update API reference docs + OpenAPI spec
2. **Frontend behavior changed?** → update frontend architecture docs
3. **DB schema changed?** → update database schema docs
4. **Files created/deleted/moved?** → update project tree docs
5. **Backend layers/DI changed?** → update backend architecture docs
6. **Auth/sessions changed?** → update auth docs
7. **Config/env changed?** → update deployment docs
8. **Major feature?** → update project README + CLAUDE.md

If ANY answer is YES → update docs BEFORE committing.

## What to update

| Change Type | Files to Update |
|------------|-----------------|
| New/changed API endpoint | API reference, OpenAPI spec, backend README |
| New migration / schema | Database schema docs, CLAUDE.md (migration counter) |
| Frontend state / routing / UX | Frontend architecture docs |
| File structure change | `docs/trees/` (regenerate affected tree) |
| Major feature | CLAUDE.md, project README |
| Auth flow change | Auth & sessions docs |
| Deploy process change | Deployment docs |

## When NOT needed
- Pure refactors (no behavior change)
- Test-only changes
- Config/env changes (unless they affect behavior)
- Typo fixes
- Dependency updates (unless API changes)

## Enforcement
Update docs proactively with every code change. Do NOT rely on session-end hooks — they are a safety net, not the primary mechanism.
