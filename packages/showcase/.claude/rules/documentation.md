---
alwaysApply: true
---

# Documentation Updates — MANDATORY

## HARD RULE
Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

## 15-Point Pre-Commit Checklist

Before EVERY `git commit`, walk through this table. If the "Trigger" column matches any staged file, the "Required Doc" MUST also be staged.

| # | Trigger (changed files) | Required Doc | File Path |
|---|-------------------------|-------------|-----------|
| 1 | `backend/migrations/*.sql` | Database schema | `docs/architecture/database-schema.md` |
| 2 | `backend/migrations/*.sql` | Migration counter in CLAUDE.md | `CLAUDE.md` |
| 3 | `backend/internal/transport/http/handlers/*.go` | API reference | `docs/architecture/backend-api-reference.md` |
| 4 | `backend/internal/transport/http/handlers/*.go` | OpenAPI spec | `backend/docs/openapi.yaml` |
| 5 | `backend/internal/app/apiapp/*.go` (routes, middleware) | Backend layers | `docs/architecture/backend-layers.md` |
| 6 | `backend/internal/services/auth/*.go` | Auth & sessions | `docs/architecture/auth-and-sessions.md` |
| 7 | `backend/internal/services/moderation/*.go` | Moderation pipeline | `docs/architecture/moderation-pipeline.md` |
| 8 | `backend/internal/services/media/*.go` | Photo pipeline | `docs/architecture/photo-pipeline.md` |
| 9 | `backend/internal/services/feed/*.go`, `antiabuse/*.go` | Feed & anti-abuse | `docs/architecture/feed-and-antiabuse.md` |
| 10 | `backend/internal/services/entitlements/*.go`, `store/*.go`, `payments/*.go` | Entitlements & store | `docs/architecture/entitlements-and-store.md` |
| 11 | `backend/internal/services/notifications/*.go` | Notification system | `docs/architecture/notification-system.md` |
| 12 | `frontend/src/**/*.ts(x)` | Frontend state or onboarding | `docs/architecture/frontend-state-contracts.md` OR `frontend-onboarding-flow.md` |
| 13 | `tgbots/bot_moderator/**/*.go` | Moderator bot | `docs/architecture/bot-moderator.md` |
| 14 | `tgbots/bot_support/**/*.go` | Support bot | `docs/architecture/bot-support.md` |
| 15 | Any new file (`git diff --diff-filter=A`) | Project trees | `docs/trees/` (relevant tree file) |

**If ANY row matches, update the Required Doc BEFORE committing.** Multiple rows can match simultaneously.

## Subagent Instructions

When delegating work to subagents (Agent tool), the parent MUST include explicit documentation instructions. Never say "update docs" generically. Instead, list EVERY specific file:

**Template for subagent prompts:**
```
After making code changes, update these documentation files:
1. `docs/architecture/<specific-file>.md` — describe what to update
2. `CLAUDE.md` — update <specific section> (e.g., migration counter, Active Plans)
3. `docs/trees/<specific-tree>.md` — regenerate if files were added/removed
4. `backend/docs/openapi.yaml` — add/update endpoint definitions
```

Subagents MUST NOT commit without documentation updates. If a subagent cannot determine which docs to update, it must ask the parent agent rather than skip docs.

## Dual-Repo Sync (TGApp <-> superkit)

When `.claude/` configuration files change (agents, rules, commands, hooks, skills):

1. **TGApp is the source of truth** for project-specific configs
2. **claude-code-superkit** extracts generic patterns from TGApp
3. If you modify `.claude/agents/`, `.claude/rules/`, `.claude/hooks/`, or `.claude/commands/`:
   - Complete the TGApp change first
   - Add an advisory comment noting superkit may need sync
   - Do NOT block the commit — superkit sync is a separate task
4. The `doc-check-on-commit.sh` hook prints a non-blocking advisory for `.claude/` changes

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
