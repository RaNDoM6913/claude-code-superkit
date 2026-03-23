#!/bin/bash
# format-on-edit.sh — PostToolUse hook for Edit/Write
# Runs gofmt -w on edited Go files
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
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

if [ -f "$FILE_PATH" ]; then
  gofmt -w "$FILE_PATH" 2>/dev/null
fi

exit 0
