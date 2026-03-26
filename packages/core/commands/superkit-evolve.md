---
description: Incremental documentation update — detect drift, fix stale docs, add missing coverage
argument-hint: "[--fix-all]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Superkit Evolve — Incremental Documentation Update

Detect what's outdated or missing in project documentation and fix it. For projects already using superkit.

## Mode

Parse $ARGUMENTS:
- Default: report issues, ask before fixing
- `--fix-all`: fix everything automatically without asking

## Step 1 — Drift Detection

Run these checks and collect issues:

### 1.1 Migration Counter Drift

```bash
# Count actual migrations
ACTUAL=$(find . -path "*/migrations/*.sql" -name "*.up.sql" 2>/dev/null | wc -l | tr -d ' ')
# Read CLAUDE.md counter
CLAIMED=$(grep -oP '000001\.\.0000\K[0-9]+' CLAUDE.md 2>/dev/null || echo "0")
```

If `ACTUAL != CLAIMED` → issue: "Migration counter drift (CLAUDE.md: $CLAIMED, actual: $ACTUAL)"

### 1.2 Missing Architecture Docs

For each detected component (backend, frontend, etc.), check if corresponding doc exists in `docs/architecture/`.

| Component present | Expected doc | Check |
|-------------------|-------------|-------|
| `go.mod` or backend Go code | `backend-layers.md` | `test -f docs/architecture/backend-layers.md` |
| API route files | `backend-api-reference.md` | `test -f docs/architecture/backend-api-reference.md` |
| `migrations/` dir | `database-schema.md` | `test -f docs/architecture/database-schema.md` |
| Auth code | `auth-and-sessions.md` | `test -f docs/architecture/auth-and-sessions.md` |
| Frontend code | `frontend-state-contracts.md` | `test -f docs/architecture/frontend-state-contracts.md` |
| Docker/CI files | `deployment.md` | `test -f docs/architecture/deployment.md` |

### 1.3 Tree Freshness

```bash
# Compare file count since last tree generation
TREE_DATE=$(stat -f %m docs/trees/tree-*.md 2>/dev/null | sort -n | tail -1)
NEW_FILES=$(find . -newer docs/trees/ -name "*.go" -o -name "*.ts" -o -name "*.py" | grep -v node_modules | wc -l | tr -d ' ')
```

If `NEW_FILES > 10` → issue: "$NEW_FILES new files since last tree generation"

### 1.4 Rule Path Validity

Check every file path in `.claude/rules/documentation.md` still exists:

```bash
grep -oP '`[^`]+`' .claude/rules/documentation.md | tr -d '`' | while read pattern; do
  ls $pattern &>/dev/null || echo "BROKEN PATH: $pattern"
done
```

### 1.5 New Components Without Docs

Look for top-level directories that contain code but have no corresponding architecture doc.

### 1.6 CLAUDE.md Staleness

- Does tech stack table match actual `go.mod` / `package.json` versions?
- Does architecture reference table list all existing docs?
- Are there dead links to non-existent docs?

## Step 2 — Report

```
📊 superkit-evolve scan complete

Found N issues:

  1. [DRIFT] Migration counter: CLAUDE.md says 48, actual is 50
  2. [MISSING] No docs for workers/ component
  3. [STALE] Tree outdated — 22 new files since last generation
  4. [BROKEN] Rule path: services/feed/*.go → should be services/feed_engine/*.go

Fix all? [yes / pick / skip]
```

In `--fix-all` mode: skip report, fix everything.

## Step 3 — Fix

For each issue type:

| Issue | Fix |
|-------|-----|
| Migration counter drift | Update CLAUDE.md migration range |
| Missing architecture doc | Generate from code (like superkit-init Phase 2) |
| Stale tree | Regenerate using tree/find |
| Broken rule path | Find correct path, update rule |
| CLAUDE.md staleness | Re-read go.mod/package.json, update versions |
| New component without docs | Generate architecture doc for it |
| Dead architecture reference | Remove or regenerate |

After all fixes, commit:

```bash
git add docs/ CLAUDE.md .claude/rules/ .claude/scripts/hooks/
git commit -m "docs: superkit-evolve — fix N documentation issues

Fixed:
- [list of fixes]

Co-Authored-By: Claude <noreply@anthropic.com>"
```

$ARGUMENTS
