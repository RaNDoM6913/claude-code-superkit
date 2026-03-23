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
    echo "<previous-session-context>"
    cat "$CONTEXT_FILE"
    echo "</previous-session-context>"
  fi
fi

exit 0
