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

1. Review ONLY the diff scope — changed lines plus their surrounding context. Pre-existing issues outside the diff are out of scope (exception: `--full` reviews all tracked files).
2. Dispatch each agent **at most once**, and only agents that exist in `.claude/agents/`.
3. Every HIGH/MEDIUM-confidence finding passes independent validation (Step 5) before reaching the report. LOW-confidence (<60) items skip validation and go to **Open Questions** — never silently dropped.
4. **goal-verifier** produces a verdict report (PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION), not severity findings — its output bypasses Steps 4–6 validation and lands in its own report section.
5. Zero confirmed findings is a valid outcome — report "clean" honestly, do not pad.

## Step 1 — Parse Arguments and Detect Changes

**Flags:** `--comment` → post GitHub PR comments (default: terminal only). Remaining argument → diff target.

**Diff base:**
- `PR#NNN` or a number → `gh pr diff $TARGET --name-only`
- branch name → `git diff --name-only $TARGET...HEAD`
- `--full` → all tracked files (`git ls-files`)
- empty → `git diff --name-only HEAD~1`

**Gather context** (run in parallel):
```bash
git diff --stat ${BASE}...HEAD        # changed files + line counts
git diff ${BASE}...HEAD               # full hunks for agent injection
git log --oneline -5                  # intent
gh pr view $PR_NUMBER --json title,body 2>/dev/null   # PR mode only
```

Build a `REVIEW_CONTEXT` block:
```
=== REVIEW CONTEXT ===
## PR Info (if available)
Title / Description (first 500 chars)
## Changed Files (N files, +X/-Y)
<git diff --stat>
## Recent Commits (intent)
<git log --oneline -5>
## Diff Hunks
<diff, truncated to 8000 chars per agent if needed>
=== END CONTEXT ===
```

## Step 2 — Map Files to Agents

| File pattern | Agents |
|---|---|
| `*.go` (excluding `*_test.go`, migrations) | **go-reviewer**, **security-scanner** |
| `migrations/*.sql` or `db/migrate/*.sql` | **migration-reviewer**, **database-reviewer** |
| Data-access files (`*_repo.go`, repositories) | **database-reviewer** |
| `*.tsx` | **ts-reviewer**, **design-system-reviewer** |
| `*.ts` | **ts-reviewer** |
| `*.py` | **py-reviewer**, **security-scanner** |
| `*.rs` | **rs-reviewer** |
| `**/bot*/**/*.go` or `**/bot*/**/*.py` | **bot-reviewer** |
| `*.yaml` / `*.yml` (OpenAPI/GraphQL) | **api-contract-sync** |
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
Report in your standard output format. Every finding MUST include: file, line, severity, confidence, description, evidence, fix.
```

## Step 4 — Collect and Triage Findings

Merge all findings (excluding goal-verifier — verdict track). Each must carry: `file`, `line`, `severity` (CRITICAL/WARNING/SUGGESTION), `confidence` (HIGH ≥80 / MEDIUM 60–79 / LOW <60), `agent`, `description`, `evidence`, `fix`.

Triage — route, don't drop:
- LOW confidence → **Open Questions** bucket (appears in the final report; skips validation).
- SUGGESTION from a non-primary reviewer for that file type → keep, validate only if cheap.
- Everything else → validation queue.

## Step 5 — Validate Findings (Double Verification)

Launch one validation agent PER FINDING, all in parallel:

```
You are a code review validator. Independently verify whether a reported issue is real.

## Reported Issue
Agent: {agent} · File: {file}:{line} · Severity: {severity}
Description: {description}
Evidence: {evidence}

## Your Task
1. Read the file at the reported location (the actual file, not the diff).
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
### Blocking (CRITICAL confirmed)
- [agent] file:line — description
### Important (WARNING confirmed)
- [agent] file:line — description
### Nit (SUGGESTION confirmed)
- [agent] file:line — description
### Open Questions (LOW confidence — surfaced, not dropped)
- [agent] file:line — suspicion + what would confirm it
### Goal Verification (only if goal-verifier ran)
Verdict: PASS / NEEDS-ATTENTION / NEEDS-REMEDIATION + its gap list verbatim
```

3. Summary table:

| Agent | Blocking | Important | Nit | Raw | Confirmed | Status |
|-------|----------|-----------|-----|-----|-----------|--------|
| go-reviewer | 0 | 2 | 1 | 5 | 3 | PASS |

Status per agent: **FAIL** if any Blocking, **WARN** if Important only, **PASS** otherwise.

4. Validation stats: "X findings reported → Y confirmed (Z% hit rate), R rejected".

### Overall Verdict
**PASS / WARN / FAIL** — FAIL if any Blocking confirmed; WARN if Important only; PASS otherwise. One line naming the most critical confirmed finding (or "clean").

## Step 7 — Post GitHub Comments (only if --comment)

No `--comment` → stop here (terminal output only).

With `--comment`, post ONE summary comment via `gh pr comment $PR_NUMBER --body "..."` containing: confirmed-issue count (raw → confirmed), the Blocking/Important lists with GitHub permalinks, the summary table, and the validation hit rate. If zero confirmed issues, post the clean-review variant ("No issues found. Agents dispatched: […]. Findings: 0 confirmed of X raw.").

Permalink format (exact, or GitHub won't render):
```
https://github.com/OWNER/REPO/blob/FULL_SHA/path/to/file.ext#LSTART-LEND
```
`FULL_SHA` = full 40-char `git rev-parse HEAD`; include ≥1 context line on each side in the range.

## Recap — non-negotiables

- Diff scope only (unless `--full`); pre-existing issues are not findings.
- Every reported finding survived independent validation; LOW confidence → Open Questions, never dropped silently.
- goal-verifier is a verdict, not findings — separate report section.
- Clean review is a valid review.
- `--comment` requires an authenticated `gh` CLI.
