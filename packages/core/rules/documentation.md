---
alwaysApply: true
tokens: 1888
---

# Documentation Updates — MANDATORY

## HARD RULE
Code changes affecting logic, API, architecture, or behavior MUST include documentation updates **IN THE SAME RESPONSE** as the code. Code without updated docs = **INCOMPLETE TASK**. NEVER defer docs to "later" or "next commit".

## 11-Point Pre-Commit Checklist

Before EVERY `git commit`: if a Trigger matches any staged file, the Required Doc MUST also be staged. Multiple rows can match — satisfy all of them.

| # | Trigger (staged files) | Required Doc |
|---|------------------------|--------------|
| 1 | `*/migrations/*.sql`, `*/db/migrate/*` | `docs/architecture/database-schema.md` AND `CLAUDE.md` (migration counter) |
| 2 | `*/handlers/*.go`, `*/routes*.go`, `*/router*.go` | `docs/architecture/api-reference.md` OR `docs/openapi.yaml` |
| 3 | `*/app/**`, `*/middleware*`, `*/jobs/**`, `*/workers/**`, `*/cmd/**` | `docs/architecture/backend-layers.md` |
| 4 | `*/services/auth/**` | `docs/architecture/auth-and-sessions.md` |
| 5 | Any other `*/services/<name>/**` | matching `docs/architecture/<service-doc>.md` — see example map below |
| 6 | Frontend `src/**/*.ts`, `src/**/*.tsx` | `docs/architecture/frontend-state.md` |
| 7 | ANY new non-test code file (`git diff --cached --diff-filter=A`) | relevant `docs/trees/tree-*.md` |
| 8 | NEW dependency in `go.mod` / `package.json` | `README.md` Tech Stack section (or `CLAUDE.md`) |
| 9 | `config.example.*`, `config.sample.*`, `.env.example` | `README.md` Configuration section |
| 10 | Deploy/infra config changing runtime behavior (Dockerfile, compose, CI/CD) | `docs/architecture/deployment.md` |
| 11 | New service directory or new `internal/` package | `README.md` Project Structure AND `CLAUDE.md` |

The `doc-check-on-commit.sh` hook hard-blocks commits for most rows; rows it does not cover are equally mandatory under this rule.

**README rule:** when dependencies or config shape change, README MUST reflect it. A `go.mod` listing samber/oops while README says "errors via fmt.Errorf" lies to every new developer.

### Project-Specific Example Map — ADAPT TO YOUR PROJECT

EXAMPLE rows from a production Telegram app — NOT generic. Replace paths and doc names with YOUR services, and keep this map in sync with the `case` statements in `doc-check-on-commit.sh` (the shipped hook hardcodes exactly these mappings — always edit the rule and the hook together).

| Trigger (any depth) | Required Doc |
|---------------------|--------------|
| `*/services/media/**` | `docs/architecture/photo-pipeline.md` |
| `*/services/moderation/**` | `docs/architecture/moderation-pipeline.md` |
| `*/services/feed/**`, `*/services/antiabuse/**` | `docs/architecture/feed-and-antiabuse.md` |
| `*/services/entitlements/**`, `*/services/store/**`, `*/services/payments/**` | `docs/architecture/entitlements-and-store.md` |
| `*/services/notifications/**` | `docs/architecture/notification-system.md` |
| `*/bot_moderator/**`, `*/bot_support/**`, `*/tgbots/**`, `*/bots/**` | `docs/architecture/bot-moderator.md` / `bot-support.md` |

## When Docs Are NOT Needed

- Pure refactors (no behavior change, same API contract)
- Test-only changes (`*_test.go`, `*.test.ts`, `*.spec.ts`)
- Typo fixes in non-doc files
- Dependency patch/minor updates (NEW dependencies or major upgrades → row 8)

**Config precedence rule:** a config change that alters runtime behavior or config shape other developers must know (example/sample config files, new config keys, deploy settings) → docs required per rows 9–10. Purely local/dev values (`.env` values, secrets, local overrides, editor settings) → exempt.

## Enforcement (4 layers)

| Layer | Mechanism | Type | When |
|-------|-----------|------|------|
| 1. **This rule** | loaded every session | Proactive | Always — primary mechanism |
| 2. **PreToolUse hook** | `doc-check-on-commit.sh` | Hard block (exit 2) | Before every `git commit` — maps staged files to required docs, blocks if missing |
| 3. **/dev Document phase** | `dev.md` phase gate | Phase gate | /dev cannot reach Report until docs are updated |
| 4. **Stop hook** | prompt-type Stop hook inline in `settings.json` | Safety net | Session end — verifies docs updated when logic/API/architecture changed |

Do NOT rely on layers 2–4 — update docs proactively with every code change (layer 1).

### What CANNOT satisfy the doc requirement

The hook excludes these paths from counting as "docs updated":

- `docs/superpowers/plans/**`, `docs/superpowers/specs/**`, `docs/superpowers/research/**`
- `memory/**`
- `CHANGELOG.md`, `HISTORY.md`
- `docs/active-plans-archive.md`

These are meta-work: a plan describes intent; the architecture doc describes current system behavior. A contract change in `handlers/auth_handler.go` belongs in `docs/architecture/auth-and-sessions.md` — never "described in the plan file".

## Plan Completion Gate

When finishing an implementation plan (superpowers writing-plans / executing-plans):

1. BEFORE marking the plan complete, run the 11-point checklist above; update any stale doc as the FINAL task.
2. After a plan completes, `plan-completion-gate.sh` sets a marker: the next code commit MUST stage a `docs/architecture/*` file OR carry `[plan-docs-deferred: <plan-id>: <reason ≥15 chars>]` in the commit message.
3. A plan is NOT complete until docs are updated.

## Subagent Instructions

When delegating via the Agent tool, list EVERY specific doc file — never say "update docs" generically:

```
After making code changes, update these documentation files:
1. `docs/architecture/<specific-file>.md` — <what to update>
2. `CLAUDE.md` — <specific section> (e.g., migration counter, Active Plans)
3. `docs/trees/<specific-tree>.md` — regenerate if files were added/removed
4. `docs/openapi.yaml` — add/update endpoint definitions
```

Subagents MUST NOT commit without doc updates. A subagent that cannot determine which docs to update asks the parent — it does not skip docs.

## Recap — non-negotiables

- Docs ship IN THE SAME RESPONSE as the code — code without docs = INCOMPLETE TASK.
- Before every commit, walk the 11-point checklist; every matching row's doc must be staged.
- Plans/specs/memory/CHANGELOG never satisfy the doc requirement — only architecture docs, trees, README, CLAUDE.md, openapi.yaml do.
- A plan is NOT complete until the checklist passes.
