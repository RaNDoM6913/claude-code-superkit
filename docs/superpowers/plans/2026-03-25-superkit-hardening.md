# Superkit Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 22 issues found during audit — make superkit bulletproof for both pros and beginners.

**Architecture:** Three phases: (1) harden setup.sh with proper checks, validation, backup/rollback; (2) fix docs, README, add troubleshooting; (3) sync showcase with core.

**Tech Stack:** Bash, jq, Markdown

---

## Phase 1 — Harden setup.sh (Critical + High)

### Task 1: Add Claude CLI prerequisite check

**Files:**
- Modify: `setup.sh:30-38`

- [ ] **Step 1: Add claude CLI check after jq check**

Add between line 38 and 40:
```bash
# Check claude CLI (recommended)
if ! command -v claude &>/dev/null; then
  warn "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"
  warn "Superkit requires Claude Code to function. Continuing setup anyway..."
fi
```

- [ ] **Step 2: Improve git repo error message**

Change line 42:
```bash
  fail "Not inside a git repository. Run from your project root: cd /path/to/your-project"
```

- [ ] **Step 3: Commit**
```bash
git add setup.sh && git commit -m "fix: add Claude CLI prerequisite check"
```

---

### Task 2: Add error handling to copy functions

**Files:**
- Modify: `setup.sh:175-190`

- [ ] **Step 1: Add error handling to copy_file()**

Replace lines 175-182:
```bash
copy_file() {
  local src="$1" dst="$2"
  if [ "$MODE" = "merge" ] && [ -f "$dst" ]; then
    return 0  # skip existing
  fi
  mkdir -p "$(dirname "$dst")" || { warn "Cannot create directory for $dst"; return 1; }
  cp "$src" "$dst" || { warn "Failed to copy $src → $dst"; return 1; }
}
```

- [ ] **Step 2: Add error counter**

Add after line 173 (after "Installing..."):
```bash
ERRORS=0
```

Track errors in copy_file by incrementing `((ERRORS++))` on failure.

- [ ] **Step 3: Commit**
```bash
git add setup.sh && git commit -m "fix: add error handling to copy functions"
```

---

### Task 3: Protect installed_plugins.json with backup/rollback

**Files:**
- Modify: `setup.sh:81-104` (superpowers install section)

- [ ] **Step 1: Add backup before jq mutation**

Before line 101, add:
```bash
        # Backup before mutation
        cp "$INSTALLED_PLUGINS" "$INSTALLED_PLUGINS.bak" 2>/dev/null || true
```

- [ ] **Step 2: Add validation after jq mutation**

After line 104 (the mv line), add:
```bash
        # Validate JSON integrity
        if ! jq empty "$INSTALLED_PLUGINS" 2>/dev/null; then
          warn "Plugin registry corrupted during install — restoring backup"
          cp "$INSTALLED_PLUGINS.bak" "$INSTALLED_PLUGINS" 2>/dev/null || true
        else
          rm -f "$INSTALLED_PLUGINS.bak"
        fi
```

- [ ] **Step 3: Same for settings.json mutations**

Wrap lines 267-269 similarly — backup before, validate after:
```bash
    cp "$SETTINGS" "$SETTINGS.bak" 2>/dev/null || true
    jq --arg cmd ... "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
    if ! jq empty "$SETTINGS" 2>/dev/null; then
      warn "settings.json corrupted — restoring backup"
      cp "$SETTINGS.bak" "$SETTINGS"
    fi
```

- [ ] **Step 4: Commit**
```bash
git add setup.sh && git commit -m "fix: backup + rollback for JSON mutations"
```

---

### Task 4: Add post-install validation

**Files:**
- Modify: `setup.sh:389-422` (Summary section)

- [ ] **Step 1: Add validation checks before summary**

Insert before line 389 ("# ── Summary"):
```bash
# ── Post-Install Validation ──────────────────────────────
echo ""
VALIDATION_OK=true

# Check settings.json is valid
if [ -f "$SETTINGS" ]; then
  if jq empty "$SETTINGS" 2>/dev/null; then
    info "settings.json — valid JSON"
  else
    warn "settings.json — INVALID JSON! Hooks will not work."
    VALIDATION_OK=false
  fi
fi

# Check hooks are executable
NON_EXEC=$(find "$CLAUDE_DIR/scripts/hooks" -name "*.sh" ! -perm -111 2>/dev/null | wc -l | tr -d ' ')
if [ "$NON_EXEC" -gt 0 ]; then
  warn "$NON_EXEC hooks are not executable — running chmod..."
  chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null
fi

# Check CLAUDE.md exists
if [ -f "$PROJECT_DIR/CLAUDE.md" ]; then
  info "CLAUDE.md — present"
else
  warn "CLAUDE.md — missing! Run setup again."
  VALIDATION_OK=false
fi

# Check at least 1 agent exists
INSTALLED_AGENTS=$(ls "$CLAUDE_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$INSTALLED_AGENTS" -gt 0 ]; then
  info "$INSTALLED_AGENTS agents installed"
else
  warn "No agents found! Installation may have failed."
  VALIDATION_OK=false
fi

if [ "$VALIDATION_OK" = true ]; then
  info "All validation checks passed"
else
  warn "Some checks failed — review warnings above"
fi
```

- [ ] **Step 2: Commit**
```bash
git add setup.sh && git commit -m "feat: add post-install validation checks"
```

---

### Task 5: Fix hooks not executable in merge mode

**Files:**
- Modify: `setup.sh:253-254`

- [ ] **Step 1: Move chmod to run unconditionally, not just fresh install**

Line 254 already runs `chmod +x` but it's after the merge check. The fix is: chmod runs on ALL .sh files regardless of merge mode (it's idempotent).

Current code is actually fine — line 254 runs always. But we need it to also cover individually copied stack hooks. Add after line 254:
```bash
# Ensure ALL hooks are executable (covers merge mode too)
find "$CLAUDE_DIR/scripts/hooks" -name "*.sh" -exec chmod +x {} \; 2>/dev/null
```

- [ ] **Step 2: Commit**
```bash
git add setup.sh && git commit -m "fix: ensure hooks executable in merge mode"
```

---

### Task 6: Add --help flag and version

**Files:**
- Modify: `setup.sh:1-8`

- [ ] **Step 1: Add help/version flags at top of script**

After line 5 (`set -euo pipefail`), add:
```bash
VERSION="1.1.0"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "claude-code-superkit v$VERSION — interactive installer"
  echo ""
  echo "Usage: bash setup.sh [options]"
  echo ""
  echo "Options:"
  echo "  --help, -h     Show this help"
  echo "  --version, -v  Show version"
  echo ""
  echo "Run from your project root (must be a git repository)."
  echo "Requires: git, jq. Recommended: claude CLI, tree."
  exit 0
fi

if [ "${1:-}" = "--version" ] || [ "${1:-}" = "-v" ]; then
  echo "claude-code-superkit v$VERSION"
  exit 0
fi
```

- [ ] **Step 2: Commit**
```bash
git add setup.sh && git commit -m "feat: add --help and --version flags"
```

---

## Phase 2 — Docs & UX (High + Medium)

### Task 7: Create TROUBLESHOOTING.md

**Files:**
- Create: `TROUBLESHOOTING.md`

- [ ] **Step 1: Write troubleshooting guide**

```markdown
# Troubleshooting

## Installation Issues

### "jq: command not found"
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Windows (via Chocolatey)
choco install jq

# Windows (via Scoop)
scoop install jq
```

### "Not inside a git repository"
Run setup.sh from your project root:
```bash
cd /path/to/your-project
git init  # if not a git repo yet
bash /path/to/claude-code-superkit/setup.sh
```

### "Claude Code CLI not found"
```bash
npm install -g @anthropic-ai/claude-code
```

## After Installation

### Hooks not firing
1. Check settings.json is valid: `jq empty .claude/settings.json`
2. Check hooks are executable: `ls -la .claude/scripts/hooks/`
3. Check profile: `echo $CLAUDE_HOOK_PROFILE` (should be fast/standard/strict)
4. Fix permissions: `chmod +x .claude/scripts/hooks/*.sh`

### "/review returns no results"
- Ensure you have changes: `git diff --stat HEAD~1`
- Check agents exist: `ls .claude/agents/`
- Run with explicit target: `/review HEAD~3`

### settings.json is corrupted
Restore from backup or regenerate:
```bash
# If backup exists
cp .claude/settings.json.bak .claude/settings.json

# Or regenerate: re-run setup.sh with overwrite mode
bash /path/to/claude-code-superkit/setup.sh
# Choose [o] overwrite
```

### Superpowers skills not working
```bash
# Check if installed
ls ~/.claude/plugins/cache/claude-plugins-official/superpowers/

# If missing, install manually:
# Open Claude Code → /plugins → search 'superpowers' → install
```

## Platform-Specific

### Windows / WSL
- Use WSL2 (not WSL1) for full compatibility
- Run setup.sh from WSL bash, not Git Bash or PowerShell
- Hooks use bash — ensure `/bin/bash` exists in WSL
- Line endings: clone with `git config core.autocrlf input`

### Linux
- Ensure bash 4+: `bash --version`
- Install jq: `sudo apt install jq` or `sudo yum install jq`
- If `tree` is missing: `sudo apt install tree` (optional, fallback exists)

### macOS
- Install jq: `brew install jq`
- Bash 3 ships with macOS — install bash 4+: `brew install bash`
```

- [ ] **Step 2: Commit**
```bash
git add TROUBLESHOOTING.md && git commit -m "docs: add troubleshooting guide"
```

---

### Task 8: Fix README.md issues

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Fix Manual Copy paths — add SUPERKIT variable**

Replace Option 2 section with explicit paths:
```markdown
### Option 2: Manual Copy

```bash
# Set the path to your cloned superkit
SUPERKIT="/path/to/claude-code-superkit"

# Copy core files
cp -r $SUPERKIT/packages/core/agents/ .claude/agents/
cp -r $SUPERKIT/packages/core/commands/ .claude/commands/
cp -r $SUPERKIT/packages/core/hooks/ .claude/scripts/hooks/
cp -r $SUPERKIT/packages/core/rules/ .claude/rules/
cp -r $SUPERKIT/packages/core/skills/ .claude/skills/
cp $SUPERKIT/packages/core/settings.json .claude/settings.json
cp $SUPERKIT/packages/core/CLAUDE.md ./CLAUDE.md

# Add stack-specific agents (example: Go + TypeScript)
cp $SUPERKIT/packages/stack-agents/go/go-reviewer.md .claude/agents/
cp $SUPERKIT/packages/stack-agents/typescript/ts-reviewer.md .claude/agents/

# Add stack-specific hooks
cp $SUPERKIT/packages/stack-hooks/go/*.sh .claude/scripts/hooks/
cp $SUPERKIT/packages/stack-hooks/typescript/*.sh .claude/scripts/hooks/

# Make hooks executable
chmod +x .claude/scripts/hooks/*.sh
```
```

- [ ] **Step 2: Add missing commands to Key Commands table**

Add: `/docs-init`, `/security-scan`, `/new-migration`, `/migrate`

- [ ] **Step 3: Add link to TROUBLESHOOTING.md**

After Key Commands section:
```markdown
## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and platform-specific guidance.
```

- [ ] **Step 4: Update counts** (extras now 3+1 skill, rules 5)

- [ ] **Step 5: Commit**
```bash
git add README.md && git commit -m "docs: fix README paths, add missing commands, link troubleshooting"
```

---

### Task 9: Add First Run Walkthrough to getting-started guide

**Files:**
- Modify: `packages/core/docs/guide/01-getting-started.md`

- [ ] **Step 1: Add "Your First Commands" section at the end**

```markdown
## Your First Commands

After installation, here's what to try:

### 1. Verify installation
```bash
claude
# Type: /review --full
# Expected: dispatches reviewer agents, shows findings report
```

### 2. Check project health
```bash
# Type: /audit
# Expected: dispatches 4 parallel audit agents (frontend, backend, infra, security)
```

### 3. If something doesn't work
- Check `TROUBLESHOOTING.md` in the superkit repo
- Run `jq empty .claude/settings.json` — must print nothing (= valid)
- Run `ls -la .claude/scripts/hooks/*.sh` — all should have `x` permission
```

- [ ] **Step 2: Add prerequisites list (claude, git, jq, gh optional)**

- [ ] **Step 3: Commit**
```bash
git add packages/core/docs/guide/01-getting-started.md && git commit -m "docs: add first run walkthrough and prerequisites"
```

---

## Phase 3 — Showcase Sync (Medium)

### Task 10: Add Phase 0 to all showcase agents

**Files:**
- Modify: all 21 files in `packages/showcase/.claude/agents/`

- [ ] **Step 1: Script to add Phase 0 to showcase agents that lack it**

For each showcase agent that's missing Phase 0, add after the description header:
```markdown
## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. `docs/architecture/` — relevant architecture docs for the task at hand

**Use this context to:**
- Know project-specific conventions and patterns
- Identify documented rules to check with HIGH confidence
- Understand the tech stack and framework in use
```

Use sed/script to batch-add this to all 21 agents.

- [ ] **Step 2: Verify all agents have Phase 0**
```bash
grep -rL "Phase 0" packages/showcase/.claude/agents/ | wc -l
# Expected: 0
```

- [ ] **Step 3: Commit**
```bash
git add packages/showcase/.claude/agents/ && git commit -m "fix: add Phase 0 to all showcase agents"
```

---

### Task 11: Add missing documentation.md rule to showcase

**Files:**
- Copy: `packages/core/rules/documentation.md` → `packages/showcase/.claude/rules/documentation.md`

- [ ] **Step 1: Copy the rule**
```bash
cp packages/core/rules/documentation.md packages/showcase/.claude/rules/documentation.md
```

- [ ] **Step 2: Commit**
```bash
git add packages/showcase/.claude/rules/ && git commit -m "fix: add missing documentation.md rule to showcase"
```

---

### Task 12: Fix showcase onyx-ui-standard skill frontmatter

**Files:**
- Modify: `packages/showcase/.claude/skills/onyx-ui-standard/SKILL.md`

- [ ] **Step 1: Add proper YAML frontmatter**

Prepend to file:
```yaml
---
name: onyx-ui-standard
description: ONYX Liquid Glass design system — colors, glassmorphism, z-index layers, layout standards
---
```

- [ ] **Step 2: Commit**
```bash
git add packages/showcase/.claude/skills/onyx-ui-standard/ && git commit -m "fix: add frontmatter to onyx-ui-standard skill"
```

---

### Task 13: Final commit and push both repos

- [ ] **Step 1: Push superkit**
```bash
cd /path/to/claude-code-superkit
git push
```

- [ ] **Step 2: Sync TGApp setup.sh if applicable**
TGApp doesn't use setup.sh (it has its own .claude/), but if any showcase changes affect TGApp agents, sync them.

---

## Summary

| Phase | Tasks | Fixes |
|-------|-------|-------|
| 1 — setup.sh hardening | 6 tasks | Claude CLI check, error handling, JSON backup/rollback, post-validation, chmod fix, --help |
| 2 — Docs & UX | 3 tasks | TROUBLESHOOTING.md, README fixes, First Run walkthrough |
| 3 — Showcase sync | 4 tasks | Phase 0 in 21 agents, missing rule, skill frontmatter, push |
| **Total** | **13 tasks** | **22 issues fixed** |
