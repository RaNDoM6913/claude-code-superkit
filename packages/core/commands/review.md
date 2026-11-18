---
description: Unified review orchestrator — detect changes, dispatch reviewers, validate findings, optionally post GitHub inline comments
argument-hint: "[base-branch | PR#number | --full] [--comment] (default: HEAD~1)"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Unified Orchestrated Code Review

Detect changed files, dispatch specialized reviewer agents in parallel with injected git context, independently validate every finding, and produce a deduplicated report. Optionally post the results to a GitHub PR.

## Target

$ARGUMENTS

## Hard Rules

1. Review ONLY the diff scope of the target resolved in Step 1 — changed lines plus their surrounding context. Pre-existing issues outside the diff are out of scope (exception: `--full` reviews all tracked files).
2. Dispatch each agent **at most once** per review (first wave and Step 3b follow-up wave together), and only agents that exist in `.claude/agents/`.
3. Every HIGH/MEDIUM-confidence finding passes independent validation (Step 5) before reaching the report. LOW-confidence (<60) items skip validation and go to **Open Questions** — never silently dropped.
4. **goal-verifier** produces a verdict report (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION), not severity findings — its output bypasses Steps 4–6 validation and lands in its own report section.
5. Zero confirmed findings is a valid outcome — report "clean" honestly, do not pad.
6. An unresolved target is not reviewed: no resolvable BASE/HEAD → `REVIEW NOT RUN`, never an empty diff reported as clean.

## Step 1 — Resolve the Target and Gather Context

**Flags:** `--comment` → post GitHub PR comments (default: terminal only). Remaining argument → `TARGET` (pass it quoted to every command — it is data, not shell text).

**Resolve BASE, HEAD and working-tree inclusion before anything else.** Record all three; every later command, the `REVIEW_CONTEXT`, the Step 5 validators and the Step 7 permalinks use exactly these values.

| Target | Resolve (every command must succeed) | BASE | HEAD | Uncommitted changes | Files · stat · hunks |
|---|---|---|---|---|---|
| `PR#NNN` or a number | `gh pr view "$PR" --json number,title,body,baseRefName,baseRefOid,headRefName,headRefOid` | `baseRefOid` | `headRefOid` | excluded — the PR's pushed commits only | `gh pr diff "$PR" --name-only` · counted from the hunks · `gh pr diff "$PR"` |
| branch or ref | `git rev-parse --verify --quiet "$TARGET^{commit}"`, then `BASE=$(git merge-base "$TARGET" HEAD)`, `HEAD=$(git rev-parse HEAD)` | merge-base of `TARGET` and HEAD | HEAD SHA | excluded — committed changes only | `git diff --name-only "$BASE" "$HEAD"` · `git diff --stat "$BASE" "$HEAD"` · `git diff "$BASE" "$HEAD"` |
| empty | `BASE=$(git rev-parse --verify --quiet HEAD~1)`, `HEAD=$(git rev-parse HEAD)` | HEAD~1 SHA | HEAD SHA plus the working tree | included — staged and unstaged changes to tracked files | `git diff --name-only "$BASE"` · `git diff --stat "$BASE"` · `git diff "$BASE"` |
| `--full` | `HEAD=$(git rev-parse HEAD)` | none | HEAD SHA, files as on disk | included — tracked files as on disk | `git ls-files` · — · none: reviewers read whole files |

- **Unresolvable → stop.** A resolve command that fails or prints nothing (unknown branch, no `HEAD~1` in a single-commit or shallow clone, `gh` missing or unauthenticated, PR not found) → print `REVIEW NOT RUN — cannot resolve <BASE|HEAD> for '<target>': <error>` and stop. Never continue with an empty or guessed BASE: `git diff ...HEAD` with an empty BASE compares HEAD with itself and reports a false clean.
- **Files and hunks must agree.** A non-empty file list with empty hunks (or the reverse) → `REVIEW NOT RUN — file list and hunks disagree for <BASE>..<HEAD>` and stop. Both empty → `No changes in <BASE>..<HEAD>` and stop — that is not a clean review.
- **Name what the target leaves out.** Untracked files (`git ls-files --others --exclude-standard`) are in no diff: in empty and `--full` mode list them as `not reviewed (untracked)` — the user can `git add -N <path>` and re-run. In branch mode, also list dirty tracked files (`git status --porcelain --untracked-files=no`) as `uncommitted — not reviewed`.
- **PR mode uses the PR, never the local checkout.** Hunks, stat and commits come from `gh` for that PR. If local `git rev-parse HEAD` ≠ `headRefOid`, local files are a different version than the reviewed diff — say so in the context; Step 5 reads the PR head instead.

**Gather context** (run in parallel):
```bash
# the Files · stat · hunks commands from your target's row, with the recorded BASE/HEAD
git log --oneline -5 "$HEAD"                       # intent (empty, branch, --full)
gh pr view "$PR" --json commits --jq '.commits[-5:][] | .oid[0:7] + " " + .messageHeadline'   # intent, PR mode
```

Build a `REVIEW_CONTEXT` block:
```
=== REVIEW CONTEXT ===
## Target
Mode: PR #N | branch <name> | default (HEAD~1 + working tree) | full
Base: <BASE SHA> (<ref>, or "none" for --full) · Head: <HEAD SHA> (<ref>)
Uncommitted changes: included | excluded · Not reviewed: <untracked / uncommitted paths, or "none">
## PR Info (PR mode)
Title / Description (first 500 chars)
## Changed Files (N files, +X/-Y)
<stat from the target's row>
## Recent Commits (intent)
<the 5 commit headlines>
## Diff Hunks
<hunks from the target's row, truncated to 8000 chars per agent if needed; --full: "none — read the listed files">
=== END CONTEXT ===
```

## Step 2 — Map Files to Agents

| File pattern | Agents |
|---|---|
| `*.go` (excluding `*_test.go`, migrations) | **go-reviewer**, **security-scanner** |
| `migrations/*.sql` or `db/migrate/*.sql` | **migration-reviewer**, **database-reviewer** |
| Data-access files (`*_repo.go`, repositories) | **database-reviewer** |
| ORM schema and query files (`schema.prisma`, Drizzle schema, ORM models, sqlc or other non-migration `*.sql`) | **database-reviewer** |
| `*.tsx` | **ts-reviewer**, **design-system-reviewer** |
| `*.vue`, `*.svelte` | **design-system-reviewer** |
| `*.ts` | **ts-reviewer** |
| `*.py` | **py-reviewer**, **security-scanner** |
| `*.rs` | **rs-reviewer** |
| `**/bot*/**` code files (`*.go`, `*.py`, `*.ts`, `*.js`, `*.rs`) | **bot-reviewer** |
| API contract files: OpenAPI/Swagger `*.yaml` / `*.yml` / `*.json`, `*.graphql` / `*.graphqls` / `*.gql`, `*.proto` (not CI or other config YAML/JSON) | **api-contract-sync** |
| Any changed code files | **silent-failure-hunter**, **comment-rot-analyzer** |
| Any changed code files, IF an implementation plan exists in `docs/superpowers/plans/` | **goal-verifier** (verdict track — Hard Rule 4) |

Rules: skip agents missing from `.claude/agents/`; if no files match any pattern, report "No reviewable changes detected" and stop; print the dispatch plan (agent + matched file count) before executing.

## Step 3 — Dispatch All Agents in Parallel

All triggered agents are independent — dispatch ALL of them simultaneously in one message. For each, inject the `REVIEW_CONTEXT` block filtered to its files:

- **go-reviewer** → `*.go` hunks (minus tests/migrations) · **ts-reviewer** → `*.ts`/`*.tsx` · **py-reviewer** → `*.py` · **rs-reviewer** → `*.rs` · **migration-reviewer**/**database-reviewer** → SQL + data-access hunks · **bot-reviewer** → bot hunks · **design-system-reviewer** → `*.tsx`/`*.vue`/`*.svelte` UI hunks · **api-contract-sync** → spec hunks
- Cross-cutting, receive ALL hunks: **security-scanner**, **silent-failure-hunter**, **comment-rot-analyzer**, **goal-verifier**

Prompt template for each reviewer:
```
Start with Phase 0 — read project docs (CLAUDE.md/AGENTS.md + relevant docs/architecture/) before reviewing.

{REVIEW_CONTEXT — filtered to your files}

## Your Task
Review the diff hunks against your checklist. Recent commits show intent — judge whether changes are complete and consistent with it. Focus on: contradictions with commit intent, missing pieces (e.g. "add endpoint" but no route registration), regressions in existing patterns.
Your diff range is the Target section's Base..Head (plus the working tree only when it says included); if you run git yourself, use exactly that range and name it in your report header.
Report in your standard output format. Every finding MUST include: file, line, severity, confidence, description, evidence, fix.
```

Exception — **goal-verifier** (verdict track, Hard Rule 4): instead of the checklist task above, give it ALL hunks plus the path of the plan this change implements (the plan in `docs/superpowers/plans/` whose tasks name the changed files; none matches → do not dispatch it) and request its verdict report.

## Step 3b — Specialist Follow-up Wave

Reviewers never dispatch agents; they name deeper passes on their `Specialist follow-up:` line — go-reviewer names go-error-reviewer, go-concurrency-reviewer, go-performance-reviewer, go-modernizer, go-observability-reviewer, database-reviewer or security-scanner, and other reviewers use the same line. When the first wave has returned, read that line in every report; each entry other than `none` names an agent, often a `file:line`, and a reason. Then, per named agent:

- **Not yet dispatched in this review and present in `.claude/agents/`** → dispatch it once — all such agents in parallel, in one message — with the Step 3 prompt, the `REVIEW_CONTEXT` filtered to its file type (a go-* specialist receives the `*.go` hunks go-reviewer received; database-reviewer SQL and data-access hunks; security-scanner all hunks) and one line per entry naming it: `Follow-up requested by <agent>: <file:line — reason>`. Add it to the printed dispatch plan; its findings join Step 4.
- **Already dispatched in this review** → no second run (Hard Rule 2). If the entry's file was not in the hunks that agent received, record the entry with `already ran without <file>`.
- **Not in `.claude/agents/`** → record the entry with `not installed`.
- **Named only by a follow-up-wave report** → one follow-up wave per review; record the entry with `follow-up cap reached`.

Every recorded entry reaches the report under **Specialist Follow-ups Not Run** (Step 6) — never dropped.

## Step 4 — Collect and Triage Findings

Merge all findings from the first wave and the Step 3b follow-up wave (excluding goal-verifier — verdict track). Each must carry: `file`, `line`, `severity` (CRITICAL/WARNING/SUGGESTION), `confidence` (HIGH ≥80 / MEDIUM 60–79 / LOW <60), `agent`, `description`, `evidence`, `fix`.

Triage — route, don't drop:
- LOW confidence → **Open Questions** bucket (appears in the final report; skips validation).
- SUGGESTION from a non-primary reviewer for that file type → validate last; if you skip its validation, route it to Open Questions — never to the confirmed sections (Hard Rule 3).
- Everything else → validation queue.

## Step 5 — Validate Findings (Double Verification)

Launch one validation agent PER FINDING, all in parallel. `{read source}` is the reviewed version from Step 1: the file on disk for empty and `--full` targets; `git show <HEAD>:<path>` for branch and PR targets — for a PR head commit not present locally, `gh api -H 'Accept: application/vnd.github.raw' "repos/{owner}/{repo}/contents/<path>?ref=<HEAD>"`.

```
You are a code review validator. Independently verify whether a reported issue is real.

## Reported Issue
Agent: {agent} · File: {file}:{line} · Severity: {severity}
Description: {description}
Evidence: {evidence}
Reviewed version: {read source}

## Your Task
1. Read the file at the reported location in the reviewed version above (the actual file, not the diff).
2. Read ±20 lines of surrounding context.
3. Decide: is the problem real? Could it be a false positive (pre-existing, intentional, linter-covered)? Is the severity right?

## Verdict — reply with exactly one of:
CONFIRMED — real and correctly described
DOWNGRADE — real but severity should be lower (say which and why)
REJECTED — false positive (say why)

Be strict. When in doubt, REJECT — false positives waste more time than missed issues.
```

Apply verdicts: REJECTED → dropped (counted in validation stats); DOWNGRADE → severity adjusted; CONFIRMED → kept. Validators reading the real file also catch stale/wrong line references.

## Step 6 — Deduplicate and Report

1. Deduplicate: same file:line flagged twice → keep the higher-severity confirmed finding.
2. Group and print:

```
Target: <mode> · <BASE SHA>..<HEAD SHA> · uncommitted changes <included | excluded> · not reviewed: <paths, or "none">
### Blocking (CRITICAL confirmed)
- [agent] file:line — description
### Important (WARNING confirmed)
- [agent] file:line — description
### Nit (SUGGESTION confirmed)
- [agent] file:line — description
### Open Questions (LOW confidence — surfaced, not dropped)
- [agent] file:line — suspicion + what would confirm it
### Specialist Follow-ups Not Run (Step 3b — omit if none)
- <specialist> — requested by <agent> for <file:line — reason> — <not installed | follow-up cap reached | already ran without <file>>
### Goal Verification (only if goal-verifier ran)
Verdict: PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION + its Scope, Coverage, Issues and Required Fixes verbatim
```

3. Summary table (one row per dispatched agent, follow-up wave included):

| Agent | Blocking | Important | Nit | Raw | Confirmed | Status |
|-------|----------|-----------|-----|-----|-----------|--------|
| go-reviewer | 0 | 2 | 1 | 5 | 3 | PASS |

Status per agent: **FAIL** if any Blocking, **WARN** if Important only, **PASS** otherwise.

4. Validation stats: "X findings reported → Y confirmed (Z% hit rate), R rejected".

5. Confidence distribution:

| Band | Count | Route |
|------|-------|-------|
| HIGH (80–100) | N | validated (Step 5) |
| MEDIUM (60–79) | N | validated (Step 5) |
| LOW (<60) | N | Open Questions — surfaced, not dropped |

### Overall Verdict
**PASS / WARN / FAIL** — FAIL if any Blocking confirmed; WARN if Important only; PASS otherwise. One line naming the most critical confirmed finding (or "clean").

## Step 7 — Post GitHub Comments (only if --comment)

No `--comment` → stop here (terminal output only).

With `--comment`, post ONE summary comment via `gh pr comment "$PR_NUMBER" --body "..."` (`PR_NUMBER` = the PR target; for another target, `gh pr view --json number` for the current branch — no PR → say so and do not post) containing: confirmed-issue count (raw → confirmed), the Blocking/Important lists with GitHub permalinks, the summary table, and the validation hit rate. If zero confirmed issues, post the clean-review variant ("No issues found. Agents dispatched: […]. Findings: 0 confirmed of X raw.").

Permalink format (exact, or GitHub won't render):
```
https://github.com/OWNER/REPO/blob/FULL_SHA/path/to/file.ext#LSTART-LEND
```
`FULL_SHA` = the full 40-char HEAD SHA recorded in Step 1 (PR mode: `headRefOid`, not the local checkout); include ≥1 context line on each side in the range.

## Done ONLY when

- [ ] BASE, HEAD and uncommitted-change inclusion were resolved and printed on the report's `Target:` line — or the run stopped with `REVIEW NOT RUN` / `No changes`.
- [ ] Every agent in the printed dispatch plan returned (or is named as skipped/failed — never silently absent).
- [ ] Every `Specialist follow-up` entry was dispatched in Step 3b or is listed under Specialist Follow-ups Not Run with its reason.
- [ ] Every HIGH/MEDIUM finding carries an applied validation verdict (CONFIRMED / DOWNGRADE / REJECTED).
- [ ] Dedup ran and the full report printed: severity groups + summary table + validation stats + confidence distribution + Overall Verdict.
- [ ] If `--comment` was given: the PR comment was actually posted (show the `gh` output).

Not all boxes checked → say what is missing; do not claim the review is complete.

## Recap — non-negotiables

- Resolve BASE/HEAD per target first; unresolvable → `REVIEW NOT RUN`, never an empty diff called clean. PR hunks come from the PR, not the local HEAD.
- Diff scope only (unless `--full`); pre-existing issues are not findings.
- `Specialist follow-up` entries → one follow-up wave of installed, not-yet-run agents; the rest are reported with a reason.
- Every reported finding survived independent validation; LOW confidence → Open Questions, never dropped silently.
- goal-verifier is a verdict, not findings — separate report section.
- Clean review is a valid review.
- `--comment` requires an authenticated `gh` CLI.
