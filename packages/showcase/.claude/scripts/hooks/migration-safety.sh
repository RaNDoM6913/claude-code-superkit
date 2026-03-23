#!/bin/bash
# migration-safety.sh — PostToolUse hook for Edit/Write
# Validates SQL migration files: checks for matching down.sql, non-empty content,
# and correct naming convention (000NNN_description.{up,down}.sql).
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

# Only process migration SQL files
if [[ ! "$FILE_PATH" =~ backend/migrations/.*\.sql$ ]]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Check naming convention: 000NNN_description.{up,down}.sql
if [[ ! "$BASENAME" =~ ^[0-9]{6}_[a-z0-9_]+\.(up|down)\.sql$ ]]; then
  echo "WARNING: Migration doesn't follow 000NNN_description.{up,down}.sql convention: $BASENAME" >&2
fi

# If writing up.sql, check matching down.sql exists
if [[ "$FILE_PATH" =~ \.up\.sql$ ]]; then
  DOWN_FILE="${FILE_PATH%.up.sql}.down.sql"
  if [ ! -f "$DOWN_FILE" ]; then
    echo "WARNING: No matching DOWN migration: $(basename "$DOWN_FILE")" >&2
    echo "  Create the rollback migration before committing." >&2
  fi
fi

# If writing down.sql, verify it has actual SQL content (not empty/comments-only)
if [[ "$FILE_PATH" =~ \.down\.sql$ ]] && [ -f "$FILE_PATH" ]; then
  SQL_LINES=$(grep -cvE '^\s*$|^\s*--' "$FILE_PATH" 2>/dev/null)
  if [ "${SQL_LINES:-0}" -eq 0 ]; then
    echo "WARNING: DOWN migration has no SQL statements: $BASENAME" >&2
    echo "  Add rollback SQL (DROP/ALTER) to ensure reversibility." >&2
  fi
fi

exit 0
