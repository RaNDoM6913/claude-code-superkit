#!/bin/bash
# PostToolUse hook: warn when new imports reference packages not in package.json
# Profile: skip on fast, run on standard/strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then exit 0; fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only process TypeScript files
if [ -z "$FILE_PATH" ] || [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then exit 0; fi

# Get new content from edit or write
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')
if [ -z "$NEW_STRING" ]; then exit 0; fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Extract package imports (skip relative imports starting with . or /)
NEW_IMPORTS=$(echo "$NEW_STRING" | grep -oE "from ['\"]([^./][^'\"]*)['\"]" | sed "s/from ['\"]//;s/['\"]$//" | sort -u)
if [ -z "$NEW_IMPORTS" ]; then exit 0; fi

# Determine which package.json to check
if [[ "$FILE_PATH" == *"adminpanel/"* ]]; then
  PKG_JSON="$PROJECT_DIR/adminpanel/frontend/package.json"
elif [[ "$FILE_PATH" == *"frontend/"* ]]; then
  PKG_JSON="$PROJECT_DIR/frontend/package.json"
else
  exit 0
fi

if [ ! -f "$PKG_JSON" ]; then exit 0; fi

WARNINGS=""
for IMPORT in $NEW_IMPORTS; do
  # Extract base package name (handle scoped packages @org/pkg)
  BASE_PKG=$(echo "$IMPORT" | sed 's|@\([^/]*\)/\([^/]*\).*|@\1/\2|; t; s|/.*||')

  # Skip known built-in/virtual modules
  case "$BASE_PKG" in
    react|react-dom|react/jsx-runtime|vite/*) continue ;;
  esac

  if ! grep -q "\"$BASE_PKG\"" "$PKG_JSON" 2>/dev/null; then
    WARNINGS="${WARNINGS}  - ${BASE_PKG}\n"
  fi
done

if [ -n "$WARNINGS" ]; then
  echo "WARNING: New dependencies not in package.json:" >&2
  echo -e "$WARNINGS" >&2
  echo "Consider: are these intentional? Check bundle size impact." >&2
fi

exit 0
