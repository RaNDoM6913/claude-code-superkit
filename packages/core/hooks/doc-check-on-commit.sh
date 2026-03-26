#!/bin/bash
# doc-check-on-commit.sh — BLOCK commits when code changes lack doc updates
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict
#
# Smart file-to-doc mapping: analyzes staged files and determines exactly
# which documentation files must also be staged.
#
# EXIT CODES:
#   0 = allow (docs present or no code changes requiring docs)
#   2 = BLOCK (code changed, required docs missing)

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

# ── Classify staged files ─────────────────────────────────────────────

HAS_CODE=false
ONLY_EXEMPT=true  # tests, configs, .claude/ files, docs

# Track which doc categories are REQUIRED based on code changes
NEED_DB_SCHEMA=false
NEED_API_REF=false
NEED_FRONTEND_DOCS=false
NEED_TREE_DOCS=false
NEED_BACKEND_LAYERS=false

# Track which docs ARE staged
HAS_DB_SCHEMA=false
HAS_API_REF=false
HAS_OPENAPI=false
HAS_FRONTEND_DOCS=false
HAS_TREE_DOCS=false
HAS_CLAUDE_MD=false
HAS_BACKEND_LAYERS=false

# Advisory warnings (non-blocking)
ADVISORIES=""

# Check for newly added files
NEW_FILES=$(git diff --cached --diff-filter=A --name-only 2>/dev/null)
if [ -n "$NEW_FILES" ]; then
  # New files that aren't tests/configs/docs require tree updates
  NON_TRIVIAL_NEW=$(echo "$NEW_FILES" | grep -E '\.(go|ts|tsx|sql|py|rs|js|jsx)$' | grep -v '_test\.\|\.test\.\|\.spec\.' || true)
  if [ -n "$NON_TRIVIAL_NEW" ]; then
    NEED_TREE_DOCS=true
  fi
fi

while IFS= read -r file; do
  # ── Exempt file types (don't require docs) ──
  case "$file" in
    *_test.go|*test_*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
      continue ;;
    *.env*|*.json|*.yaml|*.yml|*.toml|*.cfg|*.ini)
      # Exception: openapi.yaml counts as a doc
      case "$file" in
        *openapi*|*swagger*) HAS_OPENAPI=true ;;
      esac
      continue ;;
    .claude/agents/*|.claude/rules/*|.claude/commands/*|.claude/hooks/*|.claude/skills/*|.claude/scripts/*)
      ADVISORIES="${ADVISORIES}\n  [advisory] .claude/ config changed — consider syncing across repos if applicable"
      continue ;;
    *database-schema*|*database_schema*) HAS_DB_SCHEMA=true; continue ;;
    *api-reference*|*api_reference*|*backend-api*) HAS_API_REF=true; continue ;;
    *frontend-state*|*frontend-onboarding*|*frontend-arch*) HAS_FRONTEND_DOCS=true; continue ;;
    *backend-layers*|*backend-arch*) HAS_BACKEND_LAYERS=true; continue ;;
    docs/trees/*) HAS_TREE_DOCS=true; continue ;;
    CLAUDE.md) HAS_CLAUDE_MD=true; continue ;;
    docs/*|*.md|*openapi*|*swagger*) continue ;;
  esac

  # ── Code files — determine which docs are required ──
  case "$file" in
    # Migrations → database-schema docs + CLAUDE.md
    */migrations/*.sql|*/migrate/*.sql|*/db/migrate/*)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_DB_SCHEMA=true
      ;;

    # HTTP handlers / routes → API reference or OpenAPI
    */handlers/*.go|*/routes*.go|*/router*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_API_REF=true
      ;;

    # App wiring / middleware → backend-layers docs
    */app/*.go|*/middleware*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_BACKEND_LAYERS=true
      ;;

    # Frontend source files
    */src/*.ts|*/src/*.tsx|*/src/**/*.ts|*/src/**/*.tsx)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_FRONTEND_DOCS=true
      ;;

    # Any other code file
    *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs)
      HAS_CODE=true; ONLY_EXEMPT=false
      ;;

    # SQL files outside migrations
    *.sql)
      HAS_CODE=true; ONLY_EXEMPT=false
      ;;
  esac
done <<< "$STAGED"

# ── Skip if only exempt files (tests, configs, docs, .claude/) ─────
if [ "$ONLY_EXEMPT" = true ] || [ "$HAS_CODE" = false ]; then
  # Still print advisories if any
  if [ -n "$ADVISORIES" ]; then
    echo -e "$ADVISORIES"
  fi
  exit 0
fi

# ── Check each required doc category ──────────────────────────────────

MISSING=""

if [ "$NEED_DB_SCHEMA" = true ] && [ "$HAS_DB_SCHEMA" = false ]; then
  MISSING="${MISSING}\n  - Migration staged but database schema docs NOT updated"
fi

if [ "$NEED_API_REF" = true ] && [ "$HAS_API_REF" = false ] && [ "$HAS_OPENAPI" = false ]; then
  MISSING="${MISSING}\n  - Handler/route changed but neither API reference docs NOR OpenAPI spec updated"
fi

if [ "$NEED_FRONTEND_DOCS" = true ] && [ "$HAS_FRONTEND_DOCS" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Frontend code changed but no frontend architecture docs updated"
fi

if [ "$NEED_BACKEND_LAYERS" = true ] && [ "$HAS_BACKEND_LAYERS" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - App wiring/routes/middleware changed but backend architecture docs NOT updated"
fi

if [ "$NEED_TREE_DOCS" = true ] && [ "$HAS_TREE_DOCS" = false ]; then
  MISSING="${MISSING}\n  - New files added but docs/trees/ NOT updated"
fi

# ── Output result ─────────────────────────────────────────────────────

if [ -n "$MISSING" ]; then
  echo ""
  echo "BLOCKED: Required documentation not staged"
  echo ""
  echo -e "  Missing docs:${MISSING}"
  echo ""
  echo "  Fix: update the listed doc files and stage them before committing."
  echo "  If the change is a pure refactor with NO behavior change, stage"
  echo "  CLAUDE.md or a relevant .md file to acknowledge the check."
  echo ""
  if [ -n "$ADVISORIES" ]; then
    echo -e "$ADVISORIES"
    echo ""
  fi
  exit 2
fi

# Print advisories even on success
if [ -n "$ADVISORIES" ]; then
  echo -e "$ADVISORIES"
fi

exit 0
