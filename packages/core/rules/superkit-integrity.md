---
alwaysApply: true
tokens: 862
---

# Superkit Integrity — Self-Enforcement

## HARD RULE: Verify Before EVERY Commit

Before EVERY `git commit` in this repo, Claude MUST run the integrity verification. This is NOT optional. Do NOT rely on memory — run the actual commands.

### Step 1: Count Verification (30 seconds)

Run these commands and compare with documented counts:

```bash
# Actual file counts
AGENTS=$(ls packages/core/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
STACK=$(ls packages/stack-agents/*/*.md 2>/dev/null | wc -l | tr -d ' ')
EXTRAS=$(ls packages/extras/*.md 2>/dev/null | wc -l | tr -d ' ')
CODEX=$(find packages/codex/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
HOOKS=$(ls packages/core/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
COMMANDS=$(ls packages/core/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
RULES=$(ls packages/core/rules/*.md 2>/dev/null | wc -l | tr -d ' ')
SKILLS=$(find packages/core/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
```

Compare with:
- `README.md` — "What's Inside" table, Codex comparison table, badge
- `CLAUDE.md` — "Current Counts" table
- `packages/codex/INSTALL.md` — skill breakdown
- `packages/codex/AGENTS.md` — skill lists

**If ANY count mismatches → fix BEFORE committing. Do NOT commit with wrong counts.**

### Step 2: Version Sync (10 seconds)

```bash
VERSION_FILE=$(cat VERSION | tr -d '[:space:]')
PKG_VERSION=$(node -e "console.log(require('./package.json').version)")
```

**VERSION file MUST equal package.json version.** If they differ → fix BEFORE committing.

### Step 3: Phase Count Consistency (10 seconds)

Extract the phase count claimed in `dev.md` frontmatter and verify it matches:
- `README.md` Key Commands table and mermaid diagram
- `CLAUDE.md` Key Files table
- `docs/guide/01-getting-started.md` command table
- `docs/guide/08-orchestration.md` pipeline header
- `packages/codex/AGENTS.md` dev-orchestrator description
- `packages/codex/skills/dev-orchestrator/SKILL.md` frontmatter

**All must agree on the same phase count.**

### Step 4: Stale Reference Scan (10 seconds)

```bash
# Check for orphaned old phase counts (replace N with PREVIOUS count)
grep -rn "OLD_COUNT-phase" docs/ README.md CLAUDE.md packages/codex/ --include="*.md" | grep -v "plans/" | grep -v "CHANGELOG"
```

Plans/ and CHANGELOG are historical — ignore them. Everything else must use the CURRENT phase count.

## HARD RULE: Pre-Release Audit

Before EVERY `gh release create`, Claude MUST additionally:

1. **Run full Step 1-4 above** (counts + version + phases + stale refs)
2. **Verify tag exists**: `git tag -l "vX.Y.Z"`
3. **Verify VERSION = tag version**: `cat VERSION` must match the tag being created
4. **Verify package.json = VERSION**: no mismatch
5. **Verify CHANGELOG has the version section**: `grep "## \[X.Y.Z\]" CHANGELOG.md`
6. **Verify README What's New**: references the correct version
7. **Verify git is clean**: `git status` shows nothing uncommitted

**If ANY check fails → fix and re-commit BEFORE creating the release.**

## When to Skip

- Docs-only changes that don't touch counts (typo fixes, wording)
- Plan/spec files in docs/superpowers/
- Test files

## Why This Rule Exists

In v1.3.5 audit, 8 stale references were found across the repo:
- package.json was 2 versions behind VERSION
- 3 guide files had wrong phase counts
- 2 files had wrong skill counts
- 1 file referenced deprecated jq dependency

This rule prevents that from ever happening again.
