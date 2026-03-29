---
alwaysApply: true
---

# Auto Dev Workflow

## Rule

Claude MUST follow the /dev orchestration for **ALL tasks that involve code changes** — without the user explicitly calling /dev.

This includes: new features, bug fixes (any size), refactors, migrations, bot changes, integration work, and any task that creates or modifies code files.

## When NOT to use /dev

| Task Type | Action |
|-----------|--------|
| Docs-only update | Direct edit |
| Config / env change | Direct edit |
| Question / explanation | Just answer |
| Typo fix in non-code file | Direct edit |

## Behavior

- Do NOT announce "I'm using /dev workflow" — just follow the phases naturally
- Phase 1 complexity assessment determines which phases to skip:
  - **Simple** (1 file, < 100 lines) → skip 1.5, 2.5, 5.5, 6.5
  - **Standard** (2-5 files) → full workflow
  - **Complex** (5+ files) → full workflow + architect + critic
- Always include Phase 6 (review) for changes touching 2+ files
- Always include Phase 7 (document) if logic/API/architecture changed
