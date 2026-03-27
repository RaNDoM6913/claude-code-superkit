#!/bin/sh
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

# Build agent suggestions based on changed file extensions and paths
HINTS=""
if printf '%s' "$CHANGED" | grep -qE '\.go$'; then
  HINTS="$HINTS- Go files changed: consider code-reviewer agent. "
fi
if printf '%s' "$CHANGED" | grep -qE '\.sql$'; then
  HINTS="$HINTS- SQL files changed: consider migration-reviewer agent. "
fi
if printf '%s' "$CHANGED" | grep -qE '\.(ts|tsx)$'; then
  HINTS="$HINTS- TypeScript files changed: consider code-reviewer agent. "
fi
if printf '%s' "$CHANGED" | grep -qiE 'security|auth|payment'; then
  HINTS="$HINTS- Security-sensitive files changed: consider security-scanner agent. "
fi

# Build context as plain text (no escape sequences)
CTX="<git_context> "
CTX="${CTX}branch: ${BRANCH}. "

if [ -n "$DIFFSTAT" ]; then
  # Flatten diffstat to single line
  FLAT_DIFFSTAT=$(printf '%s' "$DIFFSTAT" | tr '\n' ', ' | sed 's/,$//')
  CTX="${CTX}diffstat: ${FLAT_DIFFSTAT}. "
fi

if [ -n "$CHANGED" ]; then
  FILE_COUNT=$(printf '%s\n' "$CHANGED" | wc -l | tr -d ' ')
  FLAT_CHANGED=$(printf '%s' "$CHANGED" | head -15 | tr '\n' ', ' | sed 's/,$//')
  CTX="${CTX}changed_files (${FILE_COUNT}): ${FLAT_CHANGED}. "
  if [ "$FILE_COUNT" -gt 15 ]; then
    CTX="${CTX}... and $((FILE_COUNT - 15)) more. "
  fi
fi

if [ -n "$COMMITS" ]; then
  FLAT_COMMITS=$(printf '%s' "$COMMITS" | tr '\n' '; ' | sed 's/;$//')
  CTX="${CTX}recent_commits: ${FLAT_COMMITS}. "
fi

if [ -n "$HINTS" ]; then
  CTX="${CTX}agent_hints: ${HINTS}"
fi

CTX="${CTX}</git_context>"

# Safely encode as JSON using node (available in Claude Code environments)
# Falls back to basic escaping if node is not available
if command -v node >/dev/null 2>&1; then
  JSON=$(node -e "process.stdout.write(JSON.stringify({hookSpecificOutput:{additionalContext:process.argv[1]}}))" "$CTX" 2>/dev/null)
  if [ -n "$JSON" ]; then
    printf '%s' "$JSON"
    exit 0
  fi
fi

# Fallback: escape for JSON manually (handles quotes, backslashes, tabs)
ESCAPED=$(printf '%s' "$CTX" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g')
printf '{"hookSpecificOutput":{"additionalContext":"%s"}}' "$ESCAPED"
