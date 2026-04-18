#!/bin/bash
# context-monitor.sh — monitors context window usage, warns at 75% and 90%
# Triggers on: PostToolUse (every tool call)
# Profile: all (context awareness is always useful)

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

TOKENS_USED="${CLAUDE_CONTEXT_TOKENS_USED:-0}"
TOKENS_MAX="${CLAUDE_CONTEXT_TOKENS_MAX:-1000000}"

if [ "$TOKENS_USED" -eq 0 ]; then
  exit 0
fi

PERCENT=$(( TOKENS_USED * 100 / TOKENS_MAX ))

if [ "$PERCENT" -ge 90 ]; then
  echo ""
  echo "CONTEXT 90% — recommend /compact or new session"
  echo "  Used: ~${TOKENS_USED} / ${TOKENS_MAX} tokens"
  echo "  Response quality may degrade. Save important context."
  echo ""
elif [ "$PERCENT" -ge 75 ]; then
  echo ""
  echo "CONTEXT 75% — context window filling up"
  echo "  Used: ~${TOKENS_USED} / ${TOKENS_MAX} tokens"
  echo "  Plan to wrap up current task or /compact."
  echo ""
fi

exit 0
