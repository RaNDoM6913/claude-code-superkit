---
description: Run a predefined workflow template — bugfix, hotfix, spike, refactor, dep-upgrade, security-audit
argument-hint: <template> [task-description]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Workflow Templates

Run one of six opinionated workflow templates. Each template fixes an ordered list of phases and the agents to dispatch, so common task types follow the same proven path every time.

## Target

$ARGUMENTS

## Hard Rules

1. Run only the template named in Target. If Target names none, or the first word matches no template, do not guess — follow Step 3 or Step 4 and stop until the user answers.
2. Execute a template's phases in listed order. A phase begins only after the previous phase's done-when condition holds.
3. Report status after every phase, and emit the Workflow Report only when every executed phase has a status row.
4. On a failed gate or retry, escalate effort to `max` for the next attempt and state that you are doing so — never silently re-run at the same effort.
5. spike produces a report only (no code changes); hotfix applies the minimal fix (no refactoring, no improvements).
6. When consuming security-scanner output, use its exact enums — Severity CRITICAL/WARNING/SUGGESTION, Confidence HIGH/MEDIUM/LOW.
7. For tasks that fit no template, tell the user to use `/dev` instead of forcing a template.

## Steps

1. Read the template name from the first word of Target. Done when: the name equals one of the six templates below, or you route to Step 3/4.
2. Read the task description from the rest of Target. Done when: the task text is captured (empty is allowed — spike and security-audit can run without a description).
3. If Target names no template — list the six templates with their one-line summaries and ask the user to choose. Done when: the user names a template; do not proceed before then.
4. If the first word matches no template — name the single closest template and ask the user to confirm before running it. Done when: the user confirms or picks another; do not proceed before then.
5. Run the matched template's phases (see Templates) in order. At each dispatch point, dispatch the named agent; if that agent is absent from `.claude/agents/`, perform the phase inline and write "agent unavailable — ran inline" in that phase's Notes. Done when: every phase's done-when condition is met.
6. After each phase, record its status row for the Workflow Report (see Output). Done when: Step 5's final phase done-when holds and every executed phase has a row — only then emit the report.

## Templates

### `bugfix` — Triage, fix, verify, test

For bug reports and regressions.

1. **Triage** — reproduce the bug, identify root cause (dispatch **debug-observer**). Done when: the bug is reproduced (or exact reproduction steps are documented) and one root cause is named.
2. **Fix** — implement the fix following existing patterns. Done when: the fix is applied and the changed files compile.
3. **Verify** — run compilation checks, ensure no regressions. Done when: build/typecheck passes with no new errors.
4. **Test** — add a regression test, run the full suite. Done when: a test covering this bug exists and the full suite passes.

### `hotfix` — Fix, test, deploy-check

For urgent production issues. Minimal process, maximum speed.

1. **Fix** — implement the minimal fix (no refactoring, no improvements). Done when: the minimal change is applied and compiles.
2. **Test** — run existing tests, add a regression test if quick. Done when: existing tests pass.
3. **Deploy-check** — verify build succeeds, no breaking changes to API/DB. Done when: the build succeeds and no API/DB-breaking change is detected.

### `spike` — Scope, research, summarize

For exploration and investigation. No code changes — research only.

1. **Scope** — define what we are investigating and its success criteria. Done when: the question and success criteria are written down.
2. **Research** — explore the codebase, read docs, search for patterns, check dependencies. Done when: enough evidence is gathered to answer the scoped question.
3. **Summarize** — structured findings with recommendations and next steps. Done when: the report contains findings, recommendations, and next steps. Spike produces a report, not code — use the findings to plan implementation separately.

### `refactor` — Inventory, plan, migrate, verify

For restructuring code without changing behavior.

1. **Inventory** — list all files/functions affected, map dependencies. Done when: the affected file/function list and dependency map are written.
2. **Plan** — define the target structure, migration order, rollback strategy. Done when: target structure, leaf-first migration order, and rollback strategy are all stated.
3. **Migrate** — execute changes in dependency order (leaf files first). Done when: every planned file is migrated leaf-first and compiles.
4. **Verify** — compilation clean, all tests pass, no behavior changes (dispatch **health-checker**). Done when: build is clean, the full suite passes, and health-checker reports no behavior change.

### `dep-upgrade` — Assess, upgrade, fix-breaking, verify

For dependency updates and vulnerability fixes.

1. **Assess** — dispatch **dependency-checker** for a full audit. Done when: dependency-checker has returned its audit.
2. **Upgrade** — apply updates in safe order (patches first, then minors, then majors). Done when: the planned updates are applied in that order.
3. **Fix-breaking** — resolve any breaking changes from major updates. Done when: no unresolved breaking-change compile or test errors remain.
4. **Verify** — compilation clean, tests pass, no regressions (dispatch **health-checker**). Done when: build is clean, tests pass, and health-checker reports no regressions.

### `security-audit` — Scan, triage, remediate, re-scan

For security review and hardening.

1. **Scan** — dispatch **security-scanner** for a full OWASP + config audit. Done when: security-scanner has returned its findings.
2. **Triage** — prioritize findings by Severity and exploitability. Done when: every finding carries a Severity (CRITICAL/WARNING/SUGGESTION) and Confidence (HIGH/MEDIUM/LOW).
3. **Remediate** — fix CRITICAL and WARNING findings (HIGH/MEDIUM confidence); list LOW-confidence items under Next Steps rather than fixing blind. Done when: no CRITICAL and no HIGH/MEDIUM-confidence WARNING remains unresolved (or each is explicitly recorded as accepted).
4. **Re-scan** — dispatch **security-scanner** again to verify fixes and check for new issues. Done when: the re-scan confirms the remediated findings are gone and introduces no new CRITICAL or WARNING.

## Output

Emit exactly this structure. Status is one of `done` / `blocked` / `skipped`. The Result cell holds a short observable outcome (a count, a verdict, a named cause) — never a wall-clock estimate.

```
## Workflow Report: [template]

### Task
[Original task description]

### Phases
| Phase | Status | Result | Notes |
|-------|--------|--------|-------|
| [phase] | done/blocked/skipped | [observable outcome] | [notes] |

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| path | Created/Modified | description |

### Next Steps
- [recommendations, LOW-confidence items, or "none"]
```

Filled example (bugfix):

```
## Workflow Report: bugfix

### Task
Nil-pointer panic in checkout when cart is empty

### Phases
| Phase | Status | Result | Notes |
|-------|--------|--------|-------|
| Triage | done | root cause: unchecked cart.Items[0] | debug-observer reproduced with empty cart |
| Fix | done | guard added in checkout.go | followed existing early-return pattern |
| Verify | done | build clean, 0 new errors | |
| Test | done | 1 regression test added, 214 pass | |

### Changes Made
| File | Action | Description |
|------|--------|-------------|
| checkout.go | Modified | early return when cart is empty |
| checkout_test.go | Modified | regression test for empty cart |

### Next Steps
- none
```

## Notes

- Templates auto-detect the project stack (Go, TypeScript, Python, Rust) for their build/test commands.
- Templates can be chained: e.g. `bugfix` a defect, then `dep-upgrade` the affected dependency.

## Recap — non-negotiables

- Run only the named template; on missing/unrecognized input, list templates or offer the closest match and stop.
- Phases run in order — each starts only after the prior phase's done-when holds; report a status row per phase.
- Escalate effort to `max` on a failed gate or retry and say so; never silently re-run at the same effort.
- security-audit remediation targets CRITICAL and WARNING findings (HIGH/MEDIUM confidence) in security-scanner's exact enums.
- Emit the Workflow Report only when every executed phase has a row.
