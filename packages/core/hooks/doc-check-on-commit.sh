#!/bin/bash
# doc-check-on-commit.sh — warn if code changes lack doc updates
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read the tool input (JSON with command field)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null)

# Only trigger on git commit commands
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
  if echo "$COMMAND" | grep -qE '\-a|\-\-all'; then
    STAGED=$(git diff --name-only 2>/dev/null)
  fi
fi

if [ -z "$STAGED" ]; then
  exit 0
fi

# Check if code files are staged (not just docs/config)
HAS_CODE=false
HAS_DOCS=false

while IFS= read -r file; do
  case "$file" in
    *.go|*.ts|*.tsx|*.py|*.rs|*.js|*.jsx)
      HAS_CODE=true
      ;;
    *.sql)
      HAS_CODE=true
      ;;
    docs/*|*.md|*openapi*|*swagger*)
      HAS_DOCS=true
      ;;
  esac
done <<< "$STAGED"

# If code changed but no docs — warn
if [ "$HAS_CODE" = true ] && [ "$HAS_DOCS" = false ]; then
  TRIVIAL=true
  while IFS= read -r file; do
    case "$file" in
      *_test.go|*test_*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
        ;;
      *.env*|*.json|*.yaml|*.yml|*.toml|*.cfg|*.ini)
        ;;
      *.go|*.ts|*.tsx|*.py|*.rs|*.js|*.jsx|*.sql)
        TRIVIAL=false
        ;;
    esac
  done <<< "$STAGED"

  if [ "$TRIVIAL" = false ]; then
    echo ""
    echo "WARNING: Code files changed but no docs updated."
    echo ""
    echo "   Staged code files:"
    echo "$STAGED" | grep -E '\.(go|ts|tsx|py|rs|js|jsx|sql)$' | grep -v '_test\.\|\.test\.\|\.spec\.' | sed 's/^/     /'
    echo ""
    echo "   Check documentation rule — does this change affect:"
    echo "     - API endpoints? → update docs/architecture/ + openapi"
    echo "     - DB schema? → update database-schema docs"
    echo "     - Frontend behavior? → update frontend docs"
    echo "     - File structure? → update docs/trees/"
    echo ""
    echo "   If docs are NOT needed (pure refactor, minor fix), ignore this warning."
    echo ""
  fi
fi

exit 0
