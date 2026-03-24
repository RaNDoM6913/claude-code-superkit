---
name: docs-checker
description: Check if architecture docs are up to date with recent code changes
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Docs Freshness Check

Check whether architecture documentation is up to date with recent code changes.

## Step 1 — Get Changed Files

Default: last 5 commits. Override via prompt context.

```bash
git log --name-only --pretty=format: -n 5 | sort -u | grep -v '^$'
```

## Step 2 — Map Changed Files to Relevant Docs

| Changed File Pattern | Required Docs |
|---|---|
| `backend/internal/transport/http/handlers/*.go` | `docs/architecture/backend-api-reference.md`, `backend/docs/openapi.yaml` |
| `backend/internal/services/*.go` | `docs/architecture/backend-layers.md` |
| `backend/internal/repo/postgres/*.go` | `docs/architecture/database-schema.md` |
| `backend/migrations/*.sql` | `docs/architecture/database-schema.md` |
| `backend/internal/services/auth/*.go` | `docs/architecture/auth-and-sessions.md` |
| `backend/internal/services/media/*.go` | `docs/architecture/photo-pipeline.md` |
| `backend/internal/services/moderation/*.go` | `docs/architecture/moderation-pipeline.md` |
| `backend/internal/services/entitlements/*.go` | `docs/architecture/entitlements-and-store.md` |
| `backend/internal/services/notifications/*.go` | `docs/architecture/notification-system.md` |
| `backend/internal/services/feed/*.go` | `docs/architecture/feed-and-antiabuse.md` |
| `tgbots/bot_moderator/**` | `docs/architecture/bot-moderator.md` |
| `tgbots/bot_support/**` | `docs/architecture/bot-support.md` |
| `frontend/src/app/*.tsx` | `docs/architecture/frontend-state-contracts.md` |
| `frontend/src/pages/onboarding/*.tsx` | `docs/architecture/frontend-onboarding-flow.md` |
| `frontend/src/pages/main/*.tsx` | `docs/architecture/frontend-state-contracts.md` |
| `frontend/src/api/*.ts` | `docs/architecture/backend-api-reference.md` |
| `backend/internal/app/apiapp/routes.go` | `docs/architecture/backend-api-reference.md`, `CLAUDE.md` |

## Step 3 — Check if Docs Were Updated

For each mapped doc file, check if it was also modified in the same set of commits:

```bash
git log --name-only --pretty=format: -n 5 | sort -u | grep '<doc_path>'
```

If the doc file is NOT in the changed files list, it is potentially stale.

## Step 4 — Spot-Check Content

For each potentially stale doc:
1. Read the first 50 lines of the changed code file to understand the nature of the change
2. Read the relevant section of the doc
3. Determine if the doc actually needs updating (not all code changes require doc updates — e.g., pure refactors, bug fixes in existing behavior)

## Output

### Docs Status Report

| Doc File | Triggered By | Updated? | Status |
|----------|-------------|----------|--------|
| `docs/architecture/backend-api-reference.md` | `handlers/feed_handler.go` | No | STALE |
| `docs/architecture/database-schema.md` | `migrations/000047_*.sql` | Yes | OK |

### Potentially Stale Docs

For each STALE doc:
- **Doc**: file path
- **Triggered by**: which changed files suggest this doc needs updating
- **What changed**: brief description of the code change
- **Likely doc section**: which section of the doc is affected

### Summary

**X docs OK, Y potentially stale** out of Z checked.

IMPORTANT: Not all code changes require doc updates. Pure refactors, bug fixes in existing behavior, and internal implementation changes typically do NOT need doc updates. Only flag docs as STALE when the public behavior, API, or architecture has changed.
