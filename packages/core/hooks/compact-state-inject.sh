#!/bin/bash
# compact-state-inject.sh — survive context compaction with disciplinary state
# Triggers on: SessionStart (matcher "compact")
# Profile: standard, strict
#
# After Claude Code compacts the conversation, the counter / marker /
# override-cycle state we kept in session memory is wiped. We persist
# the disciplinary snapshot via the audit log, then on SessionStart
# (compact) we read back the last ~30 min of entries and inject a
# ≤200 char summary into the fresh post-compact context so Claude
# "remembers" its budget standing.
#
# Output format (Claude Code SessionStart additionalContext):
#   {"hookSpecificOutput":{"hookEventName":"SessionStart",
#     "additionalContext":"Session stats: …"}}
#
# Opt-out: CLAUDE_DISABLE_COMPACT_STATE=1

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_COMPACT_STATE:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
SOURCE=$(echo "$INPUT" | jq -r '.source // .matcher // empty' 2>/dev/null)
# Only fire after compaction — skip on fresh / resume sources
if [ "$SOURCE" != "compact" ]; then
  exit 0
fi

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"

AUDIT_DIR="$HOME/.claude/audit"
[ -d "$AUDIT_DIR" ] || exit 0

# Count tagged overrides + /dev invocations in the last 30 minutes
# (across all audit files — today + maybe yesterday at a day boundary).
cutoff=$(date -u -v-30M +%s 2>/dev/null || date -u -d '30 minutes ago' +%s 2>/dev/null || echo 0)

overrides=0
dev_invocations=0
for f in "$AUDIT_DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  while IFS= read -r line; do
    sid=$(printf '%s' "$line" | jq -r '.session_id // empty' 2>/dev/null)
    [ "$sid" != "$SESSION_KEY" ] && continue
    ts=$(printf '%s' "$line" | jq -r '.ts // empty' 2>/dev/null)
    [ -z "$ts" ] && continue
    ts_epoch=$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$ts" +%s 2>/dev/null || \
               date -u -d "$ts" +%s 2>/dev/null || echo 0)
    [ "$ts_epoch" -lt "$cutoff" ] && continue
    tag=$(printf '%s' "$line" | jq -r '.tag // empty' 2>/dev/null)
    [ -n "$tag" ] && overrides=$((overrides + 1))
    marker=$(printf '%s' "$line" | jq -r '.marker_exists // false' 2>/dev/null)
    [ "$marker" = "true" ] && dev_invocations=$((dev_invocations + 1))
  done < "$f"
done

# If nothing notable to inject, exit without emitting anything.
if [ "$overrides" -eq 0 ] && [ "$dev_invocations" -eq 0 ]; then
  exit 0
fi

# Build the summary. Keep under ~200 chars so it doesn't eat budget.
if [ "$overrides" -ge 2 ]; then
  msg="Disciplinary state after compaction: ${overrides} override tag(s) used in the last 30 min. The next override is rejected by the rolling-budget gate — please use /dev for the next code-changing commit."
elif [ "$overrides" -eq 1 ]; then
  msg="Disciplinary state after compaction: 1 override tag used in the last 30 min. One more within 30 min will raise strictness (threshold 3 → 2) and the one after that is blocked."
else
  msg="Disciplinary state after compaction: no overrides in the last 30 min, ${dev_invocations} /dev invocation(s) recorded."
fi

# Emit the SessionStart additionalContext JSON
jq -cn --arg m "$msg" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'
exit 0
