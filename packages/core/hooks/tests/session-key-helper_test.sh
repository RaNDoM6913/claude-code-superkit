#!/usr/bin/env bash
set -u
LIB="$(cd "$(dirname "$0")/.." && pwd)/lib/profile.sh"
. "$LIB"

fail=0
# SESSION_ID wins
SESSION_ID="sid123" CLAUDE_HOOK_PID="" ; k=$(superkit_session_key)
[ "$k" = "sid123" ] || { echo "FAIL: SESSION_ID precedence got '$k'"; fail=1; }
# falls back to CLAUDE_HOOK_PID
unset SESSION_ID; CLAUDE_HOOK_PID="pid456"; k=$(superkit_session_key)
[ "$k" = "pid456" ] || { echo "FAIL: CLAUDE_HOOK_PID fallback got '$k'"; fail=1; }
# falls back to PPID (non-empty)
unset SESSION_ID CLAUDE_HOOK_PID; k=$(superkit_session_key)
[ -n "$k" ] || { echo "FAIL: PPID fallback empty"; fail=1; }

[ "$fail" -eq 0 ] && echo "PASS: session-key helper" && exit 0 || exit 1
