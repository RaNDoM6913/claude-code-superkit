---
description: Unified review orchestrator — detect changes, dispatch reviewers, validate findings, optionally post GitHub inline comments
argument-hint: "[base-branch | PR#number | --full] [--comment] (default: HEAD~1)"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Unified Orchestrated Code Review

Detect changed files, enrich with git context, dispatch specialized reviewer agents in parallel, validate findings with independent verification agents, collect and deduplicate results. Optionally post inline comments on GitHub PRs.

## Target

$ARGUMENTS

## Step 1 — Parse Arguments and Detect Changes

**Parse flags:**
- `--comment` → enable GitHub PR inline comments (default: terminal only)
- Remaining arguments → diff target

**Determine diff base:**
- If target matches `PR#NNN` or is a number: `gh pr diff $TARGET --name-only`
- If target is a branch name: `git diff --name-only $TARGET...HEAD`
- If target is `--full`: review all tracked files (`git ls-files`)
- If empty: `git diff --name-only HEAD~1`

**Gather structured context:**

```bash
# Changed files with line counts
git diff --stat ${BASE}...HEAD

# Full diff hunks (for agent context injection)
git diff ${BASE}...HEAD

# Recent 5 commits (for intent)
git log --oneline -5

# PR title and description (if PR mode)
gh pr view $PR_NUMBER --json title,body 2>/dev/null
```

Build a `REVIEW_CONTEXT` block:
```
=== REVIEW CONTEXT ===
## PR Info (if available)
Title: <PR title>
Description: <PR body, first 500 chars>

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

## Step 3 — Dispatch Reviewer Agents in Parallel

All reviewer agents are independent — dispatch ALL triggered agents simultaneously.

**Context injection:** When dispatching agents, include in each prompt:
"Start with Phase 0 — read project docs (CLAUDE.md/AGENTS.md + relevant docs/architecture/ files) before starting your review."

**Parallel Group 1 (code quality)**:
- go-reviewer, ts-reviewer, py-reviewer, rs-reviewer, bot-reviewer, migration-reviewer, design-system-reviewer

**Parallel Group 2 (cross-cutting)**:
- security-scanner, api-contract-sync

Groups 1 and 2 have no dependencies — dispatch ALL simultaneously.

For each agent, inject the `REVIEW_CONTEXT` block:

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
Each finding MUST include: file path, line number(s), severity, confidence, description, evidence, suggested fix.
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

## Step 4 — Collect Raw Findings

After all agents complete, merge all findings into a single list. Each finding must have:
- `file` — file path
- `line` — line number or range
- `severity` — CRITICAL / WARNING / SUGGESTION
- `confidence` — HIGH / MEDIUM / LOW
- `agent` — which agent found it
- `description` — what's wrong
- `evidence` — what the agent sees in the code
- `fix` — suggested change

**Pre-filter**: immediately drop findings where:
- confidence is LOW (<60%)
- severity is SUGGESTION and agent is not the primary reviewer for that file type

This reduces the validation workload.

## Step 5 — Validate Findings (Double Verification)

For each remaining finding, launch a **parallel validation agent** (one per finding):

```
You are a code review validator. Your job is to independently verify whether
a reported issue is real.

## Reported Issue
- Agent: {agent_name}
- File: {file}:{line}
- Severity: {severity}
- Description: {description}
- Evidence: {evidence}

## Your Task
1. Read the file at the reported location
2. Read surrounding context (±20 lines)
3. Check if the issue is real:
   - Does the code actually have this problem?
   - Could this be a false positive? (pre-existing issue, intentional pattern, linter will catch it)
   - Is the severity appropriate?

## Verdict
Reply with exactly one of:
- CONFIRMED — the issue is real and correctly described
- DOWNGRADE — the issue exists but severity should be lower (explain why)
- REJECTED — false positive (explain why)

Be strict. When in doubt, REJECT. False positives waste more time than missed issues.
```

**Rules:**
- Launch ALL validation agents in parallel (they are independent)
- Each validator reads the actual file, not just the diff — this catches stale/wrong line references
- REJECTED findings are dropped entirely
- DOWNGRADED findings have their severity adjusted

## Step 6 — Deduplicate and Format Report

After validation:

1. **Drop** all REJECTED findings
2. **Apply** severity downgrades
3. **Deduplicate**: if two agents flag the same file:line, keep the higher-severity confirmed finding
4. **Group by severity**:

### Blocking (CRITICAL confirmed)
- [agent-name] file:line — description

### Important (WARNING confirmed)
- [agent-name] file:line — description

### Nit (SUGGESTION confirmed)
- [agent-name] file:line — description

5. **Summary table**:

| Agent | Blocking | Important | Nit | Raw | Confirmed | Status |
|-------|----------|-----------|-----|-----|-----------|--------|
| go-reviewer | 0 | 2 | 1 | 5 | 3 | PASS |
| ts-reviewer | 1 | 0 | 0 | 4 | 1 | FAIL |
| ... | | | | | | |

Status: **FAIL** if any blocking, **WARN** if important-only, **PASS** if nits-only or clean.

6. **Validation stats**: "X findings reported → Y confirmed (Z% hit rate)"

### Overall Verdict

**PASS / WARN / FAIL** — one-line summary of the most critical confirmed finding.

## Step 7 — Post GitHub Comments (if --comment)

**If `--comment` was NOT provided**: stop here. Output is terminal only.

**If `--comment` was provided and NO confirmed issues**: post summary comment:
```bash
gh pr comment $PR_NUMBER --body "## Code Review

No issues found. Checked for bugs, security, and convention compliance.

**Agents dispatched**: [list]
**Findings**: 0 confirmed (X raw → 0 after validation)"
```

**If `--comment` was provided and confirmed issues exist**:

Post a summary comment on the PR with all confirmed findings:
```bash
# Get the full SHA for link formatting
FULL_SHA=$(git rev-parse HEAD)

# Post summary comment
gh pr comment $PR_NUMBER --body "## Code Review

Found **N confirmed issues** (X raw findings → N after double verification).

### Blocking
- description ([file:line](https://github.com/OWNER/REPO/blob/${FULL_SHA}/file#LSTART-LEND))

### Important
- ...

| Agent | Blocking | Important | Nit | Status |
|-------|----------|-----------|-----|--------|
| ... |

Validation hit rate: Z%"
```

**Link format** (must be exact for GitHub rendering):
```
https://github.com/OWNER/REPO/blob/FULL_SHA/path/to/file.ext#LSTART-LEND
```
- Use full 40-char SHA (not abbreviated)
- `#L` notation with at least 1 line of context before and after

## Notes

- All agents run on **opus** model for maximum reasoning depth
- Double verification eliminates false positives — only confirmed issues reach the report
- The validation step adds ~30s but dramatically improves signal-to-noise ratio
- `--comment` requires `gh` CLI authenticated with repo access
- Pre-existing issues are filtered out — only changes in the diff are reviewed
