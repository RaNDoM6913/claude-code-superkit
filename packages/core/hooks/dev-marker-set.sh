#!/bin/bash
# dev-marker-set.sh — sets a marker file when /dev is invoked
# Triggers on: UserPromptSubmit AND PreToolUse(Skill)
# Profile: standard, strict
#
# Purpose: lets `dev-required-on-commit.sh` know that /dev was run in
# the current session. Two paths:
#   (1) user types `/dev …` — detected via UserPromptSubmit payload.prompt
#   (2) Claude invokes Skill({skill: "dev"}) — detected via
#       PreToolUse payload.tool_input.skill
#
# Marker: /tmp/claude-dev-marker-${SESSION_KEY}
# The marker is cleared by `dev-required-on-commit.sh` on successful commit
# so the 3-edit budget restarts for the next work-cycle.

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
# Use Claude Code session_id for stable cross-hook state.
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
MARKER="${TMPDIR:-/tmp}/claude-dev-marker-${SESSION_KEY}"

case "$EVENT" in
  UserPromptSubmit)
    PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
    # Match /dev at start of prompt (or after whitespace), followed by
    # word boundary — avoid matching /develop, /device, /devops, etc.
    if echo "$PROMPT" | grep -qE '(^|[[:space:]])/dev([[:space:]]|$)'; then
      touch "$MARKER"
    fi
    ;;
  PreToolUse)
    TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
    if [ "$TOOL" = "Skill" ]; then
      SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
      # Match exact "dev" or namespaced variant like "superpowers:dev"
      if [ "$SKILL" = "dev" ] || echo "$SKILL" | grep -qE ':dev$'; then
        touch "$MARKER"
      fi
    fi
    ;;
esac

exit 0
