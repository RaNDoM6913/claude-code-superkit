#!/bin/bash
# typecheck-on-edit.sh — PostToolUse hook for Edit/Write
# Runs tsc --noEmit after .ts/.tsx edits in frontend/ or adminpanel/frontend/
# Uses SHA256 hash cache to skip tsc if file unchanged since last successful check.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# --- Hash cache: skip tsc if file unchanged since last successful check ---
CACHE_DIR="$HOME/.cache/myapp-typecheck"
mkdir -p "$CACHE_DIR" 2>/dev/null

if [ -f "$FILE_PATH" ]; then
  HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | cut -d' ' -f1)
  CACHE_KEY="$CACHE_DIR/$(echo "$FILE_PATH" | tr '/' '_').hash"
  if [ -n "$HASH" ] && [ -f "$CACHE_KEY" ] && [ "$(cat "$CACHE_KEY" 2>/dev/null)" = "$HASH" ]; then
    exit 0  # Unchanged since last successful check — skip tsc
  fi
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TSC_OK=0

if [[ "$FILE_PATH" == *"frontend/src/"* && "$FILE_PATH" != *"adminpanel/"* ]]; then
  cd "$PROJECT_DIR/frontend" 2>/dev/null || exit 0
  RESULT=$(npx tsc --noEmit 2>&1)
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "TypeScript errors in frontend:" >&2
    echo "$RESULT" | head -20 >&2
    rm -f "$CACHE_KEY" 2>/dev/null
  else
    TSC_OK=1
  fi
elif [[ "$FILE_PATH" == *"adminpanel/frontend/src/"* ]]; then
  cd "$PROJECT_DIR/adminpanel/frontend" 2>/dev/null || exit 0
  RESULT=$(npx tsc --noEmit 2>&1)
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "TypeScript errors in adminpanel/frontend:" >&2
    echo "$RESULT" | head -20 >&2
    rm -f "$CACHE_KEY" 2>/dev/null
  else
    TSC_OK=1
  fi
fi

# Save hash on successful check
if [ "$TSC_OK" = "1" ] && [ -n "$HASH" ] && [ -n "$CACHE_KEY" ]; then
  echo "$HASH" > "$CACHE_KEY" 2>/dev/null
fi

exit 0
