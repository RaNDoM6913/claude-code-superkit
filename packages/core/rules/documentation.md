---
alwaysApply: true
---

# Documentation Updates — MANDATORY

## HARD RULE
Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

## 15-Point Pre-Commit Checklist

Before EVERY `git commit`, walk through this table. If the "Trigger" column matches any staged file, the "Required Doc" MUST also be staged.

| # | Trigger (changed files) | Required Doc | Example Path |
|---|-------------------------|-------------|-----------|
| 1 | `*/migrations/*.sql` | Database schema | `docs/architecture/database-schema.md` |
| 2 | `*/migrations/*.sql` | Migration counter in CLAUDE.md | `CLAUDE.md` |
| 3 | `*/handlers/*.go` or `*/routes*.go` | API reference | `docs/architecture/api-reference.md` |
| 4 | `*/handlers/*.go` or `*/routes*.go` | OpenAPI spec | `docs/openapi.yaml` |
| 5 | `*/app/*.go` or `*/middleware*.go` | Backend layers | `docs/architecture/backend-layers.md` |
| 6 | `*/services/auth/*.go` | Auth & sessions | `docs/architecture/auth-and-sessions.md` |
| 7 | `*/services/media/*.go` | Media/photo pipeline | `docs/architecture/photo-pipeline.md` |
| 8 | `*/services/feed/*.go` | Feed algorithm | `docs/architecture/feed.md` |
| 9 | `*/services/notifications/*.go` | Notification system | `docs/architecture/notifications.md` |
| 10 | `*/services/payments/*.go` or `*/store/*.go` | Payments/store | `docs/architecture/payments.md` |
| 11 | `*/src/**/*.ts(x)` (frontend) | Frontend architecture | `docs/architecture/frontend.md` |
| 12 | `*/src/pages/onboarding/*` | Onboarding flow | `docs/architecture/onboarding.md` |
| 13 | Bot source files (`*bot*/*.go`) | Bot docs | `docs/architecture/bot-*.md` |
| 14 | Config files affecting behavior | Deployment docs | `docs/deployment.md` |
| 15 | Any new file (`git diff --diff-filter=A`) | Project trees | `docs/trees/` (relevant tree file) |

**If ANY row matches, update the Required Doc BEFORE committing.** Multiple rows can match simultaneously. Adapt file paths to your project structure.

## Subagent Instructions

When delegating work to subagents (Agent tool), the parent MUST include explicit documentation instructions. Never say "update docs" generically. Instead, list EVERY specific file:

**Template for subagent prompts:**
```
After making code changes, update these documentation files:
1. `docs/architecture/<specific-file>.md` — describe what to update
2. `CLAUDE.md` — update <specific section> (e.g., migration counter, Active Plans)
3. `docs/trees/<specific-tree>.md` — regenerate if files were added/removed
4. `docs/openapi.yaml` — add/update endpoint definitions
```

Subagents MUST NOT commit without documentation updates. If a subagent cannot determine which docs to update, it must ask the parent agent rather than skip docs.

## When NOT Needed

- Pure refactors (no behavior change, same API contract)
- Test-only changes (`*_test.go`, `*.test.ts`, `*.spec.ts`)
- Config/env changes (`.env`, `*.yaml`, `*.json` unless it is `openapi.yaml`)
- Typo fixes in non-doc files
- Dependency updates (unless they change public API)

## Enforcement (4 layers)

| Layer | Mechanism | Type | When |
|-------|-----------|------|------|
| 1. **This rule** | Claude reads on every session | Proactive | Always — primary mechanism |
| 2. **PreToolUse hook** | `doc-check-on-commit.sh` | Hard block (exit 2) | Before every `git commit` — smart file-to-doc mapping |
| 3. **Dev workflow gate** | `dev-workflow.md` Documentation Gate | Phase gate | Phase 7 of /dev — blocks completion without docs |
| 4. **Stop hook** | `stop-verification` | Safety net | Session end — opus-level check |

The hook (layer 2) performs smart analysis: it maps each staged code file to its required documentation file and **blocks the commit** if any required doc is missing. Do NOT rely on the hook alone — update docs proactively with every code change.

## Plan Completion Gate

When finishing an implementation plan (superpowers writing-plans / executing-plans):
- **BEFORE marking the plan as complete**, run the 15-point checklist above
- If any docs are stale — update them as the FINAL task
- A plan is NOT complete until docs are updated
