---
description: "Initialize project documentation — redirects to /superkit-init for intelligent setup"
argument-hint: "[--non-interactive]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Initialize Project Documentation

## Role
Set up project documentation. Prefer `/superkit-init` (intelligent scan + auto-populated docs). Run the manual fallback ONLY when that command is not installed.

## Hard Rules
- If `/superkit-init` exists, redirect to it and stop — never also run the fallback.
- Never overwrite an existing root `CLAUDE.md`; create it only when absent.
- Never reference kit-source paths (`packages/...`); they do not exist in installed projects. Use the inline skeleton below.
- Fallback touches only: `docs/architecture/`, `docs/trees/`, and `CLAUDE.md` (when absent).
- Forward the caller's arguments to `/superkit-init` unchanged.

## Steps

1. **Detect the preferred command.** Glob `.claude/commands/superkit-init.md`.
   - Found → do Step 2 (redirect).
   - Not found → do Step 3 (fallback).
   - Done-when: you have chosen redirect or fallback.

2. **Redirect (preferred).** Invoke `/superkit-init`, forwarding the caller's arguments verbatim: $ARGUMENTS
   Then stop — do NOT run Step 3.
   - Done-when: `/superkit-init` finished and its report is shown.

3. **Fallback scaffold** (only when Step 1 found no `superkit-init.md`):
   1. `mkdir -p docs/architecture docs/trees`
   2. Dispatch the `tree-generator` agent to populate `docs/trees/`. If the agent is unavailable, note it and skip.
   3. Read the project root: if `CLAUDE.md` already exists, leave it unchanged. If absent, Write it from the skeleton below, keeping the `TODO:` markers for the user to fill in.
   - Done-when: both dirs exist, trees generated (or skipped with a note), and a root `CLAUDE.md` exists.

### Inline CLAUDE.md skeleton (used by fallback Step 3, only when no root CLAUDE.md exists)
```markdown
# YOUR_PROJECT_NAME
> TODO: one-line project description.

## Tech Stack
TODO: backend / frontend / infra.

## Structure
TODO: top-level directory layout.

## Key Commands
TODO: build / test / lint / migrate / dev-server commands.

## Conventions
TODO: formatting, error handling, commit format, API style, env vars.

## Architecture Reference
| Doc | Description |
|-----|-------------|
| docs/architecture/*.md | TODO: fill in per generated template |
| docs/trees/tree-project.md | Project directory structure |
```

## Output
```
## Docs Init — <redirect | fallback>
[redirect]  Forwarded to /superkit-init — see its report above.
[fallback]
  docs/architecture/       created
  docs/trees/              <generated | skipped: tree-generator unavailable>
  CLAUDE.md                <created from skeleton | unchanged (already existed)>
Next: fill the TODO sections in CLAUDE.md and docs/architecture/*.
```

## Recap
- `/superkit-init` present → redirect and stop; absent → fallback. Never both.
- Fallback never overwrites an existing root `CLAUDE.md`.
- No `packages/...` kit paths — use the inline skeleton.
- Emit the report only after the chosen branch's Done-when holds.
