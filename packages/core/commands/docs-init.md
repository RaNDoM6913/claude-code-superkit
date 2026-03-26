---
description: "Initialize project documentation — redirects to /superkit-init for intelligent setup"
argument-hint: "[--non-interactive]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Initialize Project Documentation

> **This command now redirects to `/superkit-init`** which provides intelligent project scanning and auto-populated documentation instead of empty TODO templates.

Run `/superkit-init` for the full experience, or `/superkit-init --non-interactive` for quick setup.

## Fallback (if /superkit-init is not available)

If running an older version of superkit without `/superkit-init`:

1. Create directories: `mkdir -p docs/architecture docs/trees`
2. Dispatch `tree-generator` agent to generate project trees
3. Create CLAUDE.md from the template in `packages/core/CLAUDE.md`
4. Fill in TODO sections manually

$ARGUMENTS
