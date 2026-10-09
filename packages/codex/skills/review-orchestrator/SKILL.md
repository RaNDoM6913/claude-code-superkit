---
name: review-orchestrator
description: Coordinate requested code review or required review gates by identifying changed scope, selecting available reviewers, and consolidating evidence and findings.
user-invocable: true
tokens: 1668
---

# Unified Orchestrated Code Review

Detect changed scope, gather relevant context, use available and authorized reviewers, and collect/deduplicate findings. Review is read-only: do not fix files, post comments, merge, or perform external writes without a separate authorized action. Follow project model/effort routing; Astra accepts high-risk decisions, while Sol may gather evidence or review bounded scope.

## Target

Parse the user's request to determine scope and parameters. Accepted formats:
- `PR#NNN` or a number — review a pull request
- A branch name — diff against that branch
- `--full` — review all tracked files
- Empty — default to `HEAD~1`

## Step 1 — Detect Changed Files and Gather Context

Determine the diff base:
- If target matches `PR#NNN` or is a number: `gh pr diff $TARGET --name-only`
- If target is a branch name: `git diff --name-only $TARGET...HEAD`
- If target is `--full`: review all tracked files (`git ls-files`)
- If empty: `git diff --name-only HEAD~1`

Gather structured context for agent prompts:

```bash
# Changed files with line counts
git diff --stat ${BASE}...HEAD

# Full diff hunks (for agent context injection)
git diff ${BASE}...HEAD

# Recent 5 commits (for intent)
git log --oneline -5
```

Build a `REVIEW_CONTEXT` block:
```
=== REVIEW CONTEXT ===
## Changed Files (N files, +X/-Y lines)
<git diff --stat output>

## Recent Commits (intent)
<git log --oneline -5>

## Diff Hunks
<relevant complete diff, or exact references the reviewer can read>
=== END CONTEXT ===
```

## Step 2 — Map Files to Agents

Based on file extension and path patterns, build a dispatch plan. Each pattern maps to one or more agents:

| File Pattern | Agents |
|---|---|
| `*.go` (excluding `*_test.go`, `migrations/`) | **go-reviewer**, **security-scanner** |
| `migrations/*.sql` or `db/migrate/*.sql` | **migration-reviewer** |
| `*.tsx` | **ts-reviewer**, **design-system-reviewer** |
| `*.ts` | **ts-reviewer** |
| `*.py` | **py-reviewer**, **security-scanner** |
| `*.rs` | **rs-reviewer** |
| `**/bot*/**/*.go` or `**/bot*/**/*.py` | **bot-reviewer** |
| `*.yaml` / `*.yml` (OpenAPI/config) | **api-contract-sync** (if available) |

Rules:
- A single agent is dispatched **at most once** even if multiple files match
- Only dispatch agents that are actually available in the project's skills directory
- If no pattern matches, report the unmatched scope and whether a suitable generic review is available; do not call unreviewed changes a clean pass.
- List the dispatch plan before executing (agent name + matched file count)

## Step 3 — Dispatch Agents in Parallel

Inspect available delegation tools and authorization before dispatch. For independent scopes, use supported concurrency within available slots and clean worker contexts with explicit model/effort. Supply scope, read-only authority, criteria, relevant evidence, and required output. If delegation or routing is unavailable, perform suitable skills as separate inline passes and disclose self-review; mandatory independence/Astra acceptance remains pending.

**Parallel Group 1 (code quality)**:
- go-reviewer (if triggered)
- ts-reviewer (if triggered)
- py-reviewer (if triggered)
- rs-reviewer (if triggered)
- bot-reviewer (if triggered)
- migration-reviewer (if triggered)
- design-system-reviewer (if triggered)

**Parallel Group 2 (cross-cutting)**:
- security-scanner (if triggered)
- api-contract-sync (if triggered)

Groups 1 and 2 can run concurrently when their assigned scopes are independent and runtime capacity permits. Reviewers may not recursively delegate unless assigned.

For each agent, inject the `REVIEW_CONTEXT` block into the prompt:

```
You are reviewing code changes.

Model/effort: <explicit supported route from task/project policy>
Authority: read-only; no edits or external writes.
Scope/criteria: <exact diff identity, owned review scope, requested contract>
Existing evidence: <commands/results bound to code, inputs, and environment>

{REVIEW_CONTEXT — filtered to files relevant to this agent}

## Your Task
Review the diff hunks above against your checklist. The recent commits section
provides intent — use it to judge whether changes are complete and consistent.

Focus on:
- Changes that contradict the stated commit intent
- Missing pieces (e.g., commit says "add endpoint" but no route registration)
- Regressions in existing patterns

Report findings in your standard format, plus coverage (COMPLETE/PARTIAL/UNAVAILABLE), evidence references, and unresolved mandatory criteria. Zero findings is valid. Mark any unreviewed scope explicitly. Reuse results only for unchanged relevant code, inputs, environment, and recorded command/results; rerun for concrete uncertainty or relevant change.
```

**Per-agent diff filtering** — only include relevant file hunks:
- **go-reviewer**: `*.go` hunks (excluding `*_test.go`, migrations)
- **ts-reviewer**: `*.ts` and `*.tsx` hunks
- **py-reviewer**: `*.py` hunks
- **rs-reviewer**: `*.rs` hunks
- **migration-reviewer**: `*.sql` migration hunks only
- **security-scanner**: all hunks (cross-cutting concern)
- **bot-reviewer**: bot-related file hunks only
- **design-system-reviewer**: `*.tsx` / `*.vue` / `*.svelte` UI component hunks

## Step 4 — Collect and Deduplicate Findings

After all agents complete:

1. **Merge** all findings into a unified report
2. **Deduplicate** by root cause and impact, preserving distinct issues on the same line and unresolved blockers from prior reviews.
3. **Group by severity**:

### Blocking
- [agent-name] file:line — description

### Important
- [agent-name] file:line — description

### Nit
- [agent-name] file:line — description

4. **Summary table**:

| Agent | Blocking | Important | Nit | Status |
|-------|----------|-----------|-----|--------|
| go-reviewer | 0 | 2 | 1 | PASS |
| ts-reviewer | 1 | 0 | 3 | FAIL |
| ... | | | | |

Status: **FAIL** if a supported blocking finding or unresolved mandatory acceptance condition prevents progression; distinguish defects from missing evidence. **WARN** for non-blocking concerns or partial optional coverage. **PASS** only when assigned coverage is complete, mandatory conditions are met, and remaining items are nits-only or clean. Carry each reviewer's coverage and evidence status into the summary; no findings is not proof of complete review.

### Overall Verdict

**PASS / WARN / FAIL** — one-line reason, coverage, and any required next action. Preserve native plan-checker/evaluator/goal-verifier/critic verdicts when included; do not translate unresolved mandatory criteria into PASS. Missing required capability ends the review with an incomplete result, not endless retries.
