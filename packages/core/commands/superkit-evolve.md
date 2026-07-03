---
description: Incremental documentation update — detect drift, fix stale docs, add missing coverage
argument-hint: "[--fix-all]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# Superkit Evolve — Incremental Documentation Update

Detect what is outdated or missing in the documentation of a project already using superkit, then fix it. Six drift checks → report → confirmed fixes → verified commit.

## Mode

$ARGUMENTS

| Arguments | Mode | Behavior |
|-----------|------|----------|
| (empty) | interactive | Report issues in Step 7, ask before fixing |
| `--fix-all` | automatic | Print the Step 7 scan block, skip the prompt, fix everything except [UNKNOWN] |

## Hard Rules

1. Run ALL six checks (Steps 1–6) before reporting. A check whose command fails or whose value cannot be parsed records an **[UNKNOWN]** issue with the reason — never guess a value, never claim drift from an unparsed value.
2. Interactive mode: fix NOTHING until the user confirms in Step 7.
3. Touch only documentation and config: `docs/`, `CLAUDE.md`, `.claude/rules/`, `.claude/scripts/hooks/`. Never edit application source code.
4. Canonical architecture doc names are the shipped template names (Step 2 table): `api-reference.md`, `frontend-state.md`, etc. Do not check for or generate other spellings.
5. A fix counts as FIXED only after re-running the check that produced the issue and seeing it pass.
6. Use the portable commands below as written — they run on both macOS and Linux. Do not substitute `grep -P` or `stat -f` variants.
7. Zero issues is a valid result — emit the final report saying so; do not manufacture drift.

## Step 1 — Migration Counter Drift

```bash
# Count actual migrations
ACTUAL=$(find . -path "*/migrations/*" -name "*.up.sql" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
# Extract claimed upper counter from CLAUDE.md: last NNN..NNN range on the first matching line, zero-padding stripped
CLAIMED=$(grep -E '[0-9]{3,}\.\.[0-9]{3,}' CLAUDE.md 2>/dev/null | head -1 | sed -n 's/.*\.\.0*\([1-9][0-9]*\).*/\1/p')
```

Branches (exactly one applies):
- `ACTUAL` is 0 but a `migrations/` directory exists → recount with `-name "*.sql"` (project without `.up/.down` split), then continue below.
- No migrations in the project at all → no issue, done.
- `CLAIMED` empty while `ACTUAL > 0` → issue `[UNKNOWN] Migration counter not parseable from CLAUDE.md (actual: $ACTUAL)`.
- `CLAIMED != ACTUAL` → issue `[DRIFT] Migration counter (CLAUDE.md: $CLAIMED, actual: $ACTUAL)`.
- `CLAIMED == ACTUAL` → no issue.

Done when: one branch recorded.

## Step 2 — Missing Architecture Docs

For each detected component, run the check:

| Component present | Expected doc | Check |
|-------------------|-------------|-------|
| `go.mod` or backend code | `backend-layers.md` | `test -f docs/architecture/backend-layers.md` |
| API route files | `api-reference.md` | `test -f docs/architecture/api-reference.md` |
| `migrations/` dir | `database-schema.md` | `test -f docs/architecture/database-schema.md` |
| Auth code | `auth-and-sessions.md` | `test -f docs/architecture/auth-and-sessions.md` |
| Frontend code | `frontend-state.md` | `test -f docs/architecture/frontend-state.md` |
| Docker/CI files | `deployment.md` | `test -f docs/architecture/deployment.md` |

Component present + check fails → issue `[MISSING] docs/architecture/<doc>`.

Done when: every row with a present component was tested.

## Step 3 — Tree Freshness

```bash
NEWEST_TREE=$(ls -t docs/trees 2>/dev/null | grep '^tree-.*\.md$' | head -1)
if [ -n "$NEWEST_TREE" ]; then
  NEWEST_TREE="docs/trees/$NEWEST_TREE"
  # Parentheses group the -name alternatives so -newer applies to ALL of them
  NEW_FILES=$(find . -newer "$NEWEST_TREE" \
    \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) \
    -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')
fi
```

Branches:
- `NEWEST_TREE` empty → issue `[MISSING] No tree files in docs/trees/`.
- `NEW_FILES > 10` → issue `[STALE] Tree outdated — $NEW_FILES new source files since last generation`.
- Otherwise → no issue.

Done when: one branch recorded.

## Step 4 — Rule Path Validity

Verify every path referenced in `.claude/rules/documentation.md` still exists:

```bash
grep -o '`[^`]*`' .claude/rules/documentation.md 2>/dev/null | tr -d '`' | while read -r pattern; do
  case "$pattern" in
    */*) sh -c "ls -- $pattern" >/dev/null 2>&1 || echo "BROKEN PATH: $pattern" ;;  # sh -c expands globs in any parent shell
  esac
done
```

Only strings containing `/` are treated as paths; other backticked spans (commands, names) are skipped.

- Rule file absent → issue `[MISSING] .claude/rules/documentation.md not installed`.
- Each `BROKEN PATH` line → issue `[BROKEN] Rule path: <pattern>`.

Done when: rule file checked and every path-like span tested.

## Step 5 — New Components Without Docs

```bash
for dir in */ ; do
  d=${dir%/}
  case "$d" in node_modules|vendor|dist|build|docs|test|tests) continue ;; esac
  SRC=$(find "$d" \( -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.rs" \) \
    -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SRC" -ge 5 ] && ! ls docs/architecture 2>/dev/null | grep -Fq -- "$d"; then
    echo "UNDOCUMENTED: $d ($SRC source files)"
  fi
done
```

Then filter: drop any `UNDOCUMENTED` line whose directory is a conventional source root (`src`, `app`, `cmd`, `internal`, `pkg`, `lib`) already covered by an existing Step 2 doc (`backend-layers.md` for backend roots, `frontend-state.md` for frontend roots). Each remaining line → issue `[MISSING] No docs for <dir>/ component`.

Done when: every top-level code directory flagged or explicitly covered.

## Step 6 — CLAUDE.md Staleness

Read `CLAUDE.md` and run three sub-checks:
- **Versions** — compare each version in the tech-stack table against actual `go.mod` / `package.json`. Mismatch → issue `[DRIFT] CLAUDE.md stack table: <component> says X, actual Y`.
- **Coverage** — list `docs/architecture/` (Glob or `ls`); a doc on disk missing from the Architecture Reference table → issue `[DRIFT] Architecture table missing <doc>`.
- **Dead links** — a doc path referenced in CLAUDE.md that fails `test -f` → issue `[BROKEN] Dead reference: <path>`.

Done when: all three sub-checks ran.

## Step 7 — Report and Confirm

Print the scan block (both modes):

```
📊 superkit-evolve scan complete — 6/6 checks run

Found N issues:

  1. [DRIFT]   Migration counter: CLAUDE.md says 48, actual is 50
  2. [MISSING] No docs for workers/ component
  3. [STALE]   Tree outdated — 22 new files since last generation
  4. [BROKEN]  Rule path: services/feed/*.go → should be services/feed_engine/*.go
  5. [UNKNOWN] Migration counter not parseable from CLAUDE.md

Fix? [yes / issue numbers / no]
```

If `N == 0`: skip Steps 8–9, go straight to Output.

**Interactive mode** — handle the reply:

| Reply | Action |
|-------|--------|
| `yes` | fix every issue |
| issue numbers (e.g. `1 3`) | fix only those; mark the rest `SKIPPED (user)` |
| `no` / `skip` | fix nothing; mark all `SKIPPED (user)`; still emit the Output report |
| anything else | ask once more; still unclear → treat as `no` |

**--fix-all mode**: print the scan block without the final `Fix?` line; fix every issue without waiting. In BOTH modes, `[UNKNOWN]` issues are never fixed automatically — mark them `SKIPPED (needs human)`.

Done when: every issue has a decision (fix or skip).

## Step 8 — Fix

For each issue selected for fixing:

| Issue | Fix |
|-------|-----|
| Migration counter drift | Update the migration range in CLAUDE.md to the actual count |
| Missing architecture doc | Generate from code following the /superkit-init doc-generation procedure; use the canonical name from the Step 2 table |
| Stale tree | Regenerate `docs/trees/` using tree/find |
| Broken rule path | Grep for where the files moved, update the rule with the correct path |
| CLAUDE.md staleness | Re-read go.mod/package.json, update versions; sync the Architecture Reference table |
| New component without docs | Generate an architecture doc named `<component>-<topic>.md` |
| Dead architecture reference | Doc should exist → regenerate it; obsolete → remove the reference |

After each fix, re-run the Step 1–6 check that produced the issue: pass → `FIXED`; fail → retry the fix once; still failing → `SKIPPED (fix failed: <error>)`.

Done when: every selected issue is FIXED or SKIPPED (fix failed).

## Step 9 — Commit

Only when at least one issue is FIXED:

```bash
git add docs/ CLAUDE.md .claude/rules/ .claude/scripts/hooks/
git commit -m "docs: superkit-evolve — fix N documentation issues

Fixed:
- [list of fixes]

Co-Authored-By: Claude <noreply@anthropic.com>"
git rev-parse --short HEAD
```

Done when: commit created and sha captured, or no fixes were applied.

## Output

End with exactly this report:

```
✅ superkit-evolve complete

| # | Issue | Result |
|---|-------|--------|
| 1 | [DRIFT] Migration counter 48 → 50 | FIXED |
| 2 | [MISSING] No docs for workers/ | SKIPPED (user) |

Checks run: 6/6 · Found: 2 · Fixed: 1 · Skipped: 1
Commit: a1b2c3d
```

- `Found: 0` → table replaced by the line `No documentation drift detected.`
- No fixes applied → `Commit: none`.

## Done ONLY when

- [ ] All six checks (Steps 1–6) ran; command failures recorded as [UNKNOWN], not guessed.
- [ ] Every issue in the final table is FIXED (its check re-run and passing) or SKIPPED with a reason.
- [ ] Commit created if at least one fix was applied, and its sha is in the report.
- [ ] Final report emitted in the exact Output format.

## Recap

- All six checks run before any report; unparseable values become [UNKNOWN], never claimed drift.
- Interactive mode fixes nothing without confirmation; `--fix-all` fixes everything except [UNKNOWN].
- Docs and config only — never application source code.
- FIXED means the originating check was re-run and passes; then commit, sha in the report.
- Canonical doc names come from the Step 2 table (`api-reference.md`, `frontend-state.md`).
