---
alwaysApply: true
---

# Auto Dev Workflow

## When to use /dev workflow automatically

Claude MUST follow the full /dev orchestration (8 phases: understand → plan → implement → verify → test → review → document → report) for these task types — WITHOUT the user explicitly calling /dev:

| Task Type | Auto /dev? | Reason |
|-----------|-----------|--------|
| New feature / endpoint / screen | YES | Multi-file, needs plan + tests + review + docs |
| Bug fix touching 3+ files | YES | Cross-cutting, needs verification |
| New migration + repo + service | YES | Full-stack, dependency order matters |
| Refactoring 5+ files | YES | Needs review to catch regressions |
| Bot behavior change | YES | Needs review + doc update |
| Integration work (API ↔ frontend) | YES | Contract alignment critical |

## When NOT to use /dev

| Task Type | Action |
|-----------|--------|
| Simple edit in 1-2 files | Direct edit, no orchestration |
| Docs-only update | Direct edit |
| Config / env change | Direct edit |
| Question / explanation | Just answer |
| Typo fix / rename | Direct edit |
| Adding a comment or log | Direct edit |

## How to decide

Ask yourself: "Does this task need a plan, tests, or review?" If yes to any — use /dev workflow.

## Behavior

- Do NOT announce "I'm using /dev workflow" — just follow the phases naturally
- Skip phases that don't apply (e.g., no Phase 5 if no testable logic)
- Always include Phase 6 (review) for changes touching 3+ files
- Always include Phase 7 (document) if logic/API/architecture changed
