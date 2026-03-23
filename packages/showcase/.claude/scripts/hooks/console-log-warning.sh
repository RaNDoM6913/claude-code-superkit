#!/bin/bash
# console-log-warning.sh — PostToolUse hook for Edit/Write
# Warns if console.log is added to .ts/.tsx files
# Profile: fast, standard, strict (always on)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

if echo "$NEW_STRING" | grep -qE 'console\.(log|debug|info)'; then
  echo "WARNING: console.log detected in $FILE_PATH — remember to remove before commit" >&2
fi

exit 0
