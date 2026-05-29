#!/bin/bash
# gateguard-record-facts.sh — record successful Grep/Read calls for GateGuard
# Triggers on: PostToolUse(Grep|Read|Glob)
# Profile: standard, strict
#
# Companion to gateguard-pre-edit.sh — every time Claude actually looks at
# the code (Grep/Read/Glob), reset the GateGuard counter so the next edit
# is allowed.
#
# Opt-out: CLAUDE_DISABLE_GATEGUARD=1

SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

[ "${CLAUDE_DISABLE_GATEGUARD:-}" = "1" ] && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
[ "$PROFILE" = "fast" ] && exit 0

INPUT=$(cat 2>/dev/null || echo '{}')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

case "$TOOL_NAME" in
  Grep|Read|Glob) ;;
  *) exit 0 ;;
esac

STATE_FILE="${CLAUDE_GATEGUARD_STATE:-${TMPDIR:-/tmp}/superkit-gateguard-state-$(superkit_session_key)}"
now=$(date +%s)

# Reset counter on facts-gathering tool use — atomic write via temp + mv.
TMP_STATE="${STATE_FILE}.$$.$now"
echo "$now 0" > "$TMP_STATE" 2>/dev/null && mv -f "$TMP_STATE" "$STATE_FILE" 2>/dev/null
exit 0
