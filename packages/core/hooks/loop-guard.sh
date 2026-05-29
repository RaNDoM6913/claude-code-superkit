#!/bin/bash
# loop-guard.sh — detect and block repeated identical tool calls (anti-loop protection)
# Triggers on: PreToolUse(Bash)
# Profile: standard, strict

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read tool input and create a fingerprint.
# Payload shape: .tool_input.{command,file_path}. See doc-check-on-commit.sh
# for the historical-bug context — same JSON schema change applied here.
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input.file_path // .command // .input.command // empty' 2>/dev/null)

if [ -z "$TOOL_NAME" ] || [ -z "$COMMAND" ]; then
  exit 0
fi

# Create a hash of the tool call for comparison
FINGERPRINT=$(echo "${TOOL_NAME}:${COMMAND}" | shasum -a 256 | cut -d' ' -f1)

# Log file for tracking recent calls (per-session)
SESSION_KEY=$(command -v superkit_session_key >/dev/null 2>&1 && superkit_session_key || printf '%s' "${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}")
LOG_FILE="${TMPDIR:-/tmp}/claude-loop-guard-${SESSION_KEY}.log"

# Append current fingerprint
echo "$FINGERPRINT" >> "$LOG_FILE"

# Keep only last 6 entries
tail -6 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Read recent fingerprints
RECENT=$(tail -4 "$LOG_FILE" 2>/dev/null)
COUNT=$(echo "$RECENT" | grep -c "^${FINGERPRINT}$" 2>/dev/null)

# Block if 3+ identical consecutive calls
if [ "$COUNT" -ge 3 ]; then
  echo "" >&2
  echo "BLOCKED: Loop detected — same tool call repeated 3+ times" >&2
  echo "  Tool: $TOOL_NAME" >&2
  echo "  Command: $(echo "$COMMAND" | head -c 100)" >&2
  echo "" >&2
  echo "  Try a different approach or ask the user for guidance." >&2
  echo "" >&2
  exit 2
fi

# Detect A→B→A→B pattern (sliding window)
if [ "$(wc -l < "$LOG_FILE" 2>/dev/null)" -ge 4 ]; then
  LINE1=$(sed -n '1p' "$LOG_FILE")
  LINE2=$(sed -n '2p' "$LOG_FILE")
  LINE3=$(sed -n '3p' "$LOG_FILE")
  LINE4=$(sed -n '4p' "$LOG_FILE")

  if [ "$LINE1" = "$LINE3" ] && [ "$LINE2" = "$LINE4" ] && [ "$LINE1" != "$LINE2" ]; then
    echo "" >&2
    echo "BLOCKED: Alternating loop detected (A→B→A→B pattern)" >&2
    echo "  The last 4 tool calls alternate between two operations." >&2
    echo "" >&2
    echo "  Try a different approach or ask the user for guidance." >&2
    echo "" >&2
    exit 2
  fi
fi

exit 0
