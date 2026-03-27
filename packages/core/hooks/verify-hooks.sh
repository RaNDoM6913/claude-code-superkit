#!/usr/bin/env bash
# verify-hooks.sh — Check that hook scripts are tracked in git and executable
# Run: bash .claude/scripts/hooks/verify-hooks.sh

set -euo pipefail

HOOKS_DIR=".claude/scripts/hooks"
ISSUES=0

# Check hooks directory exists
if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ Hooks directory not found: $HOOKS_DIR"
  echo "   Run the superkit installer to set up hooks."
  exit 1
fi

# Check .gitignore doesn't block hooks
if [ -f ".gitignore" ]; then
  if grep -qE '^\s*\.claude/scripts/?$|^\s*\.claude/scripts/\*' .gitignore 2>/dev/null; then
    echo "❌ CRITICAL: .gitignore blocks hook scripts!"
    echo "   Line found: $(grep -E '\.claude/scripts' .gitignore)"
    echo "   Remove this line — hooks MUST be tracked in git for enforcement to work."
    echo "   Other users who clone this repo will get NO hook enforcement."
    ISSUES=$((ISSUES + 1))
  fi
fi

# Check hooks are executable
for hook in "$HOOKS_DIR"/*.sh; do
  [ -f "$hook" ] || continue
  if [ ! -x "$hook" ]; then
    echo "⚠️  Not executable: $hook"
    echo "   Fix: chmod +x $hook"
    ISSUES=$((ISSUES + 1))
  fi
done

# Check hooks are tracked in git
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  for hook in "$HOOKS_DIR"/*.sh; do
    [ -f "$hook" ] || continue
    if git check-ignore -q "$hook" 2>/dev/null; then
      echo "❌ Git-ignored: $hook"
      echo "   This hook won't be available to anyone who clones the repo."
      ISSUES=$((ISSUES + 1))
    fi
  done

  UNTRACKED=$(git ls-files --others --exclude-standard "$HOOKS_DIR" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UNTRACKED" -gt 0 ]; then
    echo "⚠️  $UNTRACKED hook(s) not committed to git:"
    git ls-files --others --exclude-standard "$HOOKS_DIR" 2>/dev/null | while read -r f; do
      echo "   $f"
    done
    echo "   Run: git add $HOOKS_DIR/ && git commit"
    ISSUES=$((ISSUES + 1))
  fi
fi

if [ "$ISSUES" -eq 0 ]; then
  HOOK_COUNT=$(find "$HOOKS_DIR" -name '*.sh' 2>/dev/null | wc -l | tr -d ' ')
  echo "✅ All $HOOK_COUNT hooks are properly configured and tracked in git."
else
  echo ""
  echo "Found $ISSUES issue(s). Fix them to ensure enforcement works for all team members."
  exit 1
fi
