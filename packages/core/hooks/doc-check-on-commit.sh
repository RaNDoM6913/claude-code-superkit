#!/bin/bash
# doc-check-on-commit.sh — BLOCK commits when code changes lack doc updates
# NOTE: bash case doesn't support ** globs — use in_dir() helper for any-depth matching

# Helper: check if file is under a directory at ANY depth (no level limit)
# Usage: in_dir "$file" "dirname"
in_dir() { echo "$1" | grep -q "/$2/"; }
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

# Read the tool input — Claude Code PreToolUse payload is:
#   { "hook_event_name": "PreToolUse", "tool_name": "Bash",
#     "tool_input": { "command": "…", "description": "…" } }
# Historical bug: older versions read `.command` which is always null on
# Bash PreToolUse, so the hook silently exited 0 and NEVER blocked any
# commit. Accept both shapes for defence-in-depth.
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)

# Only trigger on git commit commands.
# Also match `git -C <path> commit` — without this, the hook would run
# `git diff --cached` in the wrong directory and see an empty STAGED,
# silently exiting 0 while the real commit lands elsewhere.
if ! echo "$COMMAND" | grep -qE 'git(\s+-[cC]\s+\S+)*\s+commit'; then
  exit 0
fi

# Extract `-C <path>` target if present so we check staged files in the
# actual target repo, not the shell cwd.
GIT_TARGET_DIR=$(echo "$COMMAND" | sed -nE 's/.*git[[:space:]]+(-[cC][[:space:]]+([^[:space:]]+)).*/\2/p' | head -n1)
if [ -n "$GIT_TARGET_DIR" ] && [ -d "$GIT_TARGET_DIR" ]; then
  GIT_CMD_PREFIX="git -C $GIT_TARGET_DIR"
else
  GIT_CMD_PREFIX="git"
fi

# Get staged files (from the correct repo)
STAGED=$($GIT_CMD_PREFIX diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
  # Match `-a` / `--all` only as standalone flags — not as part of longer
  # option names like `--allow-empty` or `--author`.
  if echo "$COMMAND" | grep -qE '(^|[[:space:]])(-a|--all)([[:space:]]|$)'; then
    STAGED=$($GIT_CMD_PREFIX diff --name-only 2>/dev/null)
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
NEED_README=false

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
HAS_README=false

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
  # ── Non-architectural markdown — CANNOT satisfy architecture-doc requirements ──
  # These files are meta-work (plans, memory, changelogs) and must NEVER be
  # counted as evidence that architecture docs were updated. We continue early
  # WITHOUT setting any HAS_* flag. Must be checked BEFORE the generic
  # `docs/*|*.md` fallthrough below or the HAS_* pattern-name matches.
  case "$file" in
    docs/superpowers/plans/*|*/docs/superpowers/plans/*)
      continue ;;
    docs/superpowers/specs/*|*/docs/superpowers/specs/*)
      continue ;;
    docs/superpowers/research/*|*/docs/superpowers/research/*)
      continue ;;
    memory/*|*/memory/*)
      continue ;;
    CHANGELOG*|*/CHANGELOG*|*/HISTORY.md|HISTORY.md)
      continue ;;
    docs/active-plans-archive.md|*/docs/active-plans-archive.md)
      continue ;;
  esac

  # ── Exempt file types (don't require docs) ──
  case "$file" in
    *_test.go|*test_*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
      continue ;;
    # Dependency files — check if NEW deps were added (not just version bumps)
    go.mod|*/go.mod)
      if git diff --cached -- "$file" 2>/dev/null | grep -qE '^\+\t[a-z].*v[0-9]' ; then
        NEED_README=true
        NEED_CLAUDE_MD=true
      fi
      continue ;;
    package.json|*/package.json)
      if git diff --cached -- "$file" 2>/dev/null | grep -qE '^\+.*"(dependencies|devDependencies)"' || \
         git diff --cached -- "$file" 2>/dev/null | grep -qE '^\+\s+"[a-z@].*":' ; then
        NEED_README=true
      fi
      continue ;;
    # Config examples — README should document config changes
    *config.example*|*config.sample*|*.env.example)
      NEED_README=true
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
    # Detect staged doc files (generic glob patterns)
    *database-schema*|*database_schema*) HAS_DB_SCHEMA=true; continue ;;
    *api-reference*|*api_reference*|*backend-api*) HAS_API_REF=true; continue ;;
    *frontend-state*|*frontend_state*) HAS_FRONTEND_STATE=true; continue ;;
    *frontend-onboarding*|*frontend_onboarding*) HAS_FRONTEND_ONBOARDING=true; continue ;;
    *bot-moderator*|*bot_moderator*) HAS_BOT_MOD=true; continue ;;
    *bot-support*|*bot_support*) HAS_BOT_SUPPORT=true; continue ;;
    *moderation-pipeline*|*moderation_pipeline*) HAS_MODERATION=true; continue ;;
    *auth-and-sessions*|*auth_and_sessions*|*auth-sessions*) HAS_AUTH=true; continue ;;
    *photo-pipeline*|*photo_pipeline*) HAS_PHOTO_DOCS=true; continue ;;
    *feed-and-antiabuse*|*feed_antiabuse*|*feed-antiabuse*) HAS_FEED_DOCS=true; continue ;;
    *entitlements-and-store*|*entitlements_store*|*entitlements-store*) HAS_ENTITLEMENTS_DOCS=true; continue ;;
    *notification-system*|*notification_system*) HAS_NOTIFICATION_DOCS=true; continue ;;
    *backend-layers*|*backend_layers*|*backend-arch*) HAS_BACKEND_LAYERS=true; continue ;;
    docs/trees/*) HAS_TREE_DOCS=true; continue ;;
    CLAUDE.md) HAS_CLAUDE_MD=true; continue ;;
    README*|*/README*) HAS_README=true; continue ;;
    docs/*|*.md|*openapi*|*swagger*) continue ;;
  esac

  # ── Code files — determine which docs are required ──
  # Step 1: classify by extension (is it code at all?)
  IS_CODE=false
  case "$file" in
    *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.sql) IS_CODE=true ;;
  esac

  if [ "$IS_CODE" = false ]; then
    continue
  fi

  HAS_CODE=true
  ONLY_EXEMPT=false

  # Step 2: determine doc requirements using grep-based in_dir() for any-depth matching
  case "$file" in
    # Migrations → database-schema docs + CLAUDE.md
    */migrations/*.sql|*/migrate/*.sql|*/db/migrate/*)
      NEED_DB_SCHEMA=true
      NEED_CLAUDE_MD=true
      ;;
    *.sql) ;; # other SQL — no specific doc requirement
  esac

  case "$file" in
    # HTTP handlers → API reference
    */handlers/*.go|*/routes*.go|*/router*.go)
      NEED_API_REF=true
      ;;
  esac

  # Service-to-doc mappings (grep handles any nesting depth)
  case "$file" in *.go)
    if in_dir "$file" "services/moderation" || in_dir "$file" "service/moderation"; then
      NEED_MODERATION_DOCS=true
    elif in_dir "$file" "services/auth" || in_dir "$file" "service/auth"; then
      NEED_AUTH_DOCS=true
    elif in_dir "$file" "services/media" || in_dir "$file" "service/media"; then
      NEED_PHOTO_DOCS=true
    elif in_dir "$file" "services/feed" || in_dir "$file" "services/antiabuse" || in_dir "$file" "service/feed"; then
      NEED_FEED_DOCS=true
    elif in_dir "$file" "services/entitlements" || in_dir "$file" "services/store" || in_dir "$file" "services/payments"; then
      NEED_ENTITLEMENTS_DOCS=true
    elif in_dir "$file" "services/notifications" || in_dir "$file" "services/notification"; then
      NEED_NOTIFICATION_DOCS=true
    fi

    # App wiring / middleware / background jobs / entry points → backend-layers docs.
    # Tree docs only required if the file is NEW (added) — modifying existing
    # middleware.go does not change the tree, so don't demand a tree update.
    if in_dir "$file" "app" || echo "$file" | grep -q '/middleware' || \
       in_dir "$file" "jobs" || in_dir "$file" "workers" || \
       in_dir "$file" "cmd"; then
      NEED_BACKEND_LAYERS=true
      if echo "$NEW_FILES" | grep -qxF "$file"; then
        NEED_TREE_DOCS=true
      fi
    fi

    # New storage backend under */repo/** → tree docs (only for NEW files)
    if in_dir "$file" "repo"; then
      if echo "$NEW_FILES" | grep -qxF "$file"; then
        NEED_TREE_DOCS=true
      fi
    fi

    # Telegram bots → bot docs
    if in_dir "$file" "bot_moderator" || in_dir "$file" "bot_support" || \
       in_dir "$file" "tgbots" || in_dir "$file" "bots"; then
      NEED_BOT_DOCS=true
    fi
    ;;
  esac

  # Frontend → frontend docs (any .ts/.tsx under src/ or onboarding paths)
  case "$file" in *.ts|*.tsx)
    if in_dir "$file" "src" || in_dir "$file" "pages/onboarding" || \
       in_dir "$file" "app/flow" || echo "$file" | grep -q '/app/App\.tsx$'; then
      NEED_FRONTEND_DOCS=true
    fi
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

if [ "$NEED_CLAUDE_MD" = true ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Migration staged but CLAUDE.md NOT updated (migration counter)"
fi

if [ "$NEED_API_REF" = true ] && [ "$HAS_API_REF" = false ] && [ "$HAS_OPENAPI" = false ]; then
  MISSING="${MISSING}\n  - Handler/route changed but neither API reference docs NOR OpenAPI spec updated"
fi

if [ "$NEED_FRONTEND_DOCS" = true ] && [ "$HAS_FRONTEND_STATE" = false ] && [ "$HAS_FRONTEND_ONBOARDING" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Frontend code changed but none of: frontend-state docs, frontend-onboarding docs, CLAUDE.md updated"
fi

if [ "$NEED_BOT_DOCS" = true ] && [ "$HAS_BOT_MOD" = false ] && [ "$HAS_BOT_SUPPORT" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Bot code changed but none of: bot-moderator docs, bot-support docs, CLAUDE.md updated"
fi

if [ "$NEED_MODERATION_DOCS" = true ] && [ "$HAS_MODERATION" = false ]; then
  MISSING="${MISSING}\n  - Moderation service changed but moderation-pipeline docs NOT updated"
fi

if [ "$NEED_AUTH_DOCS" = true ] && [ "$HAS_AUTH" = false ]; then
  MISSING="${MISSING}\n  - Auth service changed but auth-and-sessions docs NOT updated"
fi

if [ "$NEED_PHOTO_DOCS" = true ] && [ "$HAS_PHOTO_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Media service changed but photo-pipeline docs NOT updated"
fi

if [ "$NEED_FEED_DOCS" = true ] && [ "$HAS_FEED_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Feed/antiabuse service changed but feed-and-antiabuse docs NOT updated"
fi

if [ "$NEED_ENTITLEMENTS_DOCS" = true ] && [ "$HAS_ENTITLEMENTS_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Entitlements/store/payments service changed but entitlements-and-store docs NOT updated"
fi

if [ "$NEED_NOTIFICATION_DOCS" = true ] && [ "$HAS_NOTIFICATION_DOCS" = false ]; then
  MISSING="${MISSING}\n  - Notifications service changed but notification-system docs NOT updated"
fi

if [ "$NEED_BACKEND_LAYERS" = true ] && [ "$HAS_BACKEND_LAYERS" = false ]; then
  MISSING="${MISSING}\n  - App wiring/routes/middleware changed but backend-layers docs NOT updated"
fi

if [ "$NEED_TREE_DOCS" = true ] && [ "$HAS_TREE_DOCS" = false ]; then
  MISSING="${MISSING}\n  - New files added but docs/trees/ NOT updated"
fi

if [ "$NEED_README" = true ] && [ "$HAS_README" = false ] && [ "$HAS_CLAUDE_MD" = false ]; then
  MISSING="${MISSING}\n  - Dependencies or config changed but no README or CLAUDE.md updated (tech stack / project structure)"
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
