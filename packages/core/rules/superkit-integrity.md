---
alwaysApply: true
tokens: 1383
---

# Superkit Integrity — Verify Before Commit (superkit repo only)

## HARD RULE

- Before EVERY `git commit` in this repo: run Steps 1–4 below with real commands. Never verify from memory.
- ANY mismatch → fix it, THEN commit.
- Before EVERY `gh release create`: additionally pass the 7-point Pre-Release Audit.
- The hook `packages/core/hooks/superkit-counts-verify.sh` (PreToolUse on `git commit`/`git push`, exit 2 = block) auto-enforces most of Steps 1–2, but NOT Steps 3–4 (phase count, stale refs) — only this rule catches those.

### Step 1 — Count Verification (30s)

Fast path: `bash bin/superkit-counts-verify.sh` runs the hook's count/version checks manually (add `--check-remote` to also verify GitHub About). Exit 0 clears the hook-checked subset; the items the hook skips are listed below the table. Manual equivalent:

```bash
# Per-package counts (same globs the hook uses)
CORE_AGENTS=$(ls packages/core/agents/*.md | wc -l)
STACK_AGENTS=$(ls packages/stack-agents/*/*.md | wc -l)               # references/ not matched
PKG_AGENTS=$(ls packages/{frontend-3d,frontend-ui,gan}/agents/*.md | wc -l)
EXTRAS_AGENTS=$({ ls packages/extras/*.md; ls packages/extras/*/agent.md; } | wc -l)
CORE_HOOKS=$(ls packages/core/hooks/*.sh packages/core/hooks/*.py | wc -l)
STACK_HOOKS=$(ls packages/stack-hooks/*/*.sh | wc -l)
PKG_HOOKS=$(ls packages/{frontend-3d,frontend-ui}/hooks/*.sh | wc -l)
CORE_RULES=$(ls packages/core/rules/*.md | wc -l)
STACK_RULES=$(ls packages/stack-rules/*/*.md | wc -l)
PKG_RULES=$(ls packages/{frontend-3d,frontend-ui}/rules/*.md | wc -l)
CORE_COMMANDS=$(ls packages/core/commands/*.md | wc -l)
PKG_COMMANDS=$(ls packages/frontend-3d/commands/*.md | wc -l)
SKILLS=$(find packages/{core,frontend-3d,frontend-ui,gan,extras} -name SKILL.md | wc -l)
CODEX_SKILLS=$(find packages/codex/skills -name SKILL.md | wc -l)

# Shipped totals — subtract superkit-internal files (never installed;
# canonical list: packages/core/INTERNAL-FILES — the single source of truth
# consumed by lib/installer.js, superkit-counts-verify.sh and superkit-update.sh)
AGENTS=$((CORE_AGENTS + STACK_AGENTS + PKG_AGENTS + EXTRAS_AGENTS))   # 31+9+13+3 = 56
HOOKS=$((CORE_HOOKS - 2 + STACK_HOOKS + PKG_HOOKS))                   # 26+9+7    = 42
RULES=$((CORE_RULES - 1 + STACK_RULES + PKG_RULES))                   # 7+2+10    = 19
COMMANDS=$((CORE_COMMANDS + PKG_COMMANDS))                            # 15+1      = 16
                                                                      # SKILLS      = 22
```

Every computed number must equal what is documented in:

| Where | Must match |
|-------|------------|
| `README.md` badge + "What's Inside" table | AGENTS, HOOKS, RULES, COMMANDS, SKILLS totals; CORE_AGENTS; "N skills" near Codex |
| `CLAUDE.md` "Current Counts" table + Totals line | every per-package cell + all five totals |
| `packages/codex/INSTALL.md` + `AGENTS.md` | CODEX_SKILLS ("N skills") |
| GitHub About (`gh repo view --json description`) | all five counts; hook checks agents/commands/hooks/rules on `git push` |

NOT hook-checked — compare yourself: SKILLS (=22) everywhere it appears (incl. GitHub About), plus CLAUDE.md cells beyond the hook's spot checks (it verifies only Core/Stack Agents, Core Commands, Codex Skills, Showcase Commands). Mismatch → update the docs (GitHub via `gh repo edit --description`) BEFORE committing.

### Step 2 — Version Sync (10s)

```bash
VERSION_FILE=$(cat VERSION | tr -d '[:space:]')
PKG_VERSION=$(node -p "require('./package.json').version")
```

VERSION MUST equal package.json version, and CHANGELOG.md MUST contain that version string (hook blocks both). Differ → fix BEFORE committing.

### Step 3 — Phase Count Consistency (10s)

`packages/core/commands/dev.md` frontmatter declares the /dev phase count (currently "16 phases (0–15)"). The SAME count must appear in:

- `README.md` — Key Commands `/dev` row AND the `docs/dev-flow.svg` embed's `alt` text ("/dev — 16-phase development orchestrator…"). If the count ever changes, regenerate the SVG labels and `docs/dev-flow-variants/` too.
- `CLAUDE.md` — Key Files table, dev.md row
- `docs/guide/01-getting-started.md` — command table
- `docs/guide/08-orchestration.md` — "The /dev Pipeline: N Phases" header
- `packages/codex/AGENTS.md` — dev-orchestrator row
- `packages/codex/skills/dev-orchestrator/SKILL.md` — frontmatter description

### Step 4 — Stale Reference Scan (10s)

Substitute `<PREV>` = the PREVIOUS phase count, then run:

```bash
grep -rn "<PREV>-phase" docs/ README.md CLAUDE.md packages/codex/ --include="*.md" \
  | grep -v plans/ | grep -v CHANGELOG
```

Filled example after an 8→16 renumber: `grep -rn "8-phase" …`. Must return 0 lines. plans/ and CHANGELOG are historical — leave them; everything else uses the CURRENT count.

## Pre-Release Audit — before EVERY `gh release create`

All 7 must pass:

1. Steps 1–4 above all pass.
2. `git tag -l "vX.Y.Z"` — the release tag exists.
3. `cat VERSION` matches the tag version.
4. package.json version matches VERSION.
5. `grep "## \[X.Y.Z\]" CHANGELOG.md` — the version section exists.
6. README "What's New" references vX.Y.Z.
7. `git status` — working tree clean, nothing uncommitted.

ANY check fails → fix, re-commit, re-run, THEN release.

## When to Skip Steps 1–4

- Docs-only wording/typo changes touching no counts, versions, or phase references.
- Plan/spec files under docs/superpowers/.
- Test files.

Unsure whether counts changed → run the steps (<1 minute total). This drift class shipped before (v1.3.5: 8 stale refs) — the checks are cheaper than the cleanup.

## Recap

- Never commit with a count/version mismatch — run Steps 1–4 first, fix before committing.
- Never `gh release create` unless Steps 1–4 AND all 7 release checks pass.
- Skip verification only for docs-only wording, docs/superpowers/ plans, and test files.
