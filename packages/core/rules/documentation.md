---
alwaysApply: true
tokens: 1888
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
| 16 | `go.mod` or `package.json` (new dependency added) | README — update Tech Stack section | `README.md`, `README_FULL.md`, `backend/README.md` |
| 17 | New `internal/` package created | README — update Project Structure | `README.md`, `CLAUDE.md` |
| 18 | `config.example.yaml` or `.env.example` changed | README — update Configuration section | `README.md`, `backend/README.md` |
| 19 | New service directory in `services/` | README — update Architecture section | `README.md`, `CLAUDE.md` |

**If ANY row matches, update the Required Doc BEFORE committing.** Multiple rows can match simultaneously. Adapt file paths to your project structure.

**README Rule:** When dependencies, packages, or config shape change — the project README files MUST reflect this. A project where `go.mod` lists samber/oops but README says "errors via fmt.Errorf" is lying to every new developer who reads it.

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
- Dependency patch/minor updates (but NEW dependencies or major upgrades that change tech stack → update README)

## Enforcement (4 layers)

| Layer | Mechanism | Type | When |
|-------|-----------|------|------|
| 1. **This rule** | Claude reads on every session | Proactive | Always — primary mechanism |
| 2. **PreToolUse hook** | `doc-check-on-commit.sh` | Hard block (exit 2) | Before every `git commit` — smart file-to-doc mapping |
| 3. **Dev workflow gate** | `dev-workflow.md` Documentation Gate | Phase gate | Phase 7 of /dev — blocks completion without docs |
| 4. **Stop hook** | `stop-verification` | Safety net | Session end — opus-level check |

The hook (layer 2) performs smart analysis: it maps each staged code file to its required documentation file and **blocks the commit** if any required doc is missing. Do NOT rely on the hook alone — update docs proactively with every code change.

### What CANNOT satisfy the doc requirement

The hook explicitly **excludes** these paths from counting as "docs updated":

- `docs/superpowers/plans/**` — planning and intent files
- `docs/superpowers/specs/**` — design specs
- `docs/superpowers/research/**` — research notes
- `memory/**` — memory vault (auto-generated or behavioural notes)
- `CHANGELOG.md`, `HISTORY.md` — release history
- `docs/active-plans-archive.md` — historical archive of finished plans

**Why:** these are meta-work, not architecture docs. A contract change in `handlers/auth_handler.go` must be reflected in `docs/architecture/auth-and-sessions.md` — not "described in the plan file". The plan describes intent; the architecture doc describes the current behaviour of the system.

### Historical bug (fixed 2026-04-14)

Before this date, `doc-check-on-commit.sh` read the tool command from `.command` in the PreToolUse JSON payload. Claude Code actually sends the command at `.tool_input.command` — so `.command` was always `null`, the hook saw an empty `COMMAND`, and silently exited 0 on every commit. **The hook never blocked a single commit during that period.** The same bug affected `superkit-counts-verify.sh`, `config-protection.sh`, `security-patterns.sh`, and `loop-guard.sh` — all now read `.tool_input.*` first with the legacy `.command` / `.file_path` path as a fallback for defence-in-depth.

### Coverage of the path-to-doc map

| Source path (any depth) | Required doc(s) |
|-------------------------|-----------------|
| `*/migrations/*.sql` | `database-schema.md` + `CLAUDE.md` migration counter |
| `*/handlers/*.go`, `*/routes*.go` | `api-reference.md` OR `openapi.yaml` |
| `*/services/auth/**` | `auth-and-sessions.md` |
| `*/services/media/**` | `photo-pipeline.md` |
| `*/services/moderation/**` | `moderation-pipeline.md` |
| `*/services/feed/**`, `*/services/antiabuse/**` | `feed-and-antiabuse.md` |
| `*/services/{entitlements,store,payments}/**` | `entitlements-and-store.md` |
| `*/services/notifications/**` | `notification-system.md` |
| `*/app/**`, `*/middleware/**`, `*/jobs/**`, `*/workers/**`, `*/cmd/**` | `backend-layers.md` (+ `docs/trees/tree-*.md` if the file is NEW) |
| `*/repo/**` (NEW file only) | `docs/trees/tree-*.md` |
| `*/bot_{moderator,support}/**`, `*/tgbots/**`, `*/bots/**` | `bot-*.md` |
| `*/src/**/*.{ts,tsx}` (except `presentation/`) | `frontend-*.md` |

New paths must be added to this table AND to the `case` statements in `doc-check-on-commit.sh` simultaneously.

## Plan Completion Gate

When finishing an implementation plan (superpowers writing-plans / executing-plans):
- **BEFORE marking the plan as complete**, run the 15-point checklist above
- If any docs are stale — update them as the FINAL task
- A plan is NOT complete until docs are updated
