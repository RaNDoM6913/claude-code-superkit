#!/bin/bash
# gateguard-pre-edit.sh — require facts (Grep/Read) before Edit/Write/Bash
# Triggers on: PreToolUse(Edit|Write|MultiEdit|Bash)
# Profile: standard, strict
#
# Pattern caught: Claude immediately starts editing files or running shell
# commands without first looking around (no Grep/Read in the last N tool
# calls). Forces "establish facts before action" discipline — find the
# callers, read the schema, understand the surface area before changing it.
#
# Advisory only by default (exit 0 with a stderr nudge). Set
# CLAUDE_GATEGUARD_STRICT=1 to make it blocking (exit 2 with a structured
# JSON decision).
#
# Inspired by GateGuard pattern from affaan-m/everything-claude-code
# (Anthropic Hackathon Winner, 181k stars).
#
# Opt-out: CLAUDE_DISABLE_GATEGUARD=1

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

[ "${CLAUDE_DISABLE_GATEGUARD:-}" = "1" ] && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)

[ "$EVENT" = "PreToolUse" ] || exit 0
case "$TOOL_NAME" in
  Edit|Write|MultiEdit|Bash) ;;
  *) exit 0 ;;
esac

# Read-only Bash commands don't require a facts pass — exempt them.
if [ "$TOOL_NAME" = "Bash" ]; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
  case "$CMD" in
    "ls "*|"ls"|"pwd"|"cat "*|"head "*|"tail "*|"less "*|"wc "*|"file "*)
      exit 0 ;;
    "grep "*|"rg "*|"find "*|"fd "*|"which "*|"type "*|"command "*)
      exit 0 ;;
    "git status"*|"git diff"*|"git log"*|"git show"*|"git blame"*|"git branch"*)
      exit 0 ;;
    "git rev-parse"*|"git config "*|"git remote "*|"git ls-files"*)
      exit 0 ;;
    "echo "*|"printf "*|"date"*|"whoami"*|"hostname"*|"env"|"uname"*)
      exit 0 ;;
    "ps "*|"top"|"htop"|"df "*|"du "*|"free"*|"jq "*|"yq "*)
      exit 0 ;;
  esac
fi

# State file tracks the last Grep/Read timestamp + tool call counter.
STATE_FILE="${CLAUDE_GATEGUARD_STATE:-${TMPDIR:-/tmp}/superkit-gateguard-state-${PPID}}"
WINDOW_SECONDS="${CLAUDE_GATEGUARD_WINDOW:-600}"

now=$(date +%s)
last_facts=0
counter_since_facts=999

if [ -f "$STATE_FILE" ]; then
  # State format: "last_facts_ts counter_since_facts"
  read -r last_facts counter_since_facts < "$STATE_FILE" 2>/dev/null
  last_facts=${last_facts:-0}
  counter_since_facts=${counter_since_facts:-999}

  # Expire stale state — if last Grep/Read was too long ago, treat as never.
  if [ "$((now - last_facts))" -gt "$WINDOW_SECONDS" ]; then
    last_facts=0
    counter_since_facts=999
  fi
fi

# Increment counter for this attempted action (we're in PreToolUse for
# Edit/Write/Bash). If a recent Grep/Read exists, we're good.
counter_since_facts=$((counter_since_facts + 1))
echo "$last_facts $counter_since_facts" > "$STATE_FILE"

# Threshold: if no Grep/Read recorded at all, or counter is too high,
# emit a warning.
if [ "$last_facts" = "0" ] || [ "$counter_since_facts" -gt 3 ]; then
  if [ "${CLAUDE_GATEGUARD_STRICT:-}" = "1" ]; then
    # Strict mode: emit structured JSON to block the tool call
    cat <<'EOF'
{
  "decision": "block",
  "reason": "GateGuard: no recent Grep/Read in the last 10 minutes. Before editing or running commands, look at the surface area: find callers (Grep), read the schema/types (Read), confirm the file/function exists. Edit blindly = silent breakage. Run a discovery step first, then retry."
}
EOF
    exit 2
  fi

  # Advisory mode: just a stderr nudge
  echo "" >&2
  echo "🔍 GATEGUARD: no Grep/Read in recent history. Consider establishing facts first:" >&2
  echo "   - Grep for callers / importers before changing a function" >&2
  echo "   - Read the schema / types before changing data shape" >&2
  echo "   - Confirm the file exists and you're editing the right one" >&2
  echo "   (CLAUDE_GATEGUARD_STRICT=1 to enforce; CLAUDE_DISABLE_GATEGUARD=1 to silence)" >&2
  echo "" >&2
fi

exit 0
