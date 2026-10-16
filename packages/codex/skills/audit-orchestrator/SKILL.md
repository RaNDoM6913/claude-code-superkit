---
name: audit-orchestrator
description: Run comprehensive parallel audit — dispatches specialized agents by scope (frontend, backend, infra, security)
user-invocable: true
tokens: 1702
---

# Audit Orchestrator

Run a structured audit by dispatching specialized audit agents in parallel.

**Scope**: Parse the user's request to determine scope and parameters. Accepted values: `frontend`, `backend`, `infra`, `security`, `all` (default: `all`).

## Dispatch Rules

Read applicable `AGENTS.md` instructions. Discover the runtime's delegation and result-collection tools before dispatch; use their actual supported arguments and project model/effort routing. Resolve each role from the session's skill catalog or the project's `.agents/skills/<name>/SKILL.md` / `.codex/skills/<name>/SKILL.md` (possibly aliases), read it directly, and pass its path to the worker. A skill name is not a registered agent type. Do not require a Claude plugin, global skill loader, or recursive invocation of this orchestrator.

Use authorized parallel delegation for independent scopes within available capacity. If unavailable, perform suitable role passes inline and disclose self-review. Required independent acceptance remains pending rather than being silently waived.

| Scope | Agents dispatched |
|-------|-------------------|
| `frontend` | audit-frontend |
| `backend` | audit-backend |
| `infra` | audit-infra (if available) |
| `security` | security-scanner |
| `all` | audit-frontend + audit-backend + audit-infra + security-scanner (schedule within actual capacity) |

Only dispatch roles with available resolved skill files. Record unavailable roles and their uncovered scope; missing mandatory coverage blocks acceptance. Optional unavailable coverage may remain explicitly nonblocking. Do not mark unavailable expertise N/A merely because it cannot run.

## Execution Steps

1. **Determine scope** from the user's request (default: `all`)

2. **Detect project structure** to tailor audit scope:
   - Scan for `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, `docker-compose.yml`
   - Map detected stacks to relevant audit agents

3. **Run relevant role passes** — use discovered delegation tools with clean scoped packets when supported, or the disclosed inline fallback. Workers may not recursively delegate unless assigned:
   - **audit-frontend** — UI/UX checks: hardcoded values, console.log, TypeScript strict, query patterns, accessibility, bundle size
   - **audit-backend** — API/logic checks: SQL safety, error handling, PII leaks, auth gaps, input validation, stubs
   - **audit-infra** — Infrastructure checks: Docker security, exposed ports, env secrets, health checks, resource limits
   - **security-scanner** — Cross-cutting security: OWASP top-10, secrets in code, dependency vulnerabilities, auth bypass, CORS, rate limiting

4. **Collect results** using the runtime's supported result tools; retain failures, unavailable coverage and partial returns.

5. **Merge and deduplicate** by root cause and impact, preserving distinct issues on the same line, role-specific severity/confidence, prior unresolved findings, and evidence gaps. Do not inflate severity or turn missing evidence into a demonstrated defect.

6. **Output unified report**

## Agent Prompt Template

For each agent, send this prompt:
```
Review the applicable checks in your assigned scope using your skill's evidence rules.
Role instructions: {resolved installed SKILL.md path; read before auditing}
Model/effort: {supported route from task/project policy}
Scope: {scope, exact revision/diff/base, components/environments, exclusions}
Criteria: {mandatory versus optional checks and required acceptance}
Authority: review only; no fixes, installs/upgrades, exploit probes, credential tests,
external scans, service/infrastructure changes or external writes. Use only existing
task-authorized checks; redact secrets/private data at collection before output.
Evidence: {recorded checks/results bound to unchanged code, inputs and environment}
Return native findings and severity/confidence, coverage COMPLETE/PARTIAL/UNAVAILABLE,
and per-check PASS/WARN/FAIL/UNKNOWN/N/A where supported, with evidence and N/A reasons.
Retain mandatory unknowns and prior unresolved findings. Zero findings is valid.
Report Progression ALLOWED/BLOCKED against the assigned criteria. Include required
unknowns as action items alongside defects; do not repeat unavailable checks indefinitely.
Disclose independent versus inline execution, requested/configured model/effort and
separate runtime-observed identity with evidence or UNVERIFIED. Unknown identity alone
does not introduce an acceptance gate.
```

## Output Format

After collecting all agent results, produce a unified report:

```
## Audit Report
Scope: {scope}
Date: {date}
Roles / execution mode: {delegated or inline passes, unavailable roles}

### Frontend (audit-frontend)
[results, justified N/A for absent frontend, or UNAVAILABLE with uncovered scope]

### Backend (audit-backend)
[results, justified N/A for absent backend, or UNAVAILABLE with uncovered scope]

### Infrastructure (audit-infra)
[results, justified N/A, or UNAVAILABLE with uncovered scope]

### Security (security-scanner)
[results from agent]

### Grand Summary
| Agent | PASS | WARN | FAIL | UNKNOWN | N/A | Coverage | Progression |
|-------|------|------|------|---------|-----|----------|-------------|
| frontend | X | Y | Z | U | N | ... | ... |
| backend | X | Y | Z | U | N | ... | ... |
| infra | X | Y | Z | U | N | ... | ... |
| security | X | Y | Z | U | N | ... | ... |

### Required Action Items
1. [agent] file:line or evidence reference — supported defect or mandatory evidence gap
2. ...
Overall progression: ALLOWED | BLOCKED — mandatory criteria and unresolved conditions
```

Preserve each role's native findings: security-scanner uses CRITICAL/WARNING/SUGGESTION plus HIGH/MEDIUM/LOW confidence; audit-infra supplies per-check status and finding severity/confidence. Status counts are coverage evidence, not severity counts or a completion percentage. Do not mechanically convert CRITICAL to FAIL without the applicable criterion, or drop a required WARNING because its name differs. If a role supplies only findings, derive status only from its actual coverage/evidence; absent evidence remains UNKNOWN. PASS requires complete assigned coverage, fulfilled mandatory conditions and no unresolved material issue. Optional concerns may remain WARN; any required unknown, unavailable review or pending mandatory acceptance makes overall progression BLOCKED even with zero FAILs. A scoped clean audit does not establish universal OWASP coverage or authorize remediation, deployment or release.

## Notes
- Parallel execution and isolated worker contexts depend on the available runtime; report the mode actually used.
- Overlapping checks (e.g., SQL injection in both backend and security) are deduplicated
- For targeted re-audit after fixes, specify a narrower scope
