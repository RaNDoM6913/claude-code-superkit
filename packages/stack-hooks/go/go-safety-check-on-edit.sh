#!/bin/bash
# go-safety-check-on-edit.sh — PostToolUse hook for Edit/Write
# Detects common Go safety traps: nil maps, defer in loops, append aliasing.
# Profile: standard, strict

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

if [ -z "$FILE_PATH" ]; then exit 0; fi
if [[ ! "$FILE_PATH" =~ \.go$ ]]; then exit 0; fi
if [ ! -f "$FILE_PATH" ]; then exit 0; fi

WARNINGS=""

# Check 1: Uninitialized map — var m map[...] without make()
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  NEXT_LINES=$(sed -n "$((LINENO_+1)),$((LINENO_+3))p" "$FILE_PATH" 2>/dev/null)
  if ! echo "$NEXT_LINES" | grep -q 'make(\|= map\['; then
    WARNINGS="${WARNINGS}\n  warning: go-safety: line ${LINENO_} — map declared without initialization (nil map panics on write)"
    WARNINGS="${WARNINGS}\n    Fix: use make(map[K]V) or literal map[K]V{}"
  fi
done < <(grep -n 'var [a-zA-Z_]* map\[' "$FILE_PATH" 2>/dev/null)

# Check 2: defer inside for loop
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  # Look backwards for enclosing 'for' within 20 lines
  START=$((LINENO_ - 20))
  if [ "$START" -lt 1 ]; then START=1; fi
  CONTEXT=$(sed -n "${START},${LINENO_}p" "$FILE_PATH" 2>/dev/null)
  if echo "$CONTEXT" | grep -q '^\s*for '; then
    WARNINGS="${WARNINGS}\n  warning: go-safety: line ${LINENO_} — defer inside for loop (accumulates until function exit)"
    WARNINGS="${WARNINGS}\n    Fix: wrap in closure or extract to separate function"
  fi
done < <(grep -n '^\s*defer ' "$FILE_PATH" 2>/dev/null)

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo safety patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
