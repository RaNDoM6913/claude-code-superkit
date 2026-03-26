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

## Enforcement (4 layers)

1. **Rule (this file)** — Claude reads this on every session. Primary mechanism.
2. **Rule (`auto-commands.md`)** — HIGHEST PRIORITY auto-trigger: docs checklist before every commit.
3. **PreToolUse hook (`doc-check-on-commit.sh`)** — **BLOCKS** `git commit` (exit 2) if code changed but no docs staged. Not a warning — a hard block.
4. **Stop hook** — opus-level verification at session end. Safety net.

Do NOT rely on hooks alone — update docs proactively with every code change.

## Plan completion gate

When finishing an implementation plan (superpowers writing-plans / executing-plans):
- **BEFORE marking the plan as complete**, run the pre-commit checklist above
- If any docs are stale — update them as the FINAL task
- A plan is NOT complete until docs are updated
