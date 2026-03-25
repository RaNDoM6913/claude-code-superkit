# TGApp .claude/ Refactor — Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor TGApp `.claude/` to match the new architecture: 21 → 14 commands, 18 → 21 agents, 5 → 3 rules, 9 → 11 skills.

**Architecture:** Delete redundant commands, convert 3 commands to agents, merge 2 run-admin variants into one with args, merge 2 rules into coding-style, add 2 meta-skills, add /commit command.

**Working directory:** `/Users/ivankudzin/cursor/tgapp/`

**Spec:** `docs/superpowers/specs/2026-03-23-claude-code-superkit-design.md` — Section 10

---

## Task 1: Convert /health → health-checker agent

**Files:**
- Read: `.claude/commands/health.md` (source)
- Create: `.claude/agents/health-checker.md`
- Delete: `.claude/commands/health.md`

- [ ] **Step 1: Read current /health command**
- [ ] **Step 2: Create health-checker.md agent** — same content but with agent frontmatter (name, description, model: sonnet, allowed-tools: Bash, Glob, Grep, Read, Agent). Keep all 9 checks and dashboard output format.
- [ ] **Step 3: Delete health.md command**
- [ ] **Step 4: Update /dev command** — add dispatch of `health-checker` agent in Phase 4 (Verify)
- [ ] **Step 5: Commit**
```bash
git add .claude/agents/health-checker.md .claude/commands/dev.md
git rm .claude/commands/health.md
git commit -m "refactor(claude): convert /health command to health-checker agent"
```

---

## Task 2: Convert /docs-check → docs-checker agent

**Files:**
- Read: `.claude/commands/docs-check.md` (source)
- Create: `.claude/agents/docs-checker.md`
- Delete: `.claude/commands/docs-check.md`

- [ ] **Step 1: Read current /docs-check command**
- [ ] **Step 2: Create docs-checker.md agent** — agent frontmatter, same logic
- [ ] **Step 3: Delete docs-check.md command**
- [ ] **Step 4: Update /dev command** — add dispatch of `docs-checker` agent in Phase 7 (Document)
- [ ] **Step 5: Commit**
```bash
git add .claude/agents/docs-checker.md .claude/commands/dev.md
git rm .claude/commands/docs-check.md
git commit -m "refactor(claude): convert /docs-check command to docs-checker agent"
```

---

## Task 3: Convert /new-endpoint → scaffold-endpoint agent

**Files:**
- Read: `.claude/commands/new-endpoint.md` (source)
- Create: `.claude/agents/scaffold-endpoint.md`
- Delete: `.claude/commands/new-endpoint.md`

- [ ] **Step 1: Read current /new-endpoint command**
- [ ] **Step 2: Create scaffold-endpoint.md agent** — agent frontmatter (model: sonnet, allowed-tools: Read, Grep, Glob, Edit, Write, Bash). Same content.
- [ ] **Step 3: Delete new-endpoint.md command**
- [ ] **Step 4: Commit**
```bash
git add .claude/agents/scaffold-endpoint.md
git rm .claude/commands/new-endpoint.md
git commit -m "refactor(claude): convert /new-endpoint command to scaffold-endpoint agent"
```

---

## Task 4: Delete absorbed commands

**Files:**
- Delete: `.claude/commands/dev-backend.md`
- Delete: `.claude/commands/review-pr.md`
- Delete: `.claude/commands/review-with-context.md`

- [ ] **Step 1: Delete 3 commands**
```bash
git rm .claude/commands/dev-backend.md .claude/commands/review-pr.md .claude/commands/review-with-context.md
```
- [ ] **Step 2: Commit**
```bash
git commit -m "refactor(claude): remove 3 absorbed commands (dev-backend, review-pr, review-with-context)"
```

---

## Task 5: Merge /review to absorb review-pr + review-with-context

**Files:**
- Modify: `.claude/commands/review.md`

- [ ] **Step 1: Read current review.md**
- [ ] **Step 2: Update review.md** — add:
  - Input parsing: `/review PR#123` → `gh pr diff`, `/review main` → `git diff main...HEAD`
  - Auto git context injection (from review-with-context): inject diff hunks, line counts, recent commits into each agent prompt
  - Keep existing agent dispatch logic
- [ ] **Step 3: Commit**
```bash
git add .claude/commands/review.md
git commit -m "feat(claude): merge review-pr + review-with-context into unified /review"
```

---

## Task 6: Merge run-admin variants into one command

**Files:**
- Modify: `.claude/commands/run-admin.md` — accept args: (no arg)=live, demo, final
- Delete: `.claude/commands/run-admin-demo.md`
- Delete: `.claude/commands/run-admin-final.md`

- [ ] **Step 1: Read all 3 run-admin commands**
- [ ] **Step 2: Merge into run-admin.md** — parse $ARGUMENTS: empty → live mode, "demo" → demo mode, "final" → strict mode
- [ ] **Step 3: Delete run-admin-demo.md and run-admin-final.md**
- [ ] **Step 4: Commit**
```bash
git add .claude/commands/run-admin.md
git rm .claude/commands/run-admin-demo.md .claude/commands/run-admin-final.md
git commit -m "refactor(claude): merge run-admin-demo + run-admin-final into /run-admin with args"
```

---

## Task 7: Add /commit command

**Files:**
- Create: `.claude/commands/commit.md`

- [ ] **Step 1: Create commit.md** — conventional commit helper:
  - Auto: git status + git diff → analyze → suggest type(scope): description
  - Check for secrets in staged files
  - Create commit with Co-Authored-By
  - Frontmatter: description, allowed-tools: Bash, Read, Grep, Glob
- [ ] **Step 2: Commit**
```bash
git add .claude/commands/commit.md
git commit -m "feat(claude): add /commit conventional commit command"
```

---

## Task 8: Merge rules (5 → 3)

**Files:**
- Modify: `.claude/rules/coding-style.md` — add Testing + Search First sections
- Delete: `.claude/rules/testing.md`
- Delete: `.claude/rules/search-first.md`

- [ ] **Step 1: Read testing.md and search-first.md**
- [ ] **Step 2: Append to coding-style.md** — add `## Testing` and `## Search First` sections from the deleted files
- [ ] **Step 3: Delete testing.md and search-first.md**
- [ ] **Step 4: Commit**
```bash
git add .claude/rules/coding-style.md
git rm .claude/rules/testing.md .claude/rules/search-first.md
git commit -m "refactor(claude): merge testing + search-first rules into coding-style"
```

---

## Task 9: Add meta-skills (9 → 11)

**Files:**
- Create: `.claude/skills/writing-agents/SKILL.md`
- Create: `.claude/skills/writing-commands/SKILL.md`

- [ ] **Step 1: Create writing-agents/SKILL.md** — meta-skill teaching agent format, 2-phase review, severity/confidence, grep patterns, anti-rationalization
- [ ] **Step 2: Create writing-commands/SKILL.md** — meta-skill teaching command format, orchestrator pattern, agent dispatch, auto-detect
- [ ] **Step 3: Commit**
```bash
git add .claude/skills/writing-agents/ .claude/skills/writing-commands/
git commit -m "feat(claude): add writing-agents and writing-commands meta-skills"
```

---

## Task 10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update counts** — Commands: 21 → 14, Agents: 18 → 21, Rules: 5 → 3, Skills: 9 → 11
- [ ] **Step 2: Update agents table** — add health-checker, docs-checker, scaffold-endpoint
- [ ] **Step 3: Update commands list** — remove deleted, note merged
- [ ] **Step 4: Update rules section** — 3 rules
- [ ] **Step 5: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for refactored .claude/ structure"
```

---

## Verification

After all tasks:
```bash
ls .claude/commands/*.md | wc -l    # expect 14
ls .claude/agents/*.md | wc -l     # expect 21
ls .claude/rules/*.md | wc -l      # expect 3
find .claude/skills -name "SKILL.md" | wc -l  # expect 11
```
