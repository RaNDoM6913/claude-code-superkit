---
alwaysApply: true
tokens: 1231
---

# Auto Command Triggers

Commands Claude MUST invoke automatically when a condition below matches — without the user asking. Complements `dev-workflow.md` (which owns `/dev` auto-triggers).

## Hard Rules

1. **Docs before commit — highest priority, NEVER skip.** Before EVERY `git commit` that includes code changes, verify docs are staged alongside code (see Documentation section below).
2. **No double-runs.** A command that already ran for this task — via `/dev` or an explicit user call — is not run again.
3. **Silent execution.** Run auto-triggered commands without announcing or asking permission; report findings in 1–3 lines, not full verbose output.
4. **Never auto-fix security findings.** `/security-scan` results always go to the user first.
5. **User override.** If the user says "skip review" / "don't test", skip that command for the current task.

## /review — Auto Code Review

| Trigger | Condition |
|---------|-----------|
| Post-implementation | After completing work on **3+ files** in one task |
| Pre-commit | Before user-requested `git commit` if **5+ files** changed |
| Security-sensitive | After modifying auth, session, permission, or crypto-related code |

**Behavior:**
- Run right after finishing implementation — do not ask "should I review?"
- Use `--comment` only when the user is working on a PR
- Skip if `/dev` already ran — its Review phase covers this

## /test — Auto Test Run

| Trigger | Condition |
|---------|-----------|
| After feature implementation | New endpoint, service, handler, or component created |
| After bug fix | Any fix that touches logic (not just typos/config) |
| After refactor | Structural changes to existing code |
| Test file edited | When test files are directly modified — verify they pass |

**Behavior:**
- Auto-detect stack and run the matching test command
- Run the test scope covering the changed files (same package/module/directory); run the full suite only when that mapping is unclear or **10+ files** changed
- If tests fail — report and suggest fixes, do NOT silently proceed
- Skip if `/dev` already ran — its Test phase covers this

## /lint — Auto Lint Check

| Trigger | Condition |
|---------|-----------|
| Pre-commit | Before any `git commit` with code changes (not docs-only) |
| Multi-file edit | After editing **5+ code files** in one task |

**Behavior:**
- Run full lint (single-file hooks catch only basics)
- Auto-fix safe issues (formatting, import sorting) without asking
- Report unfixable issues to the user
- Skip if stack hooks already cover everything (e.g., strict profile with go-vet + typecheck)

## /audit --health — Auto Health Check

| Trigger | Condition |
|---------|-----------|
| Session start (long task) | When the user requests a task that will take **10+ file changes** |
| Post-major-refactor | After refactoring that touches **10+ files** |

**Behavior:**
- Use `--health` (quick mode, ~30s) — never full `/audit` automatically
- Report critical findings only, suppress suggestions
- Launch it in the background and continue the main task; if background execution is unavailable, run it last, after all other auto-triggers

## /security-scan — Auto Security Check

| Trigger | Condition |
|---------|-----------|
| Auth/security code changed | Files matching: `*auth*`, `*session*`, `*permission*`, `*crypto*`, `*secret*`, `*token*` |
| New dependency added | After `npm install`, `go get`, `pip install`, or `cargo add` |
| CI/CD config changed | `.github/workflows/*`, `Dockerfile`, `docker-compose*` |

**Behavior:**
- `/security-scan` runs AgentShield on `.claude/` configuration; auto-triggered scans use the plain scan — no `--fix`, no `--opus`
- AgentShield grades on its own `critical / high / medium / low` scale — relay it verbatim, never remap to the kit's CRITICAL / WARNING / SUGGESTION
- For auto-triggered scans, report only `critical` and `high` findings
- Do NOT auto-fix security issues — always report to the user first (Hard Rule 4)

## Documentation — Auto Verify Before Commit

Highest-priority auto-trigger (Hard Rule 1).

| Trigger | Condition |
|---------|-----------|
| Pre-commit | Before EVERY `git commit` that includes code changes (.go, .ts, .tsx, .sql, .py, .rs) |

**Behavior:**
- Before committing, verify corresponding docs are staged alongside code:
  - **Migration staged** → database schema docs updated
  - **Handler/endpoint changed** → API reference docs updated
  - **Frontend behavior changed** → frontend state/architecture docs updated
- Docs missing → update them BEFORE committing, not after
- The `doc-check-on-commit` hook BLOCKS commits with missing docs — fix the docs, never bypass the hook

## When NOT to auto-trigger

| Situation | Why skip |
|-----------|----------|
| Already inside `/dev` workflow | its Verify, Test, and Review phases cover this |
| User explicitly said "just do X" / "quick fix" | respect user intent for speed |
| Docs-only or config-only changes | no logic to test/review/scan |
| User is exploring / asking questions | no code changes to validate |
| Single file, < 50 lines changed | overhead not justified |

## Priority

When multiple auto-triggers fire, run in this order:
1. `/lint` (fastest, catches obvious issues)
2. `/test` (catches logic errors)
3. `/review` (catches design issues)
4. `/security-scan` (catches vulnerabilities)
5. `/audit --health` (overall health, lowest priority)

Early stop: if **fewer than 3 files** changed AND every command already run in this order reported zero issues → skip the remaining lower-priority commands. Exception: a command whose own trigger condition matched still runs (e.g., `/security-scan` after an auth-file edit).
