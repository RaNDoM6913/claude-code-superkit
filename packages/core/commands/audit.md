---
description: Run comprehensive parallel audit — dispatches specialized agents by scope (frontend, backend, infra, security)
argument-hint: "[frontend|backend|infra|security|all] [--health]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# Audit Orchestrator

Dispatch specialized audit agents in parallel and merge their reports into one unified audit report with a Grand Summary.

## Hard Rules

1. Dispatch all selected agents **in parallel** — a single message with multiple Agent tool calls.
2. Only dispatch agents that exist in the project's `.claude/agents/` directory. Skip unavailable agents with a note — never invent results for an agent that did not run.
3. Quote each agent's verdicts verbatim: audit-frontend / audit-backend / audit-infra each return exactly 12 checks with per-check `PASS`/`WARN`/`FAIL` plus notes; security-scanner returns findings with `CRITICAL`/`WARNING`/`SUGGESTION`. Never relabel one enum as the other — the only cross-mapping allowed is the Section Verdict table in Step 6.
4. Emit the Grand Summary ONLY after every dispatched agent has returned or its section is explicitly marked SKIPPED.
5. Grand Summary counts are copied from each agent's own `Summary:` line — each dispatched auditor row must sum to 12; the Total row must equal the column sums.
6. The audit is read-only — never modify project files.
7. Unrecognized scope argument → run `all` and state `unrecognized scope '<arg>' — defaulted to all` in the report header.

## Steps

### 1. Parse scope and mode

Consume `$ARGUMENTS`:

| Arguments | Action |
|-----------|--------|
| contain `--health` | Health mode → Step 2 |
| `frontend` \| `backend` \| `infra` \| `security` \| `all` | That scope → Step 3 |
| empty | Scope `all` → Step 3 |
| anything else | Scope `all` + header note (Hard Rule 7) → Step 3 |

**Done when:** exactly one scope, or health mode, is selected.

### 2. Health mode (only when `--health`)

Dispatch ONLY the **health-checker** agent (skip frontend/backend/infra/security audits) with:

```
Run all your health checks against the project codebase and emit your Project Health Dashboard.
```

Output health-checker's own Output Contract verbatim — the `Project Health Dashboard` block. The unified template below does NOT apply to health mode. If health-checker is not in `.claude/agents/`, report "health-checker unavailable — cannot run health mode" and stop.

**Done when:** the dashboard (or the unavailable note) is emitted. Stop here — skip Steps 3–7.

### 3. Detect structure and agent availability

- Glob for stack markers: `go.mod`, `package.json`, `pyproject.toml`, `Cargo.toml`, `docker-compose.yml`, `Dockerfile`.
- List `.claude/agents/` to confirm which of the scope's agents exist.

| Scope | Agents dispatched |
|-------|-------------------|
| `frontend` | audit-frontend |
| `backend` | audit-backend |
| `infra` | audit-infra |
| `security` | security-scanner |
| `all` | audit-frontend + audit-backend + audit-infra + security-scanner (up to 4 in parallel) |

**Done when:** the final dispatch list is fixed — the scope's agents minus unavailable ones (record each unavailable agent for its skip note).

### 4. Dispatch agents in parallel

One message, one Agent call per agent on the dispatch list.

Prompt for audit-frontend / audit-backend / audit-infra:

```
Run ALL checks from your checklist against the project codebase.
Scope: {scope}
Report every check as PASS/WARN/FAIL with evidence.
End with summary counts and action items for FAILs.
```

Prompt for security-scanner:

```
Run your full security scan against the project codebase.
Report per your Output Contract: [SEVERITY/CONFIDENCE] findings
(CRITICAL/WARNING/SUGGESTION), Risk Summary counts, Mitigation Roadmap.
```

**Done when:** every agent on the dispatch list has been called in a single message.

### 5. Collect and validate reports

For each returned report:

- **12-check auditors** (audit-frontend / audit-backend / audit-infra): verify 12 check lines (#1–#12) plus a `Summary: X PASS, Y WARN, Z FAIL` line where X+Y+Z = 12. If the agent reports a no-target line instead (e.g. `NO BACKEND DETECTED — 0 checks run`), record its section as SKIPPED quoting that exact line. Malformed report (missing check lines, counts that do not sum) → keep what was returned and append `CONTRACT VIOLATION: <what is missing>` to that section; do not fabricate missing lines.
- **security-scanner**: capture Findings, the `Risk Summary` counts (N CRITICAL, N WARNING, N SUGGESTION), and the Mitigation Roadmap.

**Done when:** every dispatched agent has a captured report or a SKIPPED note.

### 6. Aggregate into the Grand Summary

Section verdict per agent:

| Agent result | Section verdict |
|--------------|-----------------|
| ≥1 FAIL (auditor) or ≥1 CRITICAL (security-scanner) | FAIL |
| no FAIL/CRITICAL, ≥1 WARN (auditor) or ≥1 WARNING (security-scanner) | WARN |
| all checks PASS, or 0 CRITICAL and 0 WARNING | PASS |
| not dispatched, or no target detected | SKIPPED |

Critical Action Items = every auditor FAIL action item + every security-scanner CRITICAL finding. Dedup rule: the same `file:line` flagged by multiple agents appears once, at the highest severity (FAIL/CRITICAL over WARN/WARNING), naming both agents. Per-agent sections stay verbatim — dedup applies only to this list.

**Done when:** Grand Summary table is filled from the agents' own Summary lines and the action-item list is deduped.

### 7. Emit the unified report

Produce the report exactly per the Output Format template below.

**Done when:** the report is emitted and every box in "Done ONLY when" is checked.

## Output Format

```
## Audit Report
Scope: {scope}   Date: {date}
Agents: {dispatched agents} | Skipped: {skipped agents, or "none"}
{if applicable: unrecognized scope '<arg>' — defaulted to all}

### Frontend (audit-frontend) — {PASS|WARN|FAIL|SKIPPED}
{agent's full report verbatim, or "Skipped — no frontend detected / agent unavailable"}

### Backend (audit-backend) — {PASS|WARN|FAIL|SKIPPED}
{agent's full report verbatim, or "Skipped — no backend detected / agent unavailable"}

### Infrastructure (audit-infra) — {PASS|WARN|FAIL|SKIPPED}
{agent's full report verbatim, or "Skipped — agent unavailable"}

### Security (security-scanner) — {PASS|WARN|FAIL|SKIPPED}
{agent's full report verbatim, or "Skipped — agent unavailable"}

### Grand Summary
| Section | Verdict | PASS | WARN | FAIL |
|----------|---------|------|------|------|
| frontend | {V} | X | Y | Z |
| backend | {V} | X | Y | Z |
| infra | {V} | X | Y | Z |
| **Total** | | **X** | **Y** | **Z** |

Security: N CRITICAL, N WARNING, N SUGGESTION → section verdict {V}
(each dispatched auditor row sums to 12; SKIPPED rows show — / — / —)

### Critical Action Items (auditor FAILs + security CRITICALs, deduped)
1. [agent] file:line — description
{or: none — no FAILs and no CRITICAL findings}
```

For a targeted re-audit after fixes, run a specific scope: `/audit backend`.

## Done ONLY when

- [ ] Every dispatched agent returned a report, or its section is marked SKIPPED with a reason — no section blank, no section invented.
- [ ] Grand Summary counts equal the sum of the per-agent Summary lines (each dispatched auditor row sums to 12; Total equals the column sums).
- [ ] Every auditor FAIL and every security-scanner CRITICAL appears exactly once in Critical Action Items (deduped by file:line, highest severity kept).

## Recap

- Parallel dispatch in a single message; only agents present in `.claude/agents/` — skipped agents get a note, never invented results.
- Verbatim enums: auditors report 12 checks each as PASS/WARN/FAIL; security-scanner reports CRITICAL/WARNING/SUGGESTION; cross-mapping only via the Section Verdict table.
- Grand Summary only after every dispatched agent returned or was marked SKIPPED; counts copied from the agents' own Summary lines.
- `--health` → health-checker only, its Project Health Dashboard verbatim.
- Read-only orchestration; unrecognized scope defaults to `all` with a header note.
