#!/bin/bash
# ruff-on-edit.sh — PostToolUse hook for Edit/Write
# Runs ruff check --fix + ruff format on edited .py files.
# Profile: standard, strict (skip on fast)

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

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

# Use only an already-installed ruff: the nearest project venv (.venv/ or
# venv/ at or above the file — the project's pinned version), else PATH
# (which includes an activated venv). Never uvx / pipx run / uv run: they
# download an unpinned ruff on an edit. Not installed → skip silently.
RUFF=""
SEARCH_DIR=$(dirname "$FILE_PATH")
while [ -z "$RUFF" ] && [ "$SEARCH_DIR" != "/" ] && [ "$SEARCH_DIR" != "." ]; do
  for VENV in .venv venv; do
    if [ -x "$SEARCH_DIR/$VENV/bin/ruff" ]; then
      RUFF="$SEARCH_DIR/$VENV/bin/ruff"
      break
    fi
  done
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done
if [ -z "$RUFF" ]; then
  command -v ruff >/dev/null 2>&1 || exit 0
  RUFF="ruff"
fi

# Run ruff check with auto-fix (safe fixes only)
"$RUFF" check --fix --select I "$FILE_PATH" 2>/dev/null

# Run ruff format
RESULT=$("$RUFF" format "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "ruff format issues:" >&2
  echo "$RESULT" | head -10 >&2
fi

# Run ruff check (lint) and report remaining issues
LINT_RESULT=$("$RUFF" check "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  echo "ruff lint issues:" >&2
  echo "$LINT_RESULT" | head -15 >&2
fi

exit 0
