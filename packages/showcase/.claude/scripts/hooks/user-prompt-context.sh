#!/bin/bash
# UserPromptSubmit hook: inject git context + agent suggestions into every prompt
# Profile: skip on fast, run on standard/strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then exit 0; fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Only run in git repos
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then exit 0; fi

BRANCH=$(git branch --show-current 2>/dev/null)
DIFFSTAT=$(git diff --stat HEAD 2>/dev/null | tail -5)
CHANGED=$(git diff --name-only HEAD 2>/dev/null)
COMMITS=$(git log --oneline -3 2>/dev/null)

# Skip if no changes
if [ -z "$CHANGED" ] && [ -z "$DIFFSTAT" ]; then exit 0; fi

# Build agent suggestions based on changed files
HINTS=""
if echo "$CHANGED" | grep -q "routes\.go\|openapi\.yaml"; then
  HINTS="${HINTS}\n- routes/openapi changed → consider running api-contract-sync agent"
fi
if echo "$CHANGED" | grep -q "migrations/"; then
  HINTS="${HINTS}\n- migrations changed → consider running migration-reviewer agent"
fi
if echo "$CHANGED" | grep -qE "auth|payment|media|security"; then
  HINTS="${HINTS}\n- security-sensitive files changed → consider running security-scanner agent"
fi
if echo "$CHANGED" | grep -q "tgbots/"; then
  HINTS="${HINTS}\n- bot code changed → consider running bot-reviewer agent"
fi

# Build context block
CTX="<git_context>"
CTX="${CTX}\nbranch: ${BRANCH}"
if [ -n "$DIFFSTAT" ]; then
  CTX="${CTX}\ndiffstat:\n${DIFFSTAT}"
fi
if [ -n "$CHANGED" ]; then
  FILE_COUNT=$(echo "$CHANGED" | wc -l | tr -d ' ')
  CTX="${CTX}\nchanged_files (${FILE_COUNT}):\n$(echo "$CHANGED" | head -15)"
  if [ "$FILE_COUNT" -gt 15 ]; then
    CTX="${CTX}\n... and $((FILE_COUNT - 15)) more"
  fi
fi
if [ -n "$COMMITS" ]; then
  CTX="${CTX}\nrecent_commits:\n${COMMITS}"
fi
if [ -n "$HINTS" ]; then
  CTX="${CTX}\nagent_hints:${HINTS}"
fi
CTX="${CTX}\n</git_context>"

# Output as additionalContext via JSON
printf '{"hookSpecificOutput":{"additionalContext":"%s"}}' "$(echo -e "$CTX" | sed 's/"/\\"/g' | tr '\n' ' ')"
