#!/bin/bash
# golangci-lint-on-edit.sh — PostToolUse hook for Edit/Write
# Runs golangci-lint on the package containing the edited .go file.
# Profile: strict only (too slow for standard, ~2-5s)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

# Check golangci-lint is available
if ! command -v golangci-lint &>/dev/null; then
  exit 0
fi

# Find nearest go.mod
DIR=$(dirname "$FILE_PATH")
MODULE_ROOT=""
SEARCH_DIR="$DIR"
while [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  if [ -f "$SEARCH_DIR/go.mod" ]; then
    MODULE_ROOT="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$MODULE_ROOT" ]; then exit 0; fi

cd "$MODULE_ROOT" 2>/dev/null || exit 0

REL_PKG="./${DIR#$MODULE_ROOT/}"

RESULT=$(golangci-lint run --fast "$REL_PKG" 2>&1 | head -10)
if [ -n "$RESULT" ]; then
  echo "golangci-lint issues:" >&2
  echo "$RESULT" >&2
  echo "" >&2
fi

exit 0
