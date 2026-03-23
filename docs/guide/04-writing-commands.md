# Chapter 4: Writing Commands

Commands are slash-invoked workflows that Claude executes as structured instructions. They can orchestrate agents, run tools, and produce reports. The user types `/command-name <arguments>` and Claude follows the command's Markdown as a step-by-step plan.

## Command Format

Command files are Markdown with YAML frontmatter. Place them in `.claude/commands/`.

```yaml
---
description: One-line description (shown when user types /help)
argument-hint: <what-the-user-types-after-the-command>
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent
---
```

**Frontmatter fields:**

| Field | Purpose |
|-------|---------|
| `description` | Shown in `/help` listing and used by Claude to understand the command |
| `argument-hint` | Placeholder text shown to the user (e.g., `<task-description>`, `[--fix]`) |
| `allowed-tools` | Tools the command is allowed to use. Add `Agent` to dispatch sub-agents |

## The $ARGUMENTS Variable

`$ARGUMENTS` is replaced with whatever the user types after the command name.

```markdown
## Target
$ARGUMENTS
```

If the user types `/review main..HEAD`, then `$ARGUMENTS` becomes `main..HEAD`. If no arguments are given, it becomes an empty string -- your command should handle that case with a default.

## Orchestrator Pattern

The most powerful commands are multi-phase orchestrators. Not every command needs all phases -- pick what fits:

```
Phase 1: Understand  --> Read codebase, detect stack, find patterns
Phase 2: Plan        --> Output structured checklist of changes
Phase 3: Execute     --> Create/modify files in dependency order
Phase 4: Verify      --> Run compiler/linter checks
Phase 5: Test        --> Generate and run tests
Phase 6: Review      --> Dispatch reviewer agents (parallel)
Phase 7: Document    --> Update docs, API specs, READMEs
Phase 8: Report      --> Summary table with results
```

Simple commands like `/lint` or `/test` need only 2--3 phases (detect, run, report).

## Dispatching Agents from Commands

Use the `Agent` tool to run agents from within commands. The key patterns:

**Parallel dispatch** -- independent agents run simultaneously:

```markdown
## Step 3: Dispatch Agents in Parallel

All reviewer agents are independent -- dispatch ALL triggered agents
simultaneously using parallel Agent tool calls:

- go-reviewer (if .go files changed)
- ts-reviewer (if .ts/.tsx files changed)
- security-scanner (if any auth/payment code changed)
```

**Sequential dispatch** -- one agent depends on another's result:

```markdown
## Step 4: Verify

1. Dispatch health-checker agent
2. If health check passes --> dispatch test-generator agent
3. If tests pass --> dispatch reviewer agents (parallel)
```

## Auto-Detection Patterns

Commands should work in any project by detecting the stack from marker files:

```markdown
## Step 1: Detect Stack

Scan the project root and subdirectories:

| Marker File | Stack | Test Command |
|-------------|-------|-------------|
| `go.mod` | Go | `go test ./... -count=1` |
| `package.json` + `tsconfig.json` | TypeScript | `npx vitest run` or `npx jest` |
| `pyproject.toml` | Python | `pytest` |
| `Cargo.toml` | Rust | `cargo test` |
| `Makefile` with `test` target | Any | `make test` |
```

This lets `/test` work equally well in a Go backend and a React frontend without hardcoded paths.

## Input Parsing

Handle different argument shapes for flexible commands:

```markdown
## Mode Selection

Parse `$ARGUMENTS`:
- If empty --> default behavior (e.g., diff against HEAD~1)
- If matches `PR#NNN` or a number --> fetch PR diff via gh CLI
- If matches a branch name --> diff against that branch
- If matches `--full` --> operate on all tracked files
```

## Full Example: /deploy Orchestrator

Create `.claude/commands/deploy.md`:

```markdown
---
description: Pre-deploy validation -- run tests, audit security, verify docs, check migrations
argument-hint: "[staging|production]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Pre-Deploy Validation

Validate the project is ready for deployment by running tests, security audit,
and documentation checks.

## Target Environment

$ARGUMENTS (default: staging)

## Phase 1: Detect Stack and Gather State

1. Scan for `go.mod`, `package.json`, `Cargo.toml`, `pyproject.toml`
2. Run `git log --oneline -10` to see recent changes
3. Check for pending migrations: list migration files not yet applied
4. Check for uncommitted changes: `git status --short`

If uncommitted changes exist, warn and ask whether to proceed.

## Phase 2: Run Tests

Based on detected stack, run the full test suite (not -short):

- Go: `go test ./... -count=1 -race`
- TypeScript: `npx vitest run` or `npx jest`
- Python: `pytest --tb=short`

If any test fails, STOP and report failures. Do not proceed to deploy.

## Phase 3: Security Audit

Dispatch the **security-scanner** agent:

> Run ALL 18 checks against the codebase. This is a pre-deploy audit
> for the $ARGUMENTS environment. Report every finding.

If any CRITICAL finding exists, STOP and report. Do not proceed.

## Phase 4: Documentation Check

Dispatch the **docs-checker** agent (if available):

> Verify API specs match routes, READMEs are current, architecture docs
> reflect the actual code.

## Phase 5: Report

Output a deployment readiness report:

| Check | Status | Details |
|-------|--------|---------|
| Tests | PASS/FAIL | X passed, Y failed |
| Security | PASS/FAIL | N critical, M warnings |
| Docs | PASS/WARN | Up to date / N stale files |
| Migrations | OK/PENDING | N pending migrations |
| Uncommitted | CLEAN/DIRTY | N files |

**Verdict: READY / NOT READY**

If NOT READY, list the blocking items in priority order.
```

## Tips

- Always include `$ARGUMENTS` somewhere in the document so user input is accessible
- Reference agents by their exact filename (without `.md`)
- Keep commands focused -- one primary purpose per command
- For complex workflows, name each phase clearly so progress is visible
- Only include `Agent` in `allowed-tools` if the command actually dispatches agents
