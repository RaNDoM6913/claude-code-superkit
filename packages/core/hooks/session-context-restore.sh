#!/bin/bash
# session-context-restore.sh — SessionStart hook
# Restores last saved context at session start
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
  fi
fi

exit 0
