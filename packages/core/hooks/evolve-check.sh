#!/bin/bash
# evolve-check.sh — advisory check for documentation drift at session start
# Triggers on: SessionStart
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Only check if superkit is installed
if [ ! -f ".claude/commands/superkit-evolve.md" ] 2>/dev/null; then
  exit 0
fi

# Rate limit: check at most once per 24h
LAST_CHECK_FILE="$HOME/.claude/.superkit-evolve-last-check"
NOW=$(date +%s)
LAST=$(cat "$LAST_CHECK_FILE" 2>/dev/null || echo "0")
DIFF=$((NOW - LAST))

if [ "$DIFF" -lt 86400 ]; then
  exit 0
fi

echo "$NOW" > "$LAST_CHECK_FILE"

ISSUES=()

# Check 1: Migration counter drift
if [ -f "CLAUDE.md" ]; then
  ACTUAL_MIGRATIONS=$(find . -path "*/migrations/*.up.sql" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ACTUAL_MIGRATIONS" -gt 0 ]; then
    CLAIMED=$(grep -oP '000001\.\.\K[0-9]+' CLAUDE.md 2>/dev/null | tr -d '0' | head -1)
    if [ -n "$CLAIMED" ] && [ "$ACTUAL_MIGRATIONS" != "$CLAIMED" ]; then
      ISSUES+=("Migration counter drift (CLAUDE.md: $CLAIMED, actual: $ACTUAL_MIGRATIONS)")
    fi
  fi
fi

# Check 2: Tree freshness (>20 new files since tree generation)
if [ -d "docs/trees" ]; then
  NEWEST_TREE=$(find docs/trees -name "*.md" -newer docs/trees -print -quit 2>/dev/null)
  NEW_FILES=$(find . \( -name "*.go" -o -name "*.ts" -o -name "*.py" -o -name "*.rs" \) -newer docs/trees/ 2>/dev/null | grep -v node_modules | grep -v vendor | wc -l | tr -d ' ')
  if [ "$NEW_FILES" -gt 20 ]; then
    ISSUES+=("$NEW_FILES new code files since last tree generation")
  fi
fi

# Check 3: Missing docs for detected components
for dir in backend frontend adminpanel workers bots services; do
  if [ -d "$dir" ] && [ ! -f "docs/architecture/${dir}-layers.md" ] && [ ! -f "docs/architecture/${dir}.md" ]; then
    FILE_COUNT=$(find "$dir" \( -name "*.go" -o -name "*.ts" -o -name "*.py" \) 2>/dev/null | wc -l | tr -d ' ')
    if [ "$FILE_COUNT" -gt 5 ]; then
      ISSUES+=("$dir/ has $FILE_COUNT code files but no architecture doc")
    fi
  fi
done

# Report
if [ ${#ISSUES[@]} -gt 0 ]; then
  echo ""
  echo "⚠ superkit-evolve: detected ${#ISSUES[@]} documentation issues:"
  for issue in "${ISSUES[@]}"; do
    echo "  · $issue"
  done
  echo ""
  echo "  Run /superkit-evolve to fix, or ignore if not needed."
  echo ""
fi

exit 0
