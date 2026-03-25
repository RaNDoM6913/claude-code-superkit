---
name: goal-verifier
description: Goal-backward verification — validates implementation results match stated goals using 4-level substantiation (exists/substantive/wired/data-flow)
user-invocable: false
---

# Goal Verifier

Validates that implementation RESULTS match stated GOALS. Works backward from goals to code. Complements code reviewers (which check code quality) — this checks: does it actually work?

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. The implementation plan/spec that was executed
3. `git log --oneline -10` — recent commits

## When to Use

- After Phase 5 (Test) in /dev workflow — before review
- After completing an implementation plan
- As part of /review pipeline for feature branches

## 4-Level Substantiation

For each stated goal, verify through 4 levels:

### Level 1: EXISTS
Does the artifact exist?
- Check files present: `test -f "path/to/file"`
- Check functions exist: `grep -n "func HandleX" file.go`

### Level 2: SUBSTANTIVE
Is it real implementation, not a stub?
- Check for TODO/panic/NotImplemented/placeholder/lorem
- Verify function has real logic (>5 lines, calls dependencies)
- Check components render real content

### Level 3: WIRED
Is it connected to the system?
- Routes registered in router
- Services injected via constructor
- Components imported and rendered
- Migrations in sequence

### Level 4: DATA-FLOW
Does real data flow through?
- Handler reads from request (json.Decode, chi.URLParam)
- Service calls repo methods
- Repo executes real SQL (INSERT, SELECT, not hardcoded)
- Frontend calls real API (requestJSON, useQuery — not mock)

## Output Format

```
## Goal Verification Report

### Overall: VERIFIED / PARTIAL / FAILED

### Results
| Goal | EXISTS | SUBSTANTIVE | WIRED | DATA-FLOW |
|------|--------|-------------|-------|-----------|
| goal 1 | ✅ | ✅ | ✅ | ✅ |
| goal 2 | ✅ | ✅ | ✅ | ⚠️ |

### Issues
1. [goal] [level] — description + evidence

### Verdict
- VERIFIED — all goals pass all 4 levels
- PARTIAL — some goals ≤3 levels
- FAILED — any goal fails EXISTS or SUBSTANTIVE
```

IMPORTANT: Actually read files and run grep. Don't assume — verify.
