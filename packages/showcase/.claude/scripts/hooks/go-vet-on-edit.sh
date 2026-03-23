#!/bin/bash
# go-vet-on-edit.sh — PostToolUse hook for Edit/Write
# Runs go vet after .go file edits in backend/
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

if [[ ! "$FILE_PATH" == *"backend/"* ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}/backend" 2>/dev/null || exit 0

PKG_DIR=$(dirname "$FILE_PATH")
REL_PKG="./${PKG_DIR#*backend/}"

RESULT=$(go vet "$REL_PKG" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "go vet issues:" >&2
  echo "$RESULT" | head -15 >&2
fi

exit 0
