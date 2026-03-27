---
description: Run a predefined workflow template — bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
argument-hint: <template> [task-description]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Workflow Templates

Run a predefined workflow tailored to a specific task type. Each template defines which phases to execute and which agents to dispatch.

## Task

$ARGUMENTS

## Available Templates

### `bugfix` — Triage, fix, verify, test

For bug reports and regressions.

**Phases:**
1. **Triage** — reproduce the bug, identify root cause (dispatch **debug-observer**)
2. **Fix** — implement the fix following existing patterns
3. **Verify** — run compilation checks, ensure no regressions
4. **Test** — add regression test, run full suite

### `hotfix` — Fix, test, deploy-check

For urgent production issues. Minimal process, maximum speed.

**Phases:**
1. **Fix** — implement the minimal fix (no refactoring, no improvements)
2. **Test** — run existing tests, add regression test if quick
3. **Deploy-check** — verify build succeeds, no breaking changes to API/DB

### `spike` — Scope, research, summarize

For exploration and investigation. No code changes — research only.

**Phases:**
1. **Scope** — define what we're investigating and success criteria
2. **Research** — explore codebase, read docs, search for patterns, check dependencies
3. **Summarize** — structured findings with recommendations and next steps

> Spike produces a report, not code. Use findings to plan implementation separately.

### `refactor` — Inventory, plan, migrate, verify

For restructuring code without changing behavior.

**Phases:**
1. **Inventory** — list all files/functions affected, map dependencies
2. **Plan** — define the target structure, migration order, rollback strategy
3. **Migrate** — execute changes in dependency order (leaf files first)
4. **Verify** — compilation clean, all tests pass, no behavior changes (dispatch **health-checker**)

### `dep-upgrade` — Assess, upgrade, fix-breaking, verify

For dependency updates and vulnerability fixes.

**Phases:**
1. **Assess** — dispatch **dependency-checker** for full audit
2. **Upgrade** — apply updates in safe order (patches first, then minors, then majors)
3. **Fix-breaking** — resolve any breaking changes from major updates
4. **Verify** — compilation clean, tests pass, no regressions (dispatch **health-checker**)

### `security-audit` — Scan, triage, remediate, re-scan

For security review and hardening.

**Phases:**
1. **Scan** — dispatch **security-scanner** for full OWASP + config audit
2. **Triage** — prioritize findings by severity and exploitability
3. **Remediate** — fix CRITICAL and HIGH findings
4. **Re-scan** — dispatch **security-scanner** again to verify fixes, no new issues

## Execution Rules

1. **Parse template name** from the first word of `$ARGUMENTS`
2. **Parse task description** from the remaining arguments
3. **If no template specified** — list available templates and ask user to choose
4. **If template not recognized** — suggest the closest match
5. **Execute phases sequentially** — each phase must complete before the next starts
6. **Report after each phase** — show status, findings, or changes made

## Output Format

```
## Workflow Report: [template]

### Task
[Original task description]

### Phases
| Phase | Status | Duration | Notes |
|-------|--------|----------|-------|
| [phase] | [status] | [time] | [notes] |

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| path | Created/Modified | description |

### Next Steps
- [recommendations if any]
```

## Notes

- Workflows are opinionated shortcuts — they encode best practices for common task types
- For tasks that don't fit a template, use `/dev` instead
- Templates can be combined: fix a bug (`bugfix`), then upgrade the affected dep (`dep-upgrade`)
- All templates auto-detect the project stack (Go, TypeScript, Python, Rust)
