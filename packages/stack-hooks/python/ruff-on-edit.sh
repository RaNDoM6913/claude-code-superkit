#!/bin/bash
# ruff-on-edit.sh — PostToolUse hook for Edit/Write
# Runs ruff check --fix + ruff format on edited .py files.
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

if [[ ! "$FILE_PATH" =~ \.py$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Check if ruff is available
if ! command -v ruff &>/dev/null; then
  # Try via uvx or pipx as fallback
  if command -v uvx &>/dev/null; then
    RUFF="uvx ruff"
  elif command -v pipx &>/dev/null; then
    RUFF="pipx run ruff"
  else
    exit 0  # ruff not available, skip silently
  fi
else
  RUFF="ruff"
fi

# Run ruff check with auto-fix (safe fixes only)
$RUFF check --fix --select I "$FILE_PATH" 2>/dev/null

# Run ruff format
RESULT=$($RUFF format "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "ruff format issues:" >&2
  echo "$RESULT" | head -10 >&2
fi

# Run ruff check (lint) and report remaining issues
LINT_RESULT=$($RUFF check "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  echo "ruff lint issues:" >&2
  echo "$LINT_RESULT" | head -15 >&2
fi

exit 0
