#!/bin/bash
# plan-completion-gate.sh — mark a superpowers plan as "awaiting doc update"
# Triggers on: PostToolUse(Skill)
# Profile: standard, strict
#
# Superpowers plan skills (executing-plans, writing-plans) finish by
# printing "plan complete" / "✅ done" / "Final report" in the Skill
# output. If the session touched code without updating
# `docs/architecture/*`, we drop a marker the next `git commit` must
# clear — either by staging architecture docs OR by adding
# `[plan-docs-deferred: <plan-id>: <reason>]` to the commit message.
#
# Marker: ${TMPDIR:-/tmp}/claude-plan-docs-pending-<session>
# Opt-out: CLAUDE_DISABLE_PLAN_GATE=1

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_PLAN_GATE:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ "$TOOL" = "Skill" ] || exit 0

SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
# Match executing-plans / writing-plans with optional namespace prefix
if ! printf '%s' "$SKILL" | grep -qE '(^|:)(executing|writing)-plans?$'; then
  exit 0
fi

# Pull the skill output / last assistant message for completion markers
OUTPUT=$(echo "$INPUT" | jq -r '.tool_response.output // .tool_response // .last_assistant_message // empty' 2>/dev/null)
if ! printf '%s' "$OUTPUT" | grep -qiE 'plan complete|✅ done|final report|plan finished|marking.*complete'; then
  exit 0
fi

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
MARKER="${TMPDIR:-/tmp}/claude-plan-docs-pending-${SESSION_KEY}"

touch "$MARKER"

# Echo an advisory so Claude sees it inline (hook stdout under PostToolUse
# is surfaced; the commit gate further down handles enforcement).
cat <<EOF

Plan completion detected (skill: $SKILL).
A doc-sync marker was placed at:
  $MARKER

Next commit touching code files must either stage docs/architecture/*
OR include [plan-docs-deferred: <plan-id>: <reason ≥15 chars>] in the
commit message.
EOF
exit 0
