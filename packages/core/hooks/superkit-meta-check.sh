#!/bin/bash
# superkit-meta-check.sh — verify meta-documentation consistency before commit
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict
# Purpose: catches stale counts in README, CLAUDE.md, GitHub description,
#          Codex AGENTS.md, INSTALL docs — the gap that project-level
#          doc-check-on-commit.sh cannot cover.

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read the tool input (JSON with command field)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null)

# Only trigger on git commit commands
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Only run if we're in the superkit repo (check for setup.sh + packages/core)
if [ ! -f "setup.sh" ] || [ ! -d "packages/core" ]; then
  exit 0
fi

ERRORS=()

# ── Count actual files ─────────────────────────────────────
ACTUAL_AGENTS=$(ls packages/core/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_COMMANDS=$(ls packages/core/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_CORE_HOOKS=$(ls packages/core/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_STACK_HOOKS=$(ls packages/stack-hooks/*/*.sh 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_RULES=$(ls packages/core/rules/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_CODEX_SKILLS=$(find packages/codex/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_SHOWCASE_AGENTS=$(ls packages/showcase/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL_HOOKS=$((ACTUAL_CORE_HOOKS + ACTUAL_STACK_HOOKS))

# ── Check CLAUDE.md counts table ──────────────────────────
if [ -f "CLAUDE.md" ]; then
  # Check agents count
  CLAUDE_AGENTS=$(grep -oP 'Agents \| \K[0-9]+' CLAUDE.md | head -1)
  if [ -n "$CLAUDE_AGENTS" ] && [ "$CLAUDE_AGENTS" != "$ACTUAL_AGENTS" ]; then
    ERRORS+=("CLAUDE.md: agents count $CLAUDE_AGENTS ≠ actual $ACTUAL_AGENTS")
  fi

  # Check rules count
  CLAUDE_RULES=$(grep -oP 'Rules \| \K[0-9]+' CLAUDE.md | head -1)
  if [ -n "$CLAUDE_RULES" ] && [ "$CLAUDE_RULES" != "$ACTUAL_RULES" ]; then
    ERRORS+=("CLAUDE.md: rules count $CLAUDE_RULES ≠ actual $ACTUAL_RULES")
  fi

  # Check commands count
  CLAUDE_COMMANDS=$(grep -oP 'Commands \| \K[0-9]+' CLAUDE.md | head -1)
  if [ -n "$CLAUDE_COMMANDS" ] && [ "$CLAUDE_COMMANDS" != "$ACTUAL_COMMANDS" ]; then
    ERRORS+=("CLAUDE.md: commands count $CLAUDE_COMMANDS ≠ actual $ACTUAL_COMMANDS")
  fi
fi

# ── Check setup.sh summary counts ─────────────────────────
if [ -f "setup.sh" ]; then
  SETUP_RULES=$(grep -oP 'Rules:\s+\K[0-9]+' setup.sh)
  if [ -n "$SETUP_RULES" ] && [ "$SETUP_RULES" != "$ACTUAL_RULES" ]; then
    ERRORS+=("setup.sh: Rules summary $SETUP_RULES ≠ actual $ACTUAL_RULES")
  fi
fi

# ── Check README.md What's Inside table ───────────────────
if [ -f "README.md" ]; then
  README_RULES=$(grep -P '^\| \*\*Rules\*\*' README.md | grep -oP '\| \K[0-9]+' | head -1)
  if [ -n "$README_RULES" ] && [ "$README_RULES" != "$ACTUAL_RULES" ]; then
    ERRORS+=("README.md: rules count $README_RULES ≠ actual $ACTUAL_RULES")
  fi
fi

# ── Check docs/INSTALL-CLAUDE-CODE.md ─────────────────────
if [ -f "docs/INSTALL-CLAUDE-CODE.md" ]; then
  INSTALL_RULES=$(grep -oP '[0-9]+ rules' docs/INSTALL-CLAUDE-CODE.md | grep -oP '^[0-9]+' | head -1)
  if [ -n "$INSTALL_RULES" ] && [ "$INSTALL_RULES" != "$ACTUAL_RULES" ]; then
    ERRORS+=("docs/INSTALL-CLAUDE-CODE.md: rules count $INSTALL_RULES ≠ actual $ACTUAL_RULES")
  fi
fi

# ── Check VERSION in setup.sh matches VERSION file ────────
if [ -f "VERSION" ] && [ -f "setup.sh" ]; then
  FILE_VERSION=$(cat VERSION | tr -d '[:space:]')
  SETUP_VERSION=$(grep -oP 'VERSION="\K[^"]+' setup.sh | head -1)
  if [ -n "$SETUP_VERSION" ] && [ "$FILE_VERSION" != "$SETUP_VERSION" ]; then
    ERRORS+=("VERSION mismatch: file=$FILE_VERSION, setup.sh=$SETUP_VERSION")
  fi
fi

# ── Report ─────────────────────────────────────────────────
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "⚠ SUPERKIT META-DOCUMENTATION OUT OF SYNC:"
  echo ""
  for err in "${ERRORS[@]}"; do
    echo "   ✗ $err"
  done
  echo ""
  echo "   Actual counts: ${ACTUAL_AGENTS} agents, ${ACTUAL_COMMANDS} commands,"
  echo "   ${TOTAL_HOOKS} hooks (${ACTUAL_CORE_HOOKS}+${ACTUAL_STACK_HOOKS}), ${ACTUAL_RULES} rules,"
  echo "   ${ACTUAL_CODEX_SKILLS} codex skills, ${ACTUAL_SHOWCASE_AGENTS} showcase agents"
  echo ""
  echo "   Fix counts in all docs before committing."
  echo "   See CLAUDE.md → Mandatory Documentation Updates → Checklist."
  echo ""
fi

exit 0
