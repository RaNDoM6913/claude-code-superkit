#!/bin/bash
# session-context-restore.sh — SessionStart hook
# Restores last saved context at session start
# Includes: git state, task state, architectural decisions, review findings, discovered issues
# Output to stdout is injected into Claude's context

CONTEXT_FILE="$HOME/.config/claude-superkit/last-context.md"

if [ -f "$CONTEXT_FILE" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    FILE_AGE=$(( $(date +%s) - $(stat -f %m "$CONTEXT_FILE") ))
  else
    FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$CONTEXT_FILE") ))
  fi

  if [ "$FILE_AGE" -lt 86400 ]; then
    # Validate context file is readable
    if [ ! -s "$CONTEXT_FILE" ]; then
      echo "<previous-session-context>"
      echo "WARNING: Previous context file is empty or corrupted. Starting fresh."
      echo "</previous-session-context>"
    else
      echo "<previous-session-context>"
      cat "$CONTEXT_FILE"
      echo "</previous-session-context>"
    fi

    # Inject task state if present in project
    if [ -f ".claude/.task-state.json" ]; then
      # Validate JSON
      if node -e "JSON.parse(require('fs').readFileSync('.claude/.task-state.json','utf8'))" 2>/dev/null; then
        echo ""
        echo "<task-state>"
        cat .claude/.task-state.json
        echo "</task-state>"
      else
        echo ""
        echo "<task-state>"
        echo "WARNING: .task-state.json is invalid JSON. Ignoring."
        echo "</task-state>"
      fi
    fi

    # Inject active plan if present
    if [ -f ".claude/.active-plan.md" ]; then
      echo ""
      echo "<active-plan>"
      head -50 ".claude/.active-plan.md" 2>/dev/null
      echo "</active-plan>"
    fi

    # Inject discovered issues if present
    if [ -f ".claude/.discovered-issues.md" ]; then
      echo ""
      echo "<discovered-issues>"
      cat ".claude/.discovered-issues.md" 2>/dev/null
      echo "</discovered-issues>"
    fi

    # Inject last review findings if present
    if [ -f ".claude/.last-review.md" ]; then
      echo ""
      echo "<last-review-findings>"
      cat ".claude/.last-review.md" 2>/dev/null
      echo "</last-review-findings>"
    fi
  fi
fi

exit 0
