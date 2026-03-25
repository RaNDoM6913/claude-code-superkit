# claude-code-superkit Codex Support — Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OpenAI Codex CLI support to claude-code-superkit — AGENTS.md template, config.toml, installation guide, and setup.sh integration. Skills are already compatible (same SKILL.md format). Agents convert to Codex skill format.

**Architecture:** Codex uses `~/.agents/skills/` (global) instead of `.claude/agents/` (per-project). Skills format is identical (SKILL.md). Codex has no hooks or slash commands — these remain Claude Code exclusive. AGENTS.md replaces CLAUDE.md. config.toml replaces settings.json.

**Working directory:** `/Users/ivankudzin/cursor/claude-code-superkit/`

**Key difference mapping:**

| Claude Code | Codex CLI | Conversion |
|------------|-----------|------------|
| `.claude/agents/*.md` | `~/.agents/skills/*/SKILL.md` | Repackage as skills |
| `.claude/commands/*.md` | N/A | Claude Code exclusive |
| `.claude/scripts/hooks/*.sh` | N/A | Claude Code exclusive |
| `.claude/rules/*.md` | Inline in AGENTS.md | Merge into instructions |
| `.claude/skills/*/SKILL.md` | `~/.agents/skills/*/SKILL.md` | Already compatible! |
| `CLAUDE.md` | `AGENTS.md` | Template conversion |
| `settings.json` | `config.toml` | New file |

---

## Task 1: Codex AGENTS.md template

**Files:**
- Create: `packages/codex/AGENTS.md`

- [ ] **Step 1: Create AGENTS.md template**

Same structure as packages/core/CLAUDE.md but adapted for Codex:
- Replace Claude-specific references with Codex equivalents
- Include rules inline (coding-style, security, git-workflow) since Codex has no separate rules dir
- Add Codex-specific notes (spawn_agent instead of Agent tool, update_plan instead of TodoWrite)
- TODO placeholders for project-specific content

- [ ] **Step 2: Commit**
```bash
git add packages/codex/AGENTS.md
git commit -m "feat(codex): add AGENTS.md template"
```

---

## Task 2: Codex config.toml template

**Files:**
- Create: `packages/codex/config.toml`

- [ ] **Step 1: Create config.toml**

```toml
# claude-code-superkit — Codex configuration
# Place in .codex/config.toml (project) or ~/.codex/config.toml (global)

model = "o3"
model_reasoning_effort = "high"

[features]
multi_agent = true    # Required for subagent dispatch (review, audit orchestrators)
web_search = true

# MCP servers (uncomment as needed)
# [mcp_servers.playwright]
# command = "npx"
# args = ["@playwright/mcp@latest"]

# [mcp_servers.context7]
# command = "npx"
# args = ["-y", "@context7/mcp@latest"]
```

- [ ] **Step 2: Commit**
```bash
git add packages/codex/config.toml
git commit -m "feat(codex): add config.toml template"
```

---

## Task 3: Convert agents to Codex skill format

**Files:**
- Create: `packages/codex/skills/` directory with one subdir per agent
- Each agent becomes: `packages/codex/skills/{agent-name}/SKILL.md`

- [ ] **Step 1: Create conversion script**

Write `tools/convert-agents-to-codex-skills.sh`:
- Reads each `packages/core/agents/*.md`
- Creates `packages/codex/skills/{name}/SKILL.md`
- Transforms frontmatter:
  - Remove `model:` (Codex uses global model)
  - Remove `allowed-tools:` (Codex has no tool restrictions per skill)
  - Keep `name:` and `description:`
  - Add `user-invocable: false` (auto-activated by description matching)
- Body stays the same (review process, checklist, output format)

- [ ] **Step 2: Run conversion for all 16 core agents**

```bash
bash tools/convert-agents-to-codex-skills.sh
```

Expected output: 16 directories in `packages/codex/skills/`, each with SKILL.md.

- [ ] **Step 3: Also convert stack agents (4) and extras (2)**

Same process for:
- `packages/stack-agents/go/go-reviewer.md` → `packages/codex/skills/go-reviewer/SKILL.md`
- `packages/stack-agents/typescript/ts-reviewer.md` → `packages/codex/skills/ts-reviewer/SKILL.md`
- etc.

- [ ] **Step 4: Commit**
```bash
git add packages/codex/skills/ tools/convert-agents-to-codex-skills.sh
git commit -m "feat(codex): convert 22 agents to Codex skill format"
```

---

## Task 4: Convert commands to Codex skills

**Files:**
- Create: `packages/codex/skills/{command-name}/SKILL.md` for each of 8 commands

- [ ] **Step 1: Convert orchestrator commands**

Codex has no slash commands. Convert each command to a user-invocable skill:
- `dev.md` → `packages/codex/skills/dev-orchestrator/SKILL.md` (user-invocable: true)
- `review.md` → `packages/codex/skills/review-orchestrator/SKILL.md`
- `audit.md` → `packages/codex/skills/audit-orchestrator/SKILL.md`
- `test.md` → `packages/codex/skills/test-runner/SKILL.md`
- `lint.md` → `packages/codex/skills/lint-runner/SKILL.md`
- `commit.md` → `packages/codex/skills/commit-helper/SKILL.md`
- `new-migration.md` → `packages/codex/skills/new-migration/SKILL.md`
- `migrate.md` → `packages/codex/skills/migrate/SKILL.md`

Key changes:
- Add `user-invocable: true` (so user can say "use dev-orchestrator skill")
- Replace `Agent` tool dispatch → `spawn_agent` / `wait_agent`
- Replace `TodoWrite` → `update_plan`
- Remove `$ARGUMENTS` → instructions say "parse user's request"
- Remove `allowed-tools` frontmatter

- [ ] **Step 2: Commit**
```bash
git add packages/codex/skills/
git commit -m "feat(codex): convert 8 commands to Codex skill format"
```

---

## Task 5: Codex installation guide

**Files:**
- Create: `packages/codex/INSTALL.md`

- [ ] **Step 1: Write INSTALL.md**

```markdown
# Installing claude-code-superkit for Codex CLI

## Quick Install

# 1. Clone superkit
git clone https://github.com/RaNDoM6913/claude-code-superkit.git ~/claude-code-superkit

# 2. Symlink skills to Codex discovery path
mkdir -p ~/.agents/skills
ln -s ~/claude-code-superkit/packages/codex/skills ~/.agents/skills/superkit

# 3. Copy config template (optional)
cp ~/claude-code-superkit/packages/codex/config.toml .codex/config.toml

# 4. Copy AGENTS.md template to your project
cp ~/claude-code-superkit/packages/codex/AGENTS.md ./AGENTS.md
# Edit AGENTS.md — fill in your project details

# 5. Verify
codex --ask-for-approval never "List all available superkit skills"

## What Gets Installed

- 22 review/audit skills (agents converted to skills)
- 8 orchestrator skills (commands converted to skills)
- 3 meta-skills (project-architecture, writing-agents, writing-commands)
- AGENTS.md template with inline rules

## What's NOT Available in Codex

- Hooks (no equivalent in Codex)
- Automatic format-on-edit, typecheck-on-edit (use editor plugins instead)
- Session continuity (pre-compact-save/restore)
- Stop verification prompt
```

- [ ] **Step 2: Commit**
```bash
git add packages/codex/INSTALL.md
git commit -m "docs(codex): add installation guide"
```

---

## Task 6: Update setup.sh

**Files:**
- Modify: `setup.sh`

- [ ] **Step 1: Add Codex option to setup.sh**

After the Claude Code installation completes, add:

```bash
echo ""
read -rp "Also install for Codex CLI? [y/N] " codex_yn
if [[ "$codex_yn" =~ ^[Yy] ]]; then
  CODEX_SKILLS="$HOME/.agents/skills/superkit"
  if [ -L "$CODEX_SKILLS" ] || [ -d "$CODEX_SKILLS" ]; then
    warn "Codex skills already installed at $CODEX_SKILLS"
  else
    mkdir -p "$HOME/.agents/skills"
    ln -s "$PACKAGES/codex/skills" "$CODEX_SKILLS"
    info "Symlinked Codex skills → ~/.agents/skills/superkit"
  fi

  # Copy AGENTS.md if not exists
  if [ ! -f "$PROJECT_DIR/AGENTS.md" ]; then
    cp "$PACKAGES/codex/AGENTS.md" "$PROJECT_DIR/AGENTS.md"
    info "Created AGENTS.md template"
  fi

  # Copy config.toml if not exists
  mkdir -p "$PROJECT_DIR/.codex"
  if [ ! -f "$PROJECT_DIR/.codex/config.toml" ]; then
    cp "$PACKAGES/codex/config.toml" "$PROJECT_DIR/.codex/config.toml"
    info "Created .codex/config.toml"
  fi
fi
```

- [ ] **Step 2: Commit**
```bash
git add setup.sh
git commit -m "feat: add Codex CLI support to setup.sh"
```

---

## Task 7: Update README and docs

**Files:**
- Modify: `README.md` — add Codex Support section
- Create: `docs/guide/10-codex-support.md` — new chapter

- [ ] **Step 1: Add to README.md**

After "Using with Superpowers Plugin" section:

```markdown
## Codex CLI Support

superkit works with both Claude Code and OpenAI Codex CLI:

| Feature | Claude Code | Codex CLI |
|---------|:-:|:-:|
| Agents (as skills) | 22 | 22 |
| Commands / Orchestrators | 8 (slash commands) | 8 (user-invocable skills) |
| Hooks (auto-format, auto-lint) | 12 | — |
| Rules | 3 (separate files) | Inline in AGENTS.md |
| Skills | 3 | 3 |
| Session continuity | Yes | — |
| Subagent dispatch | Agent tool | spawn_agent |

See [Codex Installation](packages/codex/INSTALL.md) for setup instructions.
```

- [ ] **Step 2: Write chapter 10**

Guide chapter explaining Claude Code ↔ Codex differences, tool mapping, what works and what doesn't.

- [ ] **Step 3: Commit**
```bash
git add README.md docs/guide/10-codex-support.md
git commit -m "docs: add Codex CLI support documentation"
```

---

## Task 8: Validate and push

- [ ] **Step 1: Verify file counts**

```bash
find packages/codex/skills -name "SKILL.md" | wc -l  # expect 33 (22 agents + 8 commands + 3 meta)
ls packages/codex/AGENTS.md                            # exists
ls packages/codex/config.toml                          # exists
ls packages/codex/INSTALL.md                           # exists
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Summary

| Deliverable | Files |
|-------------|-------|
| AGENTS.md template | 1 |
| config.toml template | 1 |
| Codex skills (agents) | 22 (16 core + 4 stack + 2 extras) |
| Codex skills (commands) | 8 |
| Codex skills (meta) | 3 |
| INSTALL.md | 1 |
| Conversion script | 1 |
| setup.sh update | 1 |
| README update | 1 |
| Guide chapter 10 | 1 |
| **Total new files** | **~40** |
