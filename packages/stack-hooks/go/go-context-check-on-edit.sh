#!/bin/bash
# go-context-check-on-edit.sh — PostToolUse hook for Edit/Write
# Warns on Go context.Context usage anti-patterns.
# Profile: standard, strict

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
FILENAME=$(basename "$FILE_PATH")
IS_TEST=false
if [[ "$FILENAME" =~ _test\.go$ ]]; then IS_TEST=true; fi

# Check 1: context.Background() outside main/init/test
if [ "$IS_TEST" = false ]; then
  while IFS= read -r line; do
    LINENO_=$(echo "$line" | cut -d: -f1)
    # Check if the function containing this line is main or init
    FUNC_LINE=$(head -n "$LINENO_" "$FILE_PATH" | grep -n 'func main\|func init' | tail -1)
    if [ -z "$FUNC_LINE" ]; then
      WARNINGS="${WARNINGS}\n  warning: go-context-check: line ${LINENO_} — context.Background() outside main/init/test"
      WARNINGS="${WARNINGS}\n    Fix: accept ctx context.Context as parameter instead"
    fi
  done < <(grep -n 'context\.Background()' "$FILE_PATH" 2>/dev/null)
fi

# Check 2: context.TODO() in non-test files
if [ "$IS_TEST" = false ]; then
  while IFS= read -r line; do
    LINENO_=$(echo "$line" | cut -d: -f1)
    WARNINGS="${WARNINGS}\n  warning: go-context-check: line ${LINENO_} — context.TODO() in production code"
    WARNINGS="${WARNINGS}\n    Fix: replace with proper context propagation from caller"
  done < <(grep -n 'context\.TODO()' "$FILE_PATH" 2>/dev/null)
fi

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo context patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
