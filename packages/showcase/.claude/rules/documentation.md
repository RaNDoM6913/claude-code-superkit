---
alwaysApply: true
---

# Documentation Updates — MANDATORY

## HARD RULE
Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

## Pre-commit checklist

Before EVERY `git commit`, ask yourself:

1. **API changed?** → update `docs/architecture/backend-api-reference.md` + `backend/docs/openapi.yaml`
2. **Frontend behavior changed?** → update `docs/architecture/frontend-state-contracts.md`
3. **Onboarding changed?** → update `docs/architecture/frontend-onboarding-flow.md`
4. **DB schema changed?** → update `docs/architecture/database-schema.md`
5. **Files created/deleted/moved?** → update `docs/trees/` (relevant tree file)
6. **Backend layers/DI changed?** → update `docs/architecture/backend-layers.md`
7. **Auth/sessions changed?** → update `docs/architecture/auth-and-sessions.md`
8. **Feed algorithm changed?** → update `docs/architecture/feed-and-antiabuse.md`
9. **Moderation flow changed?** → update `docs/architecture/moderation-pipeline.md`
10. **Bot behavior changed?** → update `docs/architecture/bot-moderator.md` or `bot-support.md`

If ANY answer is YES → update docs BEFORE committing.

## What to update

| Change Type | Files to Update |
|------------|-----------------|
| New/changed API endpoint | `backend-api-reference.md`, `openapi.yaml`, `backend/README.md` |
| New migration / schema | `database-schema.md`, CLAUDE.md (migration counter) |
| Frontend state / routing / UX | `frontend-state-contracts.md` |
| Onboarding flow | `frontend-onboarding-flow.md` |
| File structure change | `docs/trees/` (regenerate affected tree) |
| Major feature | CLAUDE.md (Active Plans / Completed Features) |

## When NOT needed
- Pure refactors (no behavior change)
- Test-only changes
- Config/env changes
- Typo fixes

## Enforcement
This rule is enforced by the `stop-verification` hook which checks docs freshness before session end. But do NOT rely on the hook — update docs proactively with every code change.
