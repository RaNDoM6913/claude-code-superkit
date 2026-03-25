---
description: Initialize project documentation — scaffold architecture docs, generate trees, set up doc-update rules
argument-hint: "[minimal|standard|full]"
allowed-tools: Bash, Read, Write, Glob, Agent
---

# Initialize Project Documentation

Scaffold documentation structure for the project.

## Modes

Parse $ARGUMENTS:
- **minimal** — just `docs/architecture/` dir + copy relevant templates
- **standard** (default) — architecture templates + generate trees
- **full** — architecture + trees + OpenAPI stub + changelog template

## Steps

### 1. Create directories

```bash
mkdir -p docs/architecture docs/trees
```

### 2. Auto-detect and copy relevant templates

Based on project files:

| Detected | Templates to copy |
|----------|-------------------|
| `go.mod` | backend-layers, api-reference, database-schema |
| `package.json` + `src/` or `app/` | frontend-state |
| `migrations/` or `prisma/` | database-schema |
| `Dockerfile` or `docker-compose.yml` | deployment |
| Auth-related files (jwt, auth, session) | auth-and-sessions |
| Always | data-flow |

Copy from superkit templates directory. If superkit not found locally, create minimal stubs.

### 3. Generate project trees (standard and full modes)

Dispatch `tree-generator` agent:
```
Generate project trees for this codebase. Write to docs/trees/.
```

### 4. Update CLAUDE.md / AGENTS.md

Append "Architecture Reference" section if not present:
```markdown
## Architecture Reference

| Doc | Description |
|-----|-------------|
```
Populate table with created doc files.

Append "Mandatory Documentation Updates" checklist if not present.

### 5. Report

List created files and next steps (fill in TODOs).

$ARGUMENTS
