#!/bin/bash
# loop-guard.sh — detect and block repeated identical tool calls (anti-loop protection)
# Triggers on: PreToolUse(Bash)
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read tool input and create a fingerprint
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
COMMAND=$(echo "$INPUT" | jq -r '.command // .input.command // empty' 2>/dev/null)

if [ -z "$TOOL_NAME" ] || [ -z "$COMMAND" ]; then
  exit 0
fi

# Create a hash of the tool call for comparison
FINGERPRINT=$(echo "${TOOL_NAME}:${COMMAND}" | shasum -a 256 | cut -d' ' -f1)

# Log file for tracking recent calls (per-session)
LOG_FILE="/tmp/claude-loop-guard-${PPID}.log"

# Append current fingerprint
echo "$FINGERPRINT" >> "$LOG_FILE"

# Keep only last 6 entries
tail -6 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

# Read recent fingerprints
RECENT=$(tail -4 "$LOG_FILE" 2>/dev/null)
COUNT=$(echo "$RECENT" | grep -c "^${FINGERPRINT}$" 2>/dev/null)

# Block if 3+ identical consecutive calls
if [ "$COUNT" -ge 3 ]; then
  echo ""
  echo "BLOCKED: Loop detected — same tool call repeated 3+ times"
  echo "  Tool: $TOOL_NAME"
  echo "  Command: $(echo "$COMMAND" | head -c 100)"
  echo ""
  echo "  Try a different approach or ask the user for guidance."
  echo ""
  exit 2
fi

# Detect A→B→A→B pattern (sliding window)
if [ "$(wc -l < "$LOG_FILE" 2>/dev/null)" -ge 4 ]; then
  LINE1=$(sed -n '1p' "$LOG_FILE")
  LINE2=$(sed -n '2p' "$LOG_FILE")
  LINE3=$(sed -n '3p' "$LOG_FILE")
  LINE4=$(sed -n '4p' "$LOG_FILE")

  if [ "$LINE1" = "$LINE3" ] && [ "$LINE2" = "$LINE4" ] && [ "$LINE1" != "$LINE2" ]; then
    echo ""
    echo "BLOCKED: Alternating loop detected (A→B→A→B pattern)"
    echo "  The last 4 tool calls alternate between two operations."
    echo ""
    echo "  Try a different approach or ask the user for guidance."
    echo ""
    exit 2
  fi
fi

exit 0
