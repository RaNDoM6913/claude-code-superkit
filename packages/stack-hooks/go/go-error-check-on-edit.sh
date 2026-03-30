#!/bin/bash
# go-error-check-on-edit.sh — PostToolUse hook for Edit/Write
# Detects common Go error handling anti-patterns in real-time.
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

# Check 1: Swallowed errors — _ = functionCall()
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LINENO_} — error discarded with _ ="
  WARNINGS="${WARNINGS}\n    Fix: handle or wrap: if err != nil { return fmt.Errorf(\"context: %%w\", err) }"
done < <(grep -n '_ = [a-zA-Z]' "$FILE_PATH" 2>/dev/null | grep -v '_ = range\|_ = len\|_ = cap')

# Check 2: Log-and-return — log.X() followed by return err
while IFS= read -r line; do
  LN=$(echo "$line" | cut -d: -f1)
  NEXT=$(sed -n "$((LN+1))p" "$FILE_PATH" 2>/dev/null)
  if echo "$NEXT" | grep -q 'return.*err'; then
    WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LN} — log-and-return anti-pattern (log OR return, never both)"
  fi
done < <(grep -n 'log\.\(Print\|Error\|Warn\|Info\|Fatal\)' "$FILE_PATH" 2>/dev/null)

# Check 3: fmt.Sprintf inside fmt.Errorf
while IFS= read -r line; do
  LINENO_=$(echo "$line" | cut -d: -f1)
  WARNINGS="${WARNINGS}\n  warning: go-error-check: line ${LINENO_} — fmt.Sprintf inside fmt.Errorf (double formatting)"
  WARNINGS="${WARNINGS}\n    Fix: use fmt.Errorf(\"context %%s: %%w\", val, err) directly"
done < <(grep -n 'fmt\.Errorf.*fmt\.Sprintf' "$FILE_PATH" 2>/dev/null)

if [ -n "$WARNINGS" ]; then
  echo -e "\nGo error patterns detected:${WARNINGS}" >&2
  echo "" >&2
fi

exit 0
