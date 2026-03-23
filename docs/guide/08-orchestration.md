# Chapter 8: Orchestration

Orchestration is where the superkit's components work together. Commands dispatch agents in parallel, collect results, and produce unified reports. This chapter explains how the three main orchestrators -- `/dev`, `/review`, and `/audit` -- work internally.

## The /dev Pipeline: 8 Phases

`/dev <task>` is the full development orchestrator. It takes a task description and drives the entire cycle:

```
Phase 1: Understand     Detect stack, parse task, search codebase for patterns
                        |
Phase 2: Plan           Output structured checklist (DB, backend, frontend, docs)
                        |
Phase 3: Implement      Execute plan in dependency order (migration -> repo -> service -> handler -> routes -> UI)
                        |
Phase 4: Verify         Dispatch health-checker or run compiler directly
                        |
Phase 5: Test           Dispatch test-generator agent, run generated tests
                        |
Phase 6: Review         Dispatch reviewer agents in parallel based on changed file types
                        |
Phase 7: Document       Dispatch docs-checker or update docs manually
                        |
Phase 8: Report         Summary table: files changed, tests, review findings, commit message
```

Key design decisions:

- **Dependency order in Phase 3**: migrations before repos, repos before services, services before handlers. This prevents compile errors mid-implementation.
- **Agents in Phases 5-7 run independently**: test-generator, reviewer agents, and docs-checker have no dependencies on each other and can be dispatched in parallel.
- **Gate between phases**: if Phase 4 (verify) fails, Claude fixes errors before proceeding to Phase 5 (test).

## How /review Works

`/review` is the unified code review command. Its internal flow:

### Step 1: Detect changed files

```
/review             --> git diff --name-only HEAD~1
/review main        --> git diff --name-only main...HEAD
/review PR#42       --> gh pr diff 42 --name-only
/review --full      --> git ls-files (all tracked files)
```

It also gathers structured context: `git diff --stat`, full diff hunks, and recent commits (for intent).

### Step 2: Map files to agents

Each file extension/path maps to one or more reviewer agents:

| Pattern | Agents dispatched |
|---------|-------------------|
| `*.go` (not tests, not migrations) | go-reviewer, security-scanner |
| `*.sql` in migrations/ | migration-reviewer |
| `*.tsx` | ts-reviewer, design-system-reviewer |
| `*.ts` | ts-reviewer |
| `*.py` | py-reviewer, security-scanner |
| `*.rs` | rs-reviewer |
| `**/bot*/**` | bot-reviewer |

Rules:
- Each agent is dispatched **at most once** even if 50 Go files changed
- Only agents present in `.claude/agents/` are dispatched
- If no files match any pattern, the review stops with "No reviewable changes"

### Step 3: Parallel dispatch

All triggered agents run simultaneously. Each agent receives a filtered diff containing only the file hunks relevant to it:

- go-reviewer gets only `*.go` hunks
- ts-reviewer gets only `*.ts` and `*.tsx` hunks
- security-scanner gets all hunks (cross-cutting)

### Step 4: Collect and deduplicate

After all agents finish, results are merged:

1. If two agents flag the same `file:line`, keep the higher-severity finding
2. Group findings by severity: Blocking > Important > Nit
3. Produce a summary table showing each agent's finding counts and status (PASS/WARN/FAIL)

## How /audit Works

`/audit` dispatches specialized audit agents:

```
/audit frontend    --> audit-frontend
/audit backend     --> audit-backend
/audit security    --> security-scanner
/audit infra       --> audit-infra
/audit all         --> all 4 agents in parallel (default)
```

Each audit agent runs its full checklist against the codebase (not just changed files). The output is a unified report with per-agent sections and a grand summary table.

## Parallel Dispatch Mechanics

When a command says "dispatch agents in parallel," it means Claude sends multiple Agent tool calls in a single message. Claude Code's runtime executes them concurrently.

```
Message from Claude:
  [Agent call 1: go-reviewer with prompt "Review these Go files..."]
  [Agent call 2: ts-reviewer with prompt "Review these TS files..."]
  [Agent call 3: security-scanner with prompt "Scan all files..."]

--> All three run simultaneously in separate sub-conversations
--> Results return to the command's conversation
```

Guidelines for parallel dispatch:

- **Independent agents only**: agents that do not depend on each other's output
- **Shared context injection**: each agent gets the relevant subset of the diff
- **No cross-talk**: agents cannot see each other's findings during execution
- **Collection happens after**: the command waits for all agents to complete, then merges

## Collecting and Merging Results

After agents return, the orchestrator command:

1. **Merges** all findings into a single list
2. **Deduplicates** by `file:line` -- if multiple agents flag the same location, the highest severity wins
3. **Groups by severity** for the final report:

```
### Blocking
- [security-scanner] auth/handler.go:42 -- Missing auth middleware on /v1/admin/users

### Important
- [go-reviewer] services/feed/service.go:118 -- Error not wrapped with context

### Nit
- [ts-reviewer] components/Card.tsx:15 -- Consider extracting magic number 300 to a constant
```

4. **Summary table**:

```
| Agent | Blocking | Important | Nit | Status |
|-------|----------|-----------|-----|--------|
| go-reviewer | 0 | 1 | 0 | WARN |
| ts-reviewer | 0 | 0 | 1 | PASS |
| security-scanner | 1 | 0 | 0 | FAIL |
```

## Error Handling

| Scenario | What happens |
|----------|-------------|
| Agent times out | Reported as "Agent timed out" in its section; other agents' results still used |
| Agent returns no findings | Reported as "Clean -- no issues found" |
| Two agents conflict | Higher-severity finding wins; both agent names shown |
| Agent not found in .claude/agents/ | Skipped with a note: "Agent unavailable" |
| All agents return clean | Overall verdict: PASS |
