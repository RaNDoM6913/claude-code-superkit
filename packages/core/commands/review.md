---
description: Unified review orchestrator — detect changes, gather git context, dispatch reviewer agents in parallel, collect and deduplicate findings
argument-hint: "[base-branch | PR#number | --full] (default: HEAD~1)"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Unified Orchestrated Code Review

Detect changed files, enrich with git context, dispatch the right reviewer agents in parallel, collect and deduplicate findings.

## Target

$ARGUMENTS

## Step 1 — Detect Changed Files and Gather Context

Determine the diff base:
- If `$ARGUMENTS` matches `PR#NNN` or is a number: `gh pr diff $ARGUMENTS --name-only`
- If `$ARGUMENTS` is a branch name: `git diff --name-only $ARGUMENTS...HEAD`
- If `$ARGUMENTS` is `--full`: review all tracked files (`git ls-files`)
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
- Only dispatch agents that are actually available in the project's `.claude/agents/` directory
- If no files match any pattern, report "No reviewable changes detected" and stop
- List the dispatch plan before executing (agent name + matched file count)

## Step 3 — Dispatch Agents in Parallel

All reviewer agents are independent — dispatch ALL triggered agents simultaneously using parallel Agent calls.

**Context injection:** When dispatching agents, include in each prompt:
"Start with Phase 0 — read project docs (CLAUDE.md/AGENTS.md + relevant docs/architecture/ files) before starting your review."

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

Groups 1 and 2 have no dependencies — dispatch ALL simultaneously.

For each agent, inject the `REVIEW_CONTEXT` block into the prompt:

```
You are reviewing code changes.

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
