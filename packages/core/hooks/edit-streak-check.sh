#!/bin/bash
# edit-streak-check.sh — detect 5+ edits without a verification run
# Triggers on: PostToolUse(Edit|Write|MultiEdit|Bash)
# Profile: standard, strict
#
# Pattern caught: Claude edits 5+ files in a row without running tests,
# linters, or any Bash command between edits — a classic "progress stall"
# signal where changes accumulate without verification.
#
# Advisory only (exit 0 with stderr warning). Reset on any Bash call.
# Opt-out: CLAUDE_DISABLE_EDIT_STREAK=1

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

[ "${CLAUDE_DISABLE_EDIT_STREAK:-}" = "1" ] && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ -z "$TOOL_NAME" ] && exit 0

STREAK_FILE="${CLAUDE_EDIT_STREAK_FILE:-${TMPDIR:-/tmp}/claude-edit-streak-$(superkit_session_key)}"

case "$TOOL_NAME" in
  Bash)
    # Any Bash call resets the streak — it counts as verification
    rm -f "$STREAK_FILE"
    exit 0
    ;;
  Edit|Write|MultiEdit)
    count=$(cat "$STREAK_FILE" 2>/dev/null || echo 0)
    count=$((count + 1))
    echo "$count" > "$STREAK_FILE"

    if [ "$count" -ge 5 ]; then
      echo "" >&2
      echo "⚠️  WARNING: edit streak — $count consecutive edits without a verification run." >&2
      echo "   Consider running: tests, lint, build, or any Bash command." >&2
      echo "   Set CLAUDE_DISABLE_EDIT_STREAK=1 to silence." >&2
      echo "" >&2
    fi
    ;;
esac

exit 0
