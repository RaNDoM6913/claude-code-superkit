#!/bin/bash
# cargo-check-on-edit.sh — PostToolUse hook for Edit/Write
# Runs cargo check in the nearest Cargo.toml directory after .rs file edits.
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

if [[ ! "$FILE_PATH" =~ \.rs$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Find nearest Cargo.toml by walking up from the file's directory
DIR=$(dirname "$FILE_PATH")
CARGO_ROOT=""
SEARCH_DIR="$DIR"
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/Cargo.toml" ]; then
    CARGO_ROOT="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$CARGO_ROOT" ]; then
  exit 0
fi

cd "$CARGO_ROOT" 2>/dev/null || exit 0

# Run cargo check (faster than cargo build, catches type/borrow errors)
RESULT=$(cargo check --message-format=short 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "cargo check errors in $CARGO_ROOT:" >&2
  # Show only error lines (not warnings) first, then warnings
  echo "$RESULT" | grep "^error" | head -10 >&2
  WARN_COUNT=$(echo "$RESULT" | grep -c "^warning")
  if [ "$WARN_COUNT" -gt 0 ]; then
    echo "($WARN_COUNT warnings)" >&2
  fi
fi

exit 0
