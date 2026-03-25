# Superkit Enhancement — README Overhaul + New Components from ECC Research

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve superkit README/install UX (one-line install for Codex, platform sections) AND adopt 4 high-value agents + 1 hook from everything-claude-code v1.9.0 research.

**Architecture:** Two tracks: (A) README/docs overhaul, (B) new functional components.

**Tech Stack:** Markdown, Bash

---

## Research Summary: What to adopt from ECC v1.9.0

### YES — Adopt (High Value)

| Component | What | Why |
|-----------|------|-----|
| **database-reviewer** agent | PostgreSQL specialist: EXPLAIN ANALYZE, indexes, RLS, anti-patterns, schema design | We have 48 migrations, heavy PostgreSQL usage. Catches perf issues in migrations |
| **architect** agent | System design advisor: trade-offs, scalability, patterns | We lack architecture planning agent for complex refactoring |
| **doc-updater** agent | Auto-validates docs match code, generates codemaps | Aligns with our 3-layer doc enforcement. Can verify docs are actually current |
| **config-protection** hook | Blocks modifications to linter/formatter configs | Prevents accidental weakening of standards (eslint, tsconfig, gofmt) |

### MAYBE — Consider Later

| Component | What | Why later |
|-----------|------|-----------|
| e2e-runner agent | Structured Playwright test orchestration | Useful but low priority vs db-reviewer |
| go-build-resolver agent | Specialized Go compilation error fixer | Nice but go-reviewer + go vet already cover this |
| /loop-start command | Autonomous loop orchestration | Future feature, not immediate need |
| prompt-optimizer skill | Refine agent instructions | Nice-to-have, not blocking |
| mcp-server-patterns skill | MCP server development guide | Only if we build custom MCP servers |

### NO — Skip

- Language-specific agents (Java, Kotlin, C++, PyTorch) — not our stack
- Multi-model orchestration — single-operator project
- 125 domain skills — too broad, we're focused
- Node.js installer — our bash setup.sh is simpler
- Translations — unnecessary complexity

---

## Phase A — README & Install Overhaul

### Task 1: Restructure README with platform-specific install + badges

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add badges at top of README**

After `# claude-code-superkit` heading:
```markdown
[![Stars](https://img.shields.io/github/stars/RaNDoM6913/claude-code-superkit?style=flat)](https://github.com/RaNDoM6913/claude-code-superkit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Agents](https://img.shields.io/badge/agents-24-blue)
![Model](https://img.shields.io/badge/model-Opus-purple)
```

- [ ] **Step 2: Rewrite Installation section with platform-specific subsections**

Replace entire "Quick Start" section:

```markdown
## Installation

### Claude Code

**Interactive Setup (recommended):**
```bash
git clone https://github.com/RaNDoM6913/claude-code-superkit.git
cd your-project/
bash /path/to/claude-code-superkit/setup.sh
```
Selects your stack, hook profile, auto-installs superpowers plugin.

**Manual:** See [docs/INSTALL-CLAUDE-CODE.md](docs/INSTALL-CLAUDE-CODE.md)

### Codex CLI

Tell Codex:
```
Fetch and follow instructions from https://raw.githubusercontent.com/RaNDoM6913/claude-code-superkit/main/packages/codex/INSTALL.md
```

Or use setup.sh — select "Y" when asked about Codex. Uses **gpt-5.4** with **extra_high** reasoning.

### Verify Installation

Start Claude Code and run:
```
/review --full
```
You should see reviewer agents dispatched and a findings report.
```

- [ ] **Step 3: Add "What's New" section after Features table**

```markdown
## What's New (v1.1.0)

- **Double-verification /review** — findings validated by independent agents, `--comment` posts to GitHub PRs
- **3-layer documentation enforcement** — rule + PreToolUse hook + opus Stop hook
- **SkillsMP integration** — search 500K+ community skills before building new ones
- **All agents on Opus** — maximum reasoning depth for every task
- **Codex: gpt-5.4 + extra_high** — maximum model and reasoning for Codex CLI
- **4 new agents** — database-reviewer, architect, doc-updater, config-protection hook
```

- [ ] **Step 4: Commit**

---

### Task 2: Create docs/INSTALL-CLAUDE-CODE.md

**Files:**
- Create: `docs/INSTALL-CLAUDE-CODE.md`

- [ ] **Step 1: Write detailed Claude Code install guide**

Cover: prerequisites, setup.sh options, manual copy with $SUPERKIT var, superpowers plugin, hook profiles, post-install verification, merge vs overwrite mode.

- [ ] **Step 2: Commit**

---

### Task 3: Add VERSION + CHANGELOG.md

**Files:**
- Create: `VERSION`
- Create: `CHANGELOG.md`

- [ ] **Step 1: VERSION = `1.1.0`**
- [ ] **Step 2: CHANGELOG with v1.0.0 and v1.1.0 entries** (all changes from today's session)
- [ ] **Step 3: Commit**

---

## Phase B — New Components (from ECC research)

### Task 4: Create database-reviewer agent

**Files:**
- Create: `packages/core/agents/database-reviewer.md`
- Copy to: `packages/showcase/.claude/agents/database-reviewer.md`

- [ ] **Step 1: Write database-reviewer agent**

Based on ECC's database-reviewer but adapted:
- Remove Supabase-specific RLS (we use direct pgx, not Supabase)
- Keep: EXPLAIN ANALYZE, index checks, schema design, anti-patterns, cursor pagination
- Add: pgx-specific patterns (parameterized queries, batch inserts via CopyFrom)
- Add: migration review integration (reference our migration-reviewer)
- Phase 0: reads CLAUDE.md + docs/architecture/database-schema.md
- Model: opus

- [ ] **Step 2: Add to /review dispatch table** in `packages/core/commands/review.md`

Add mapping: `migrations/*.sql` or `*_repo.go` → **database-reviewer** (in addition to existing migration-reviewer)

- [ ] **Step 3: Copy to showcase**
- [ ] **Step 4: Commit**

---

### Task 5: Create architect agent

**Files:**
- Create: `packages/core/agents/architect.md`
- Copy to: `packages/showcase/.claude/agents/architect.md`

- [ ] **Step 1: Write architect agent**

System design advisor for when tasks require architectural decisions:
- Evaluates trade-offs (performance vs simplicity, DRY vs clarity)
- Proposes architecture for new features (layering, data flow, API design)
- Reviews refactoring plans for unintended side effects
- Phase 0: reads CLAUDE.md + all docs/architecture/
- Dispatched by /dev command in Phase 2 (Plan) for complex tasks
- Model: opus

- [ ] **Step 2: Commit**

---

### Task 6: Create doc-updater agent

**Files:**
- Create: `packages/core/agents/doc-updater.md`
- Copy to: `packages/showcase/.claude/agents/doc-updater.md`

- [ ] **Step 1: Write doc-updater agent**

Validates that documentation matches current code state:
- Compares docs/architecture/ against actual code
- Flags stale docs: wrong file paths, outdated counts, missing new endpoints
- Suggests specific updates needed
- Can be dispatched by /review or standalone
- Reinforces our 3-layer doc enforcement
- Phase 0: reads CLAUDE.md + git log for recent changes
- Model: opus

- [ ] **Step 2: Add to /review dispatch** — triggered when any code files changed (runs alongside existing reviewers)
- [ ] **Step 3: Copy to showcase**
- [ ] **Step 4: Commit**

---

### Task 7: Create config-protection hook

**Files:**
- Create: `packages/core/hooks/config-protection.sh`
- Copy to: `packages/showcase/.claude/scripts/hooks/config-protection.sh`
- Modify: `packages/core/settings.json` (add to PostToolUse)
- Modify: `packages/showcase/.claude/settings.json` (add to PostToolUse)

- [ ] **Step 1: Write config-protection.sh hook**

PostToolUse(Edit|Write) hook that warns when modifying config files:
- `.eslintrc*`, `tsconfig*.json`, `.prettierrc*`, `biome.json`
- `golangci-lint.yml`, `.golangci.yml`
- `.claude/settings.json` (meta-protection!)
- Doesn't block, just warns: "You modified a config file. Ensure standards aren't weakened."
- Profile: standard, strict (skip on fast)

- [ ] **Step 2: Register in settings.json** (both core and showcase)
- [ ] **Step 3: Commit**

---

### Task 8: Update superkit counts and docs

**Files:**
- Modify: `README.md` (agent count, hook count)
- Modify: `CLAUDE.md` in showcase (agent table)
- Modify: `packages/codex/INSTALL.md` (if new agents get codex skills)

- [ ] **Step 1: Create Codex skills for new agents** (database-reviewer, architect, doc-updater)
- [ ] **Step 2: Update all counts**: core agents 17→20, total 24→27 (showcase)
- [ ] **Step 3: Commit**

---

### Task 9: Final push + GitHub about

- [ ] **Step 1: Push superkit**
- [ ] **Step 2: Update GitHub about description with new counts**

---

## Summary

| Phase | Tasks | What |
|-------|-------|------|
| A — README/Docs | 3 | Badges, platform install, VERSION, CHANGELOG |
| B — New Components | 4 | database-reviewer, architect, doc-updater agents + config-protection hook |
| Final | 2 | Update counts, push |
| **Total** | **9 tasks** | |

## New Component Totals After Plan

| Component | Before | After |
|-----------|--------|-------|
| Core Agents | 17 | **20** (+database-reviewer, architect, doc-updater) |
| Hooks | 8 core | **9 core** (+config-protection) |
| Showcase Agents | 24 | **27** |
| Codex Skills | 33 | **36** |
