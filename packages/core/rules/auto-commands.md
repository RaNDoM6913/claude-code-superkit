---
alwaysApply: true
---

# Auto Command Triggers

Commands that Claude MUST invoke automatically when conditions are met — without the user explicitly calling them. This rule complements `dev-workflow.md` (which handles `/dev` auto-triggers).

## /review — Auto Code Review

| Trigger | Condition |
|---------|-----------|
| Post-implementation | After completing work on **3+ files** in one task |
| Pre-commit | Before user-requested `git commit` if **5+ files** changed |
| Security-sensitive | After modifying auth, session, permission, or crypto-related code |

**Behavior:**
- Run silently after finishing implementation — do NOT ask "should I review?"
- Use `--comment` flag only if the user is working on a PR
- Skip if already ran `/dev` (Phase 6 includes review)

## /test — Auto Test Run

| Trigger | Condition |
|---------|-----------|
| After feature implementation | New endpoint, service, handler, or component created |
| After bug fix | Any fix that touches logic (not just typos/config) |
| After refactor | Structural changes to existing code |
| Test file edited | When test files are directly modified — verify they pass |

**Behavior:**
- Auto-detect stack and run appropriate test command
- Run only tests relevant to changed files (not full suite) when possible
- If tests fail — report and suggest fixes, do NOT silently proceed
- Skip if already ran `/dev` (Phase 5 includes tests)

## /lint — Auto Lint Check

| Trigger | Condition |
|---------|-----------|
| Pre-commit | Before any `git commit` with code changes (not docs-only) |
| Multi-file edit | After editing **5+ code files** in one task |

**Behavior:**
- Run full lint (not just single-file hooks which only catch basics)
- Auto-fix safe issues (formatting, import sorting) without asking
- Report unfixable issues to the user
- Skip if stack hooks already cover everything (e.g., strict profile with go-vet + typecheck)

## /audit --health — Auto Health Check

| Trigger | Condition |
|---------|-----------|
| Session start (long task) | When user requests a task that will take **10+ file changes** |
| Post-major-refactor | After refactoring that touches **10+ files** |

**Behavior:**
- Use `--health` flag (quick mode, ~30s) — never full `/audit` automatically
- Report critical findings only, suppress suggestions
- Run in background if possible — do not block the main task

## /security-scan — Auto Security Check

| Trigger | Condition |
|---------|-----------|
| Auth/security code changed | Files matching: `*auth*`, `*session*`, `*permission*`, `*crypto*`, `*secret*`, `*token*` |
| New dependency added | After `npm install`, `go get`, `pip install`, or `cargo add` |
| CI/CD config changed | `.github/workflows/*`, `Dockerfile`, `docker-compose*` |

**Behavior:**
- Run targeted scan on changed area, not full project scan
- Report CRITICAL and HIGH severity only for auto-triggered scans
- Do NOT auto-fix security issues — always report to user first

## When NOT to auto-trigger

| Situation | Why skip |
|-----------|----------|
| Already inside `/dev` workflow | `/dev` phases already include review, test, verify |
| User explicitly said "just do X" / "quick fix" | Respect user intent for speed |
| Docs-only or config-only changes | No logic to test/review/scan |
| User is exploring / asking questions | No code changes to validate |
| Single file, < 50 lines changed | Overhead not justified |

## Priority

When multiple auto-triggers fire, run in this order:
1. `/lint` (fastest, catches obvious issues)
2. `/test` (catches logic errors)
3. `/review` (catches design issues)
4. `/security-scan` (catches vulnerabilities)
5. `/audit --health` (overall health, lowest priority)

Skip lower-priority commands if the task is simple and higher-priority ones found no issues.

## Behavior Rules

- **Silent execution** — do NOT announce "I'm auto-running /review". Just do it naturally.
- **No double-runs** — if a command already ran (via `/dev` or explicit call), skip it.
- **User override** — if the user says "skip review" or "don't test", respect that for the current task.
- **Report concisely** — auto-triggered commands should report findings briefly (1-3 lines), not full verbose output.
