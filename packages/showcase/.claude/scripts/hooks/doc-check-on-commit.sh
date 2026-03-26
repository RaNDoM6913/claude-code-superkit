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
NEED_BOT_DOCS=false
NEED_MODERATION_DOCS=false
NEED_AUTH_DOCS=false
NEED_TREE_DOCS=false
NEED_CLAUDE_MD=false
NEED_PHOTO_DOCS=false
NEED_FEED_DOCS=false
NEED_ENTITLEMENTS_DOCS=false
NEED_NOTIFICATION_DOCS=false
NEED_BACKEND_LAYERS=false

# Track which docs ARE staged
HAS_DB_SCHEMA=false
HAS_API_REF=false
HAS_OPENAPI=false
HAS_FRONTEND_STATE=false
HAS_FRONTEND_ONBOARDING=false
HAS_BOT_MOD=false
HAS_BOT_SUPPORT=false
HAS_MODERATION=false
HAS_AUTH=false
HAS_TREE_DOCS=false
HAS_CLAUDE_MD=false
HAS_PHOTO_DOCS=false
HAS_FEED_DOCS=false
HAS_ENTITLEMENTS_DOCS=false
HAS_NOTIFICATION_DOCS=false
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
    .claude/agents/*|.claude/rules/*|.claude/commands/*|.claude/hooks/*|.claude/skills/*)
      ADVISORIES="${ADVISORIES}\n  [advisory] .claude/ config changed — consider syncing with claude-code-superkit if applicable"
      continue ;;
    docs/architecture/database-schema.md) HAS_DB_SCHEMA=true; continue ;;
    docs/architecture/backend-api-reference.md) HAS_API_REF=true; continue ;;
    docs/architecture/frontend-state-contracts.md) HAS_FRONTEND_STATE=true; continue ;;
    docs/architecture/frontend-onboarding-flow.md) HAS_FRONTEND_ONBOARDING=true; continue ;;
    docs/architecture/bot-moderator.md) HAS_BOT_MOD=true; continue ;;
    docs/architecture/bot-support.md) HAS_BOT_SUPPORT=true; continue ;;
    docs/architecture/moderation-pipeline.md) HAS_MODERATION=true; continue ;;
    docs/architecture/auth-and-sessions.md) HAS_AUTH=true; continue ;;
    docs/architecture/photo-pipeline.md) HAS_PHOTO_DOCS=true; continue ;;
    docs/architecture/feed-and-antiabuse.md) HAS_FEED_DOCS=true; continue ;;
    docs/architecture/entitlements-and-store.md) HAS_ENTITLEMENTS_DOCS=true; continue ;;
    docs/architecture/notification-system.md) HAS_NOTIFICATION_DOCS=true; continue ;;
    docs/architecture/backend-layers.md) HAS_BACKEND_LAYERS=true; continue ;;
    docs/trees/*) HAS_TREE_DOCS=true; continue ;;
    CLAUDE.md) HAS_CLAUDE_MD=true; continue ;;
    docs/*|*.md|*openapi*|*swagger*) continue ;;
  esac

  # ── Code files — determine which docs are required ──
  case "$file" in
    # Migrations → database-schema.md + CLAUDE.md
    backend/migrations/*.sql|migrations/*.sql)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_DB_SCHEMA=true
      NEED_CLAUDE_MD=true
      ;;

    # HTTP handlers → API reference or OpenAPI
    backend/internal/transport/http/handlers/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_API_REF=true
      ;;

    # Services with specific doc mappings
    backend/internal/services/moderation/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_MODERATION_DOCS=true
      ;;
    backend/internal/services/auth/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_AUTH_DOCS=true
      ;;
    backend/internal/services/media/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_PHOTO_DOCS=true
      ;;
    backend/internal/services/feed/*.go|backend/internal/services/antiabuse/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_FEED_DOCS=true
      ;;
    backend/internal/services/entitlements/*.go|backend/internal/services/store/*.go|backend/internal/services/payments/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_ENTITLEMENTS_DOCS=true
      ;;
    backend/internal/services/notifications/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_NOTIFICATION_DOCS=true
      ;;

    # Backend app wiring / middleware / routes → backend-layers.md
    backend/internal/app/*.go|backend/internal/app/**/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_BACKEND_LAYERS=true
      ;;

    # Other backend Go files
    backend/*.go|backend/**/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      ;;

    # Telegram bots
    tgbots/bot_moderator/*.go|tgbots/bot_moderator/**/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_BOT_DOCS=true
      ;;
    tgbots/bot_support/*.go|tgbots/bot_support/**/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_BOT_DOCS=true
      ;;
    tgbots/*.go|tgbots/**/*.go)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_BOT_DOCS=true
      ;;

    # Frontend: onboarding screens
    frontend/src/pages/onboarding/*.ts|frontend/src/pages/onboarding/*.tsx|\
    frontend/src/app/flow/*.ts|frontend/src/app/flow/*.tsx|\
    frontend/src/app/App.tsx)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_FRONTEND_DOCS=true
      ;;

    # Frontend: main app screens and components
    frontend/src/*.ts|frontend/src/*.tsx|\
    frontend/src/**/*.ts|frontend/src/**/*.tsx)
      HAS_CODE=true; ONLY_EXEMPT=false
      NEED_FRONTEND_DOCS=true
      ;;

    # Any other code file
    *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs)
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
  MISSING="${MISSING}\n  - Migration staged but docs/architecture/database-schema.md NOT updated"
fi

if [ "$NEED_CLAUDE_MD" = true ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Migration staged but CLAUDE.md NOT updated (migration counter)"
fi

if [ "$NEED_API_REF" = true ] && [ "$HAS_API_REF" = false ] && [ "$HAS_OPENAPI" = false ]; then
  MISSING="${MISSING}\n  - Handler changed but neither docs/architecture/backend-api-reference.md NOR backend/docs/openapi.yaml updated"
fi

if [ "$NEED_FRONTEND_DOCS" = true ] && [ "$HAS_FRONTEND_STATE" = false ] && [ "$HAS_FRONTEND_ONBOARDING" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Frontend code changed but none of: frontend-state-contracts.md, frontend-onboarding-flow.md, CLAUDE.md updated"
fi

if [ "$NEED_BOT_DOCS" = true ] && [ "$HAS_BOT_MOD" = false ] && [ "$HAS_BOT_SUPPORT" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Bot code changed but none of: bot-moderator.md, bot-support.md, CLAUDE.md updated"
fi

if [ "$NEED_MODERATION_DOCS" = true ] && [ "$HAS_MODERATION" = false ]; then
  MISSING="${MISSING}\n  - Moderation service changed but docs/architecture/moderation-pipeline.md NOT updated"
fi

if [ "$NEED_AUTH_DOCS" = true ] && [ "$HAS_AUTH" = false ]; then
  MISSING="${MISSING}\n  - Auth service changed but docs/architecture/auth-and-sessions.md NOT updated"
fi

if [ "$NEED_PHOTO_DOCS" = true ] && [ "$HAS_PHOTO_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Media service changed but docs/architecture/photo-pipeline.md NOT updated"
fi

if [ "$NEED_FEED_DOCS" = true ] && [ "$HAS_FEED_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Feed/antiabuse service changed but docs/architecture/feed-and-antiabuse.md NOT updated"
fi

if [ "$NEED_ENTITLEMENTS_DOCS" = true ] && [ "$HAS_ENTITLEMENTS_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Entitlements/store/payments service changed but docs/architecture/entitlements-and-store.md NOT updated"
fi

if [ "$NEED_NOTIFICATION_DOCS" = true ] && [ "$HAS_NOTIFICATION_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Notifications service changed but docs/architecture/notification-system.md NOT updated"
fi

if [ "$NEED_BACKEND_LAYERS" = true ] && [ "$HAS_BACKEND_LAYERS" = false ]; then
  MISSING="${MISSING}\n  - App wiring/routes/middleware changed but docs/architecture/backend-layers.md NOT updated"
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
