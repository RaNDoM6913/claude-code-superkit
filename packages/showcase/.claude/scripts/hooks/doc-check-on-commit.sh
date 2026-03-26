#!/bin/bash
# doc-check-on-commit.sh — BLOCK commits when code changes lack doc updates
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict
#
# EXIT CODES:
#   0 = allow (docs present or no code changes)
#   2 = BLOCK (code changed, docs missing — forces update before commit)

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

# Classify staged files
HAS_CODE=false
HAS_DOCS=false
HAS_MIGRATION=false
HAS_DB_DOCS=false

while IFS= read -r file; do
  case "$file" in
    *_test.go|*test_*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
      ;; # tests — don't count as "code that needs docs"
    *.go|*.ts|*.tsx|*.py|*.rs|*.js|*.jsx)
      HAS_CODE=true
      ;;
    *.sql)
      HAS_CODE=true
      ;;
    */migrations/*.sql|*/migrate/*.sql|*/db/migrate/*)
      HAS_MIGRATION=true
      HAS_CODE=true
      ;;
    *.env*|*.json|*.yaml|*.yml|*.toml|*.cfg|*.ini)
      ;; # config — trivial
    *database-schema*|*database_schema*)
      HAS_DB_DOCS=true
      HAS_DOCS=true
      ;;
    docs/*|*.md|*openapi*|*swagger*)
      HAS_DOCS=true
      ;;
  esac
done <<< "$STAGED"

# Skip if only tests, configs, or docs
if [ "$HAS_CODE" = false ]; then
  exit 0
fi

# ── Specific checks ──────────────────────────────────────────────────

ISSUES=""

# Migration added but database schema docs not updated
if [ "$HAS_MIGRATION" = true ] && [ "$HAS_DB_DOCS" = false ]; then
  ISSUES="${ISSUES}\n  - SQL migration staged but database schema docs NOT updated"
fi

# Code changed but NO docs at all
if [ "$HAS_CODE" = true ] && [ "$HAS_DOCS" = false ]; then
  NON_TRIVIAL=$(echo "$STAGED" | grep -E '\.(go|ts|tsx|py|rs|js|jsx|sql)$' | grep -v '_test\.\|\.test\.\|\.spec\.\|\.claude/')
  if [ -n "$NON_TRIVIAL" ]; then
    ISSUES="${ISSUES}\n  - Code files changed but NO documentation updated:"
    ISSUES="${ISSUES}\n$(echo "$NON_TRIVIAL" | sed 's/^/      /')"
  fi
fi

# If issues found — BLOCK the commit
if [ -n "$ISSUES" ]; then
  echo ""
  echo "BLOCKED: Documentation not updated"
  echo ""
  echo -e "  Issues:${ISSUES}"
  echo ""
  echo "  Before committing, update relevant docs:"
  echo "    - Architecture docs (API reference, database schema, etc.)"
  echo "    - OpenAPI spec (if API changed)"
  echo "    - README / project docs (if setup changed)"
  echo ""
  echo "  If docs are genuinely NOT needed (pure refactor, test-only, config),"
  echo "  stage at least one .md file to pass this check."
  echo ""
  exit 2
fi

exit 0
