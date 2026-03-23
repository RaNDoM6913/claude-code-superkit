---
description: Run comprehensive parallel audit — dispatches 4 specialized agents (frontend, backend, bots, security)
argument-hint: "[frontend|admin|backend|bots|security|all]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# SocialApp Audit Orchestrator

Run a structured audit by dispatching specialized audit agents in parallel.

**Scope**: `$ARGUMENTS` (default: `all`)

## Dispatch Rules

Based on scope, launch the appropriate audit agents **in parallel** (single message, multiple Agent tool calls):

| Scope | Agents dispatched |
|-------|-------------------|
| `frontend` | audit-frontend |
| `admin` | audit-frontend (admin scope only) |
| `backend` | audit-backend |
| `bots` | audit-bots |
| `security` | audit-security |
| `all` | audit-frontend + audit-backend + audit-bots + audit-security (4 agents in parallel) |

## Execution Steps

1. **Determine scope** from `$ARGUMENTS` (default: `all`)
2. **Launch agents in parallel** — use `subagent_type` matching the agent name:
   - `audit-frontend` — user + admin frontend checks (15 checks: hardcoded values, mock data, console.log, useShallow, query keys, TypeScript compilation)
   - `audit-backend` — Go API checks (15 checks: SQL safety, error handling, PII leaks, auth gaps, stubs, currency)
   - `audit-bots` — Telegram bot checks (12 checks: goroutine safety, rate limits, callback data, keyboards, testability)
   - `audit-security` — cross-cutting security (12 checks: secrets, CORS, photo URLs, phone isolation, deps, payments)
3. **Collect results** from all agents
4. **Merge and deduplicate** — if the same file:line flagged by multiple agents, keep highest severity
5. **Output unified report**

## Agent Prompt Template

For each agent, send this prompt:
```
Run ALL checks from your checklist against the SocialApp codebase.
Scope: {scope}
Report every check as PASS/WARN/FAIL with evidence.
End with summary counts and action items for FAILs.
```

## Output Format

After collecting all agent results, produce a unified report:

```
## SocialApp Audit Report
Scope: {scope}
Date: {date}
Agents: {list of dispatched agents}

### Frontend (audit-frontend)
[results from agent]

### Backend (audit-backend)
[results from agent]

### Bots (audit-bots)
[results from agent]

### Security (audit-security)
[results from agent]

### Grand Summary
| Agent | PASS | WARN | FAIL |
|-------|------|------|------|
| frontend | X | Y | Z |
| backend | X | Y | Z |
| bots | X | Y | Z |
| security | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

### Critical Action Items (FAILs only)
1. [agent] file:line — description
2. ...
```

## Notes
- All 4 agents run in **parallel** — audit completes ~4x faster than sequential
- Each agent has its own context window — no pollution of main conversation
- Overlapping checks (e.g., SQL injection in both backend and security) are deduplicated
- For targeted re-audit after fixes, use specific scope: `/audit backend`
