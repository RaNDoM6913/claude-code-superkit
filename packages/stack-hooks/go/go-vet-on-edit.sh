#!/bin/bash
# go-vet-on-edit.sh — PostToolUse hook for Edit/Write
# Runs go vet on the package containing the edited .go file.
# Finds the nearest go.mod to determine the module root.
# Profile: strict only

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" != "strict" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.go$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Find nearest go.mod by walking up from the file's directory
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

if [ -z "$MODULE_ROOT" ]; then
  exit 0
fi

cd "$MODULE_ROOT" 2>/dev/null || exit 0

# Compute relative package path from module root
REL_PKG="./${DIR#$MODULE_ROOT/}"

RESULT=$(go vet "$REL_PKG" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "go vet issues:" >&2
  echo "$RESULT" | head -15 >&2
fi

exit 0
