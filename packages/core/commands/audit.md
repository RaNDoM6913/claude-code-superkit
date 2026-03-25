---
description: Run comprehensive parallel audit — dispatches specialized agents by scope (frontend, backend, infra, security)
argument-hint: "[frontend|backend|infra|security|all]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Audit Orchestrator

Run a structured audit by dispatching specialized audit agents in parallel.

**Scope**: `$ARGUMENTS` (default: `all`)

## Health Mode

If arguments contain `--health`:
- Dispatch ONLY **health-checker** agent (skip frontend/backend/infra/security audits)
- Produce a quick project health dashboard
- Use this for fast daily check-ups instead of full audit

> `/audit --health` takes ~30 seconds vs ~5 minutes for full audit.

## Dispatch Rules

Based on scope, launch the appropriate audit agents **in parallel** (single message, multiple Agent tool calls):

| Scope | Agents dispatched |
|-------|-------------------|
| `frontend` | audit-frontend |
| `backend` | audit-backend |
| `infra` | audit-infra (if available) |
| `security` | security-scanner |
| `all` | audit-frontend + audit-backend + audit-infra + security-scanner (up to 4 agents in parallel) |

Only dispatch agents that exist in the project's `.claude/agents/` directory. Skip unavailable agents with a note.

## Execution Steps

1. **Determine scope** from `$ARGUMENTS` (default: `all`)

2. **Detect project structure** to tailor audit scope:
   - Scan for `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, `docker-compose.yml`
   - Map detected stacks to relevant audit agents

3. **Launch agents in parallel** — dispatch all relevant agents simultaneously:
   - **audit-frontend** — UI/UX checks: hardcoded values, console.log, TypeScript strict, query patterns, accessibility, bundle size
   - **audit-backend** — API/logic checks: SQL safety, error handling, PII leaks, auth gaps, input validation, stubs
   - **audit-infra** — Infrastructure checks: Docker security, exposed ports, env secrets, health checks, resource limits
   - **security-scanner** — Cross-cutting security: OWASP top-10, secrets in code, dependency vulnerabilities, auth bypass, CORS, rate limiting

4. **Collect results** from all agents

5. **Merge and deduplicate** — if the same file:line flagged by multiple agents, keep highest severity

6. **Output unified report**

## Agent Prompt Template

For each agent, send this prompt:
```
Run ALL checks from your checklist against the project codebase.
Scope: {scope}
Report every check as PASS/WARN/FAIL with evidence.
End with summary counts and action items for FAILs.
```

## Output Format

After collecting all agent results, produce a unified report:

```
## Audit Report
Scope: {scope}
Date: {date}
Agents: {list of dispatched agents}

### Frontend (audit-frontend)
[results from agent, or "Skipped — no frontend detected / agent unavailable"]

### Backend (audit-backend)
[results from agent, or "Skipped — no backend detected / agent unavailable"]

### Infrastructure (audit-infra)
[results from agent, or "Skipped — agent unavailable"]

### Security (security-scanner)
[results from agent]

### Grand Summary
| Agent | PASS | WARN | FAIL |
|-------|------|------|------|
| frontend | X | Y | Z |
| backend | X | Y | Z |
| infra | X | Y | Z |
| security | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

### Critical Action Items (FAILs only)
1. [agent] file:line — description
2. ...
```

## Notes
- All agents run in **parallel** — audit completes much faster than sequential
- Each agent has its own context window — no pollution of main conversation
- Overlapping checks (e.g., SQL injection in both backend and security) are deduplicated
- For targeted re-audit after fixes, use specific scope: `/audit backend`
