---
description: Unified review orchestrator — detect changes, inject git context, dispatch reviewer agents in parallel, collect and deduplicate findings
argument-hint: "[base-branch | PR#number | --full] (default: HEAD~1)"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Unified Orchestrated Code Review

Detect changed files, enrich with git context, dispatch the right reviewer agents in parallel, collect and deduplicate findings.

Absorbs former `/review-pr` and `/review-with-context` commands.

## Target

$ARGUMENTS

## Step 1 — Detect Changed Files and Gather Context

Determine the diff base:
- If `$ARGUMENTS` matches `PR#NNN` or is a number: `gh pr diff $ARGUMENTS --name-only`
- If `$ARGUMENTS` is a branch name: `git diff --name-only $ARGUMENTS...HEAD`
- If `$ARGUMENTS` is `--full`: review all tracked files (no diff filter)
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
<full diff, truncated to 8000 chars per agent if needed>
=== END CONTEXT ===
```

Run the command and capture the list of changed files.

## Step 2 — Map Files to Agents

Based on file path patterns, build a dispatch plan. Each pattern maps to one or more agents:

| File Pattern | Agents |
|---|---|
| `backend/**/*.go` (excluding migrations) | **go-reviewer**, **security-scanner** |
| `backend/migrations/*.sql` | **migration-reviewer** |
| `frontend/src/**/*.tsx` | **ts-reviewer**, **onyx-ui-reviewer** |
| `frontend/src/**/*.ts` | **ts-reviewer** |
| `frontend/src/api/**` | **api-contract-sync** |
| `tgbots/**/*.go` | **bot-reviewer**, **go-reviewer** |
| `adminpanel/**/*.tsx` | **ts-reviewer** |
| `adminpanel/**/*.ts` | **ts-reviewer** |

Rules:
- A single agent is dispatched **at most once** even if multiple files match
- If no files match any pattern, report "No reviewable changes detected" and stop
- List the dispatch plan before executing (agent name + matched file count)

## Step 3 — Dispatch Agents in Parallel

Group agents by independence — all reviewer agents are independent and can run in parallel:

**Parallel Group 1 (code quality)**:
- go-reviewer (if triggered)
- ts-reviewer (if triggered)
- onyx-ui-reviewer (if triggered)
- bot-reviewer (if triggered)
- migration-reviewer (if triggered)

**Parallel Group 2 (cross-cutting)**:
- security-scanner (if triggered)
- api-contract-sync (if triggered)

Groups 1 and 2 have no dependencies — dispatch ALL triggered agents simultaneously using parallel Agent calls.

For each agent, inject the `REVIEW_CONTEXT` block into the prompt:

```
You are reviewing code changes for the TGApp project.

{REVIEW_CONTEXT — filtered to files relevant to this agent}

## Your Task
Review the diff hunks above against your checklist. The recent commits section
provides intent — use it to judge whether changes are complete and consistent.

Focus on:
- Changes that contradict the stated commit intent
- Missing pieces (e.g., commit says "add endpoint" but no route registration)
- Regressions in existing patterns

Report findings in your standard output format.
```

**Per-agent diff filtering**:
- **go-reviewer**: only `*.go` hunks (excluding `*_test.go`, migrations)
- **ts-reviewer**: only `*.ts` and `*.tsx` hunks
- **onyx-ui-reviewer**: only `frontend/src/**/*.tsx` hunks
- **migration-reviewer**: only `backend/migrations/*.sql` hunks
- **security-scanner**: all hunks (cross-cutting concern)
- **api-contract-sync**: `routes.go` + `handlers/*.go` + `frontend/src/api/*.ts` + `openapi.yaml` hunks
- **bot-reviewer**: only `tgbots/**/*.go` hunks

## Step 4 — Collect and Deduplicate Findings

After all agents complete:

1. **Merge** all findings into a unified report
2. **Deduplicate**: if two agents flag the same file:line, keep the higher-severity finding
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

Status: **FAIL** if any blocking finding, **WARN** if important-only, **PASS** if nits-only or clean.

### Overall Verdict

**PASS / WARN / FAIL** — one-line summary of the most critical finding.
