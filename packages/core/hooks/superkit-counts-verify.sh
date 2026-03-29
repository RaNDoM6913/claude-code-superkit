#!/bin/bash
# superkit-counts-verify.sh — PreToolUse hook (Bash)
# Verifies file counts match documented counts before git commit/push
# Profile: standard, strict
# SUPERKIT-INTERNAL: only runs in the superkit repo itself
#
# EXIT CODES:
#   0 = allow (counts match or not a commit/push)
#   2 = BLOCK (count mismatch detected)

# Only run inside the superkit repo
if [ ! -f "packages/core/settings.json" ] || [ ! -d "packages/core/agents" ]; then
  exit 0
fi

# Read the tool input
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null)

# Only trigger on git commit or git push
if ! echo "$COMMAND" | grep -qE 'git\s+(commit|push)'; then
  exit 0
fi

ERRORS=""

# ── Count actual files ──────────────────────────────────────────────
ACTUAL_AGENTS=$(ls packages/core/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_CODEX=$(find packages/codex/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_HOOKS=$(ls packages/core/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_COMMANDS=$(ls packages/core/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_RULES=$(ls packages/core/rules/*.md 2>/dev/null | wc -l | tr -d ' ')

# ── Check VERSION vs package.json ───────────────────────────────────
VERSION_FILE=$(cat VERSION 2>/dev/null | tr -d '[:space:]')
PKG_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)

if [ "$VERSION_FILE" != "$PKG_VERSION" ]; then
  ERRORS="${ERRORS}\n  - VERSION ($VERSION_FILE) != package.json ($PKG_VERSION)"
fi

# ── Check README agent count ────────────────────────────────────────
README_AGENTS=$(grep -oP 'Core Agents.*?\|\s*\K\d+' README.md 2>/dev/null | head -1)
if [ -n "$README_AGENTS" ] && [ "$README_AGENTS" != "$ACTUAL_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - README Core Agents ($README_AGENTS) != actual ($ACTUAL_AGENTS)"
fi

# ── Check CLAUDE.md agent count ─────────────────────────────────────
CLAUDE_AGENTS=$(grep -P '^\| Agents \|' CLAUDE.md 2>/dev/null | grep -oP '\|\s*\K\d+' | head -1)
if [ -n "$CLAUDE_AGENTS" ] && [ "$CLAUDE_AGENTS" != "$ACTUAL_AGENTS" ]; then
  ERRORS="${ERRORS}\n  - CLAUDE.md Agents ($CLAUDE_AGENTS) != actual ($ACTUAL_AGENTS)"
fi

# ── Check Codex skill count in README ───────────────────────────────
README_CODEX=$(grep -oP '\d+ skills \(' README.md 2>/dev/null | grep -oP '^\d+' | head -1)
if [ -n "$README_CODEX" ] && [ "$README_CODEX" != "$ACTUAL_CODEX" ]; then
  ERRORS="${ERRORS}\n  - README Codex skills ($README_CODEX) != actual ($ACTUAL_CODEX)"
fi

# ── Output result ───────────────────────────────────────────────────
if [ -n "$ERRORS" ]; then
  echo ""
  echo "BLOCKED: Superkit count/version mismatch detected"
  echo ""
  echo -e "  Mismatches:${ERRORS}"
  echo ""
  echo "  Actual counts: agents=$ACTUAL_AGENTS codex=$ACTUAL_CODEX hooks=$ACTUAL_HOOKS commands=$ACTUAL_COMMANDS rules=$ACTUAL_RULES"
  echo "  VERSION=$VERSION_FILE package.json=$PKG_VERSION"
  echo ""
  echo "  Fix: update the documented counts to match actual file counts."
  echo ""
  exit 2
fi

exit 0
