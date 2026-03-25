# claude-code-superkit Docs & Showcase — Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write the 9-chapter documentation guide, 3 examples, full README, and create the sanitized TGApp showcase in the superkit repo.

**Prerequisites:** Plan 1 (Superkit Core) must be complete — all agents, commands, hooks exist in the repo.

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

**Spec:** `docs/superpowers/specs/2026-03-23-claude-code-superkit-design.md` — Sections 9, 11

---

## Task 1: Guide Chapter 01 — Getting Started

**Files:**
- Create: `docs/guide/01-getting-started.md`

- [ ] **Step 1: Write getting-started** — содержание:
  - What is claude-code-superkit (3 sentences)
  - 5-minute quickstart with setup.sh (step-by-step)
  - Manual installation alternative (cp -r)
  - First commands to try: /health (via health-checker agent), /review, /dev
  - Verify installation checklist
- [ ] **Step 2: Commit**
```bash
git add docs/guide/01-getting-started.md
git commit -m "docs: add getting-started guide (chapter 1)"
```

---

## Task 2: Guide Chapter 02 — Architecture

**Files:**
- Create: `docs/guide/02-architecture.md`

- [ ] **Step 1: Write architecture overview** — содержание:
  - Component types: agents, commands, hooks, rules, skills — what each is
  - How they relate: diagram of event flow (user prompt → hooks → command → agents → hooks → response)
  - File structure: .claude/ directory layout
  - settings.json: how hooks are wired
  - When to use which: decision tree (agent vs command vs hook vs rule vs skill)
- [ ] **Step 2: Commit**
```bash
git add docs/guide/02-architecture.md
git commit -m "docs: add architecture guide (chapter 2)"
```

---

## Task 3: Guide Chapter 03 — Writing Agents

**Files:**
- Create: `docs/guide/03-writing-agents.md`

- [ ] **Step 1: Write agent guide** — содержание:
  - Standard agent format (frontmatter: name, description, model, allowed-tools)
  - 2-phase review process (checklist → deep analysis)
  - Severity system: CRITICAL/WARNING/SUGGESTION
  - Confidence system: HIGH/MEDIUM/LOW
  - Grep patterns for automated detection
  - Anti-inflation rule: "Do NOT inflate severity to seem thorough"
  - Dispatch priority: stack-reviewer > code-reviewer for matching files
  - Complete example: building a "dockerfile-reviewer" agent from scratch
- [ ] **Step 2: Commit**
```bash
git add docs/guide/03-writing-agents.md
git commit -m "docs: add writing-agents guide (chapter 3)"
```

---

## Task 4: Guide Chapter 04 — Writing Commands

**Files:**
- Create: `docs/guide/04-writing-commands.md`

- [ ] **Step 1: Write commands guide** — содержание:
  - Command format (frontmatter: description, argument-hint, allowed-tools)
  - $ARGUMENTS variable
  - Orchestrator pattern: multi-phase execution (understand → plan → execute → verify)
  - Dispatching agents from commands (parallel via Agent tool)
  - Auto-detection patterns for multi-stack projects
  - Complete example: building a "/deploy" orchestrator command
- [ ] **Step 2: Commit**
```bash
git add docs/guide/04-writing-commands.md
git commit -m "docs: add writing-commands guide (chapter 4)"
```

---

## Task 5: Guide Chapter 05 — Writing Hooks

**Files:**
- Create: `docs/guide/05-writing-hooks.md`

- [ ] **Step 1: Write hooks guide** — содержание:
  - Hook types: PreToolUse, PostToolUse, UserPromptSubmit, PreCompact, SessionStart, Stop
  - JSON protocol: stdin input format (`tool_input.file_path`, `tool_input.command`)
  - Exit codes: 0 = pass, 2 = block
  - stderr = warning messages to Claude
  - Prompt-based hooks (Stop): model, timeout, decision format
  - Hook profiles: CLAUDE_HOOK_PROFILE=fast|standard|strict
  - Performance: SHA256 caching pattern (from typecheck-on-edit)
  - Complete example: building a "lint-on-save" hook
- [ ] **Step 2: Commit**
```bash
git add docs/guide/05-writing-hooks.md
git commit -m "docs: add writing-hooks guide (chapter 5)"
```

---

## Task 6: Guide Chapters 06-07 — Writing Skills & Rules

**Files:**
- Create: `docs/guide/06-writing-skills.md`
- Create: `docs/guide/07-writing-rules.md`

- [ ] **Step 1: Write skills guide** — содержание:
  - Skill format (SKILL.md, frontmatter: name, description, user-invocable)
  - Knowledge skills (reference data) vs process skills (workflows)
  - Dynamic content: `!` shell execution in skills
  - When to use skill vs rule vs agent
  - Example: creating a "deployment-checklist" knowledge skill
- [ ] **Step 2: Write rules guide** — содержание:
  - Rules = always-in-context enforcement (loaded into every conversation)
  - Keep rules short (<50 lines) — they consume context window
  - Types: security rules, style rules, workflow rules
  - Rules vs hooks: rules are advisory (Claude follows), hooks are enforced (scripts block)
  - Example: creating a "no-orm" rule
- [ ] **Step 3: Commit**
```bash
git add docs/guide/06-writing-skills.md docs/guide/07-writing-rules.md
git commit -m "docs: add writing-skills and writing-rules guides (chapters 6-7)"
```

---

## Task 7: Guide Chapters 08-09 — Orchestration & Advanced

**Files:**
- Create: `docs/guide/08-orchestration.md`
- Create: `docs/guide/09-advanced-patterns.md`

- [ ] **Step 1: Write orchestration guide** — содержание:
  - The full pipeline: /dev → agents → hooks → report
  - Parallel agent dispatch pattern (how /review works)
  - Audit orchestrator pattern (how /audit dispatches 4 agents)
  - Collecting + deduplicating findings across agents
  - Error handling: what if an agent fails?
- [ ] **Step 2: Write advanced patterns guide** — содержание:
  - Hook profiles (fast/standard/strict)
  - Session continuity (pre-compact save → session restore)
  - Parallel dispatch: when and how
  - Using with Superpowers plugin (complementary setup)
  - Git worktrees integration
  - CI/CD: hooks are CI-compatible (stdin/stdout JSON, exit codes)
- [ ] **Step 3: Commit**
```bash
git add docs/guide/08-orchestration.md docs/guide/09-advanced-patterns.md
git commit -m "docs: add orchestration and advanced patterns guides (chapters 8-9)"
```

---

## Task 8: Examples

**Files:**
- Create: `docs/examples/agent-from-scratch.md`
- Create: `docs/examples/command-orchestrator.md`
- Create: `docs/examples/hook-pipeline.md`

- [ ] **Step 1: Write agent-from-scratch.md** — step-by-step tutorial building a "dockerfile-reviewer" agent: frontmatter → checklist (10 items) → output format → testing it
- [ ] **Step 2: Write command-orchestrator.md** — tutorial building a "/deploy" command that dispatches pre-deploy-validator → runs tests → builds → deploys
- [ ] **Step 3: Write hook-pipeline.md** — tutorial setting up a complete hook pipeline: format-on-save + lint-check + bundle-warn + context-inject
- [ ] **Step 4: Commit**
```bash
git add docs/examples/
git commit -m "docs: add 3 tutorial examples"
```

---

## Task 9: Showcase — sanitized TGApp copy

**Files:**
- Create: `packages/showcase/` with full `.claude/` tree
- Create: `packages/showcase/README.md`
- Create: `packages/showcase/CLAUDE.md` (sanitized)

- [ ] **Step 1: Copy TGApp .claude/ to showcase**
```bash
cp -r /Users/ivankudzin/cursor/tgapp/.claude/ packages/showcase/.claude/
```
Note: this happens AFTER Plan 2 (TGApp refactor) is complete, so we get the updated structure.

- [ ] **Step 2: Sanitize** — remove/replace:
  - Real API keys/tokens → `YOUR_TOKEN_HERE`
  - GitHub username → `your-username`
  - Domain names → `example.com`
  - Real paths → generic paths
  - Keep all architecture, patterns, conventions

- [ ] **Step 3: Copy and sanitize CLAUDE.md**
```bash
cp /Users/ivankudzin/cursor/tgapp/CLAUDE.md packages/showcase/CLAUDE.md
# Sanitize: remove real URLs, tokens, specific names
```

- [ ] **Step 4: Write showcase README.md** — explain what this is, how it works in production, stats (21 agents, 14 commands, etc.)

- [ ] **Step 5: Remove scripts that won't work outside TGApp** — `.claude/scripts/start.sh`, `.claude/scripts/stop.sh` — replace with a note in README

- [ ] **Step 6: Commit**
```bash
git add packages/showcase/
git commit -m "feat(showcase): add sanitized TGApp production example"
```

---

## Task 10: Full README.md

**Files:**
- Modify: `README.md` (replace placeholder from Plan 1)

- [ ] **Step 1: Write comprehensive README** — содержание:
  - Hero section: name, tagline, badge (MIT license)
  - What's Inside: component table with counts
  - Quick Start: setup.sh in 3 steps
  - Manual Install: cp -r alternative
  - Documentation: links to all 9 guide chapters
  - Showcase: link to packages/showcase/ + stats
  - Using with Superpowers: complementary plugin note
  - Contributing: link to CONTRIBUTING.md
  - License: MIT
- [ ] **Step 2: Commit**
```bash
git add README.md
git commit -m "docs: write full README with quick start and guide links"
```

---

## Task 11: Final push

- [ ] **Step 1: Verify all docs exist**
```bash
find docs/guide -name "*.md" | wc -l      # expect 9
find docs/examples -name "*.md" | wc -l   # expect 3
ls packages/showcase/.claude/agents/*.md | wc -l  # expect 21
ls packages/showcase/README.md             # exists
```

- [ ] **Step 2: Push**
```bash
git push origin main
```

---

## Execution Order

Plans must execute in this order:
1. **Plan 1** (Superkit Core) — creates the repo and all core files
2. **Plan 2** (TGApp Refactor) — refactors TGApp .claude/ to new structure
3. **Plan 3** (this plan) — docs + showcase (showcase depends on Plan 2 being done)

Tasks 1-8 (docs) can start right after Plan 1. Task 9 (showcase) requires Plan 2 complete.
