#!/bin/bash
# audit-trail.sh — append-only hash-chained audit log (Task 10).
# Triggers on: PostToolUse (Bash, Edit, Write, Skill). Profile: standard, strict.
#
# Writes one JSON line per tool call to ~/.claude/audit/YYYY-MM-DD.jsonl.
# Each line contains:
#   ts          — ISO 8601 UTC timestamp
#   session_id  — Claude Code session_id from payload (falls back to PPID)
#   project     — basename of $CLAUDE_PROJECT_DIR
#   event       — tool name (Bash|Edit|Write|Skill|…) or semantic tag
#   tool        — raw tool name
#   decision    — "allow" (exit-0 peer consensus assumed) or "error" on parse fail
#   tag         — override tag extracted from a git-commit command, if any
#   files       — comma-joined staged/edited file list (short)
#   counter     — current /dev edit counter value (reads the state file)
#   marker_exists — whether /dev marker is present (true/false)
#   prev_hash   — previous line's hash (genesis = 64 zeros)
#   hash        — sha256(prev_hash || canonical_json_of_this_line_without_hash)
#
# The log is append-only. `/audit --verify-chain` recomputes the chain
# and reports the first divergence. `/audit --discipline` aggregates.
# Rotation: session-context-restore.sh moves logs older than 30 days to
# ~/.claude/audit/archive/.
#
# Opt-out: CLAUDE_DISABLE_AUDIT_TRAIL=1.

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_AUDIT_TRAIL:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')

# ── Parse payload ────────────────────────────────────────────────────────
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "Unknown"' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "PostToolUse"' 2>/dev/null)

# Tool-specific snippet
FIELD=""
case "$TOOL" in
  Bash)
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)
    # Keep first 120 chars for the log
    FIELD=$(printf '%s' "$CMD" | head -c 120 | tr '\n' ' ')
    ;;
  Edit|Write|MultiEdit)
    FIELD=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
    ;;
  Skill)
    FIELD=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
    ;;
esac

# Override tag if the command is a git commit
TAG=""
if [ "$TOOL" = "Bash" ]; then
  TAG=$(printf '%s' "$CMD" | grep -oiE '\[(quick|no-dev|trivial|hotfix|wip)(:[^]]*)?\]' | head -1)
fi

# Counter + marker state
COUNTER_FILE="${TMPDIR:-/tmp}/claude-edit-count-${SESSION_KEY}"
MARKER_FILE="${TMPDIR:-/tmp}/claude-dev-marker-${SESSION_KEY}"
COUNTER=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
[ -f "$MARKER_FILE" ] && MARKER="true" || MARKER="false"

PROJECT=$(basename "${CLAUDE_PROJECT_DIR:-$(pwd)}")
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ── Prepare log directory + chain state ──────────────────────────────────
AUDIT_DIR="$HOME/.claude/audit"
LAST_HASH_FILE="$AUDIT_DIR/.last-hash"
mkdir -p "$AUDIT_DIR" 2>/dev/null

PREV_HASH=$(cat "$LAST_HASH_FILE" 2>/dev/null)
if [ -z "$PREV_HASH" ] || [ ${#PREV_HASH} -ne 64 ]; then
  PREV_HASH=$(printf '%064d' 0)   # genesis = 64 zeros
fi

# ── Emit canonical JSON (without hash) and compute hash over it ──────────
# `jq -c` produces deterministic compact output given ordered keys.
PAYLOAD=$(jq -cn \
  --arg ts       "$TS" \
  --arg sid      "$SESSION_KEY" \
  --arg project  "$PROJECT" \
  --arg event    "$EVENT" \
  --arg tool     "$TOOL" \
  --arg field    "$FIELD" \
  --arg tag      "$TAG" \
  --arg counter  "$COUNTER" \
  --arg marker   "$MARKER" \
  --arg prev     "$PREV_HASH" \
  '{ts:$ts,session_id:$sid,project:$project,event:$event,tool:$tool,field:$field,tag:$tag,counter:($counter|tonumber),marker_exists:($marker=="true"),prev_hash:$prev}' \
  2>/dev/null)

if [ -z "$PAYLOAD" ]; then
  exit 0  # jq failure — skip logging rather than corrupt the chain
fi

HASH=$(printf '%s' "$PAYLOAD" | shasum -a 256 | cut -d' ' -f1)

# ── Append line + update last-hash atomically ────────────────────────────
LINE=$(printf '%s' "$PAYLOAD" | jq -c --arg h "$HASH" '. + {hash:$h}')
LOG_FILE="$AUDIT_DIR/$(date -u +%Y-%m-%d).jsonl"

# Append is atomic for < PIPE_BUF-byte writes; our lines are always small.
printf '%s\n' "$LINE" >> "$LOG_FILE"

# Update last-hash via mv-rename for atomicity
TMP_HASH="$AUDIT_DIR/.last-hash.$$"
printf '%s' "$HASH" > "$TMP_HASH" && mv -f "$TMP_HASH" "$LAST_HASH_FILE"

exit 0
