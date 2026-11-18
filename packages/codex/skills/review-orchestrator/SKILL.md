---
name: review-orchestrator
description: Coordinate requested code review or required review gates by identifying changed scope, selecting available reviewers, and consolidating evidence and findings.
user-invocable: true
tokens: 2276
---

# Unified Orchestrated Code Review

Detect changed scope, gather relevant context, use available and authorized reviewers, and collect/deduplicate findings. Review is read-only: do not fix files, post comments, merge, or perform external writes without a separate authorized action. Follow project model/effort routing; Astra accepts high-risk decisions, while Sol may gather evidence or review bounded scope.

## Target

Parse the user's request to determine scope and parameters. Accepted formats:
- `PR#NNN` or a number — review a pull request
- A branch name — diff against that branch
- `--full` — review all tracked files
- Empty — default to the last committed change (`HEAD~1..HEAD`)

Read applicable `AGENTS.md` instructions. Resolve role files from the current skill catalog or the project's `.agents/skills/<name>/SKILL.md` / `.codex/skills/<name>/SKILL.md` and read the selected file directly. These paths may alias the same installation. Pass the resolved role path to workers; skill names are not automatically registered agent types. Discover runtime tools instead of assuming a global skill loader, a Claude plugin, or a particular delegation API. Do not recursively invoke this orchestrator to load a role.

## Step 1 — Detect Changed Files and Gather Context

Bind the file list, statistics, contents, and line references to one review target. Validate user-supplied refs/PR identifiers as data and pass them as quoted arguments, never as executable shell text.
- PR: use an available read-only provider tool or installed `gh` to obtain repository identity, base/head SHAs, changed files and the PR diff. Read supporting files at that head; local `HEAD` is not a substitute. If the head changes during review, refresh affected evidence or report the reviewed SHA as stale.
- Branch/ref: resolve it to a commit and review the merge-base-to-`HEAD` diff; use that same range for names, statistics and hunks.
- `--full`: review tracked files at a declared snapshot. State whether current working changes are included.
- Empty: review the last committed change, `HEAD~1..HEAD`, consistently for names, statistics and hunks; exclude unstaged/staged changes unless requested. If no parent exists, review the initial commit against the empty tree or ask for the intended target.

Collect relevant commit messages from that target as intent evidence. For a requested working-tree review, identify staged, unstaged and selected untracked scope separately; otherwise name excluded working-tree and untracked changes in the context. Missing access or unavailable diff content means incomplete coverage, not a fallback to unrelated local changes. A ref, PR or base that does not resolve stops the review as incomplete with the failing command; never substitute an empty or guessed base, whose empty diff would read as clean. A file list and hunks that disagree for the same target are also incomplete; an empty target is reported as no changes, not as a clean review.

Build a `REVIEW_CONTEXT` block:
```
=== REVIEW CONTEXT ===
## Changed Files (N files, +X/-Y lines)
<statistics and base/head or working-snapshot identity for the selected target>

## Recent Commits (intent)
<relevant commit messages from the selected review target>

## Diff Hunks
<relevant complete diff, or exact references the reviewer can read>
=== END CONTEXT ===
```

## Step 2 — Map Files to Agents

Based on file extension and path patterns, build a dispatch plan. Each pattern maps to one or more agents:

| File Pattern | Agents |
|---|---|
| `*.go` (excluding `*_test.go`, `migrations/`) | **go-reviewer**, **security-scanner** |
| SQL migration paths | **migration-reviewer**, **database-reviewer** |
| ORM schema/models (including Prisma and Drizzle), query SQL including sqlc | **database-reviewer** |
| `*.tsx` | **ts-reviewer**, **design-system-reviewer** |
| `*.vue`, `*.svelte` | **design-system-reviewer** |
| `*.ts` | **ts-reviewer** |
| `*.py` | **py-reviewer**, **security-scanner** |
| `*.rs` | **rs-reviewer** |
| Bot code in Go, Python, TypeScript, JavaScript or Rust | **bot-reviewer** |
| OpenAPI/Swagger definitions in YAML or JSON, GraphQL schemas, protobuf API contracts | **api-contract-sync** |

Rules:
- A single agent is dispatched **at most once** even if multiple files match
- Only dispatch roles with an available resolved skill file; missing required expertise remains uncovered and blocks acceptance.
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
- migration-reviewer and database-reviewer (as mapped above)
- design-system-reviewer (if triggered)

**Parallel Group 2 (cross-cutting)**:
- security-scanner (if triggered)
- api-contract-sync (if triggered)

Groups 1 and 2 can run concurrently when their assigned scopes are independent and runtime capacity permits. Reviewers may not recursively delegate unless assigned.

Use the goal-verifier verdict track when an implementation plan binds the reviewed changes to specific goals. Give it the matching plan, requested outcomes and **all** reviewed hunks. Record absence of a matching plan when relevant. Capture its Overall verdict, goal-level evidence, issues and verification gaps verbatim alongside the reviewer findings.

For each findings-based reviewer, inject the `REVIEW_CONTEXT` block into the prompt:

```
You are reviewing code changes.

Model/effort: <explicit supported route from task/project policy>
Role instructions: <resolved installed SKILL.md path; read before reviewing>
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
- **database-reviewer**: migration, ORM, schema and query changes with their callers
- **api-contract-sync**: API definitions and corresponding changed producers/consumers
- **security-scanner**: all hunks in the assigned security review
- **bot-reviewer**: bot-related file hunks only
- **design-system-reviewer**: relevant UI component hunks, including TSX, Vue and Svelte

**Specialist handoffs.** Reviewers recommend deeper passes instead of delegating; for example, go-reviewer may name `go-error-reviewer`, `go-concurrency-reviewer`, `go-performance-reviewer`, `go-modernizer`, `go-observability-reviewer`, `database-reviewer` or `security-scanner`. After the first reviews return, collect every recommendation with its location and reason. Run each recommended role once, when its skill file resolves and it has not already reviewed that scope in this review, with the same review target, its filtered context and the recommendation reasons. Run one follow-up round only. Record each recommendation not run — role unavailable, follow-up round already used, or the earlier pass did not receive that file — as uncovered scope with its reason in the Step 4 summary; never drop it.

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

| Agent | Non-zero findings by severity (or No findings) | Coverage | Status and grounds |
|-------|-----------------------------------------------|----------|--------------------|
| <role> | <counts> | <covered and unreviewed scope> | <PASS / WARN / FAIL and reason> |

Status: **FAIL** if a supported blocking finding or unresolved mandatory acceptance condition prevents progression; distinguish defects from missing evidence. **WARN** for non-blocking concerns or partial optional coverage. **PASS** only when assigned coverage is complete, mandatory conditions are met, and remaining items are nits-only or clean. Carry each reviewer's coverage and evidence status into the summary; no findings is not proof of complete review.

### Overall Verdict

**PASS / WARN / FAIL** — one-line reason, coverage, and any required next action. Preserve native plan-checker/evaluator/goal-verifier/critic verdicts when included; do not translate unresolved mandatory criteria into PASS. Missing required capability ends the review with an incomplete result, not endless retries.
