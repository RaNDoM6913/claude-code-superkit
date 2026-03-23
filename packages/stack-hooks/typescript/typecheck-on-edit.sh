#!/bin/bash
# typecheck-on-edit.sh — PostToolUse hook for Edit/Write
# Runs tsc --noEmit after .ts/.tsx edits.
# Finds the nearest tsconfig.json to determine the TypeScript project root.
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

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# --- Hash cache: skip tsc if file unchanged since last successful check ---
CACHE_DIR="$HOME/.cache/claude-typecheck"
mkdir -p "$CACHE_DIR" 2>/dev/null

HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | cut -d' ' -f1)
CACHE_KEY="$CACHE_DIR/$(echo "$FILE_PATH" | tr '/' '_').hash"
if [ -n "$HASH" ] && [ -f "$CACHE_KEY" ] && [ "$(cat "$CACHE_KEY" 2>/dev/null)" = "$HASH" ]; then
  exit 0  # Unchanged since last successful check — skip tsc
fi

# Find nearest tsconfig.json by walking up from the file's directory
DIR=$(dirname "$FILE_PATH")
TS_ROOT=""
SEARCH_DIR="$DIR"
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/tsconfig.json" ]; then
    TS_ROOT="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$TS_ROOT" ]; then
  exit 0
fi

cd "$TS_ROOT" 2>/dev/null || exit 0

RESULT=$(npx tsc --noEmit 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "TypeScript errors in $TS_ROOT:" >&2
  echo "$RESULT" | head -20 >&2
  rm -f "$CACHE_KEY" 2>/dev/null
else
  # Save hash on successful check
  if [ -n "$HASH" ] && [ -n "$CACHE_KEY" ]; then
    echo "$HASH" > "$CACHE_KEY" 2>/dev/null
  fi
fi

exit 0
