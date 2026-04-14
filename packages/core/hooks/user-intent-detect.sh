#!/bin/bash
# user-intent-detect.sh — identify user-initiated quick-work intent
# Triggers on: UserPromptSubmit
# Profile: standard, strict
#
# When the user explicitly asks for a quick/small change, we mark the
# session. `dev-required-on-commit.sh` then allows `[quick]` WITHOUT
# the ≥15 char rationale — the user explicitly took responsibility.
# When Claude autonomously picks `[quick]` without a matching user
# signal, the override counts DOUBLE against the Task 12 budget
# (not implemented here — see Task 15 follow-up in the plan).
#
# Marker: ${TMPDIR:-/tmp}/claude-user-said-quick-<session>
# Opt-out: CLAUDE_DISABLE_INTENT_DETECT=1

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_INTENT_DETECT:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
[ "$EVENT" = "UserPromptSubmit" ] || exit 0

PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
[ -z "$PROMPT" ] && exit 0

# Match explicit user signals for quick / small work. Keep these narrow
# so a user typing "the quick brown fox" doesn't false-trigger.
if ! printf '%s' "$PROMPT" | grep -qiE '(^|[[:space:]])(quick fix|small tweak|tiny change|just fix|fast fix|hotfix|small fix|quick change|небольшой фикс|быстрый фикс)([[:space:]]|[.,!?:;]|$)'; then
  exit 0
fi

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
MARKER="${TMPDIR:-/tmp}/claude-user-said-quick-${SESSION_KEY}"
touch "$MARKER"
exit 0
