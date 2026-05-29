#!/bin/bash
# edit-streak-check_test.sh — regression test for edit-streak-check.sh
set -euo pipefail

HOOK="$(cd "$(dirname "$0")/.." && pwd)/edit-streak-check.sh"
[ -x "$HOOK" ] || { echo "FAIL: hook not executable at $HOOK"; exit 1; }

TMPDIR="${TMPDIR:-/tmp}"
STREAK_FILE="$TMPDIR/claude-edit-streak-test-$$"
export CLAUDE_EDIT_STREAK_FILE="$STREAK_FILE"
rm -f "$STREAK_FILE"

fire_edit() {
  echo '{"tool_name":"Edit","tool_input":{"file_path":"/tmp/fake.txt"}}' | bash "$HOOK" 2>&1 >/dev/null
}

fire_bash() {
  echo '{"tool_name":"Bash","tool_input":{"command":"echo hi"}}' | bash "$HOOK" 2>&1 >/dev/null
}

# Test 1: 4 edits — no warning yet
for i in 1 2 3 4; do
  OUT=$(fire_edit || true)
  if echo "$OUT" | grep -q "edit streak"; then
    echo "FAIL: warning fired at edit $i (should start at 5)"
    exit 1
  fi
done
echo "PASS: edits 1-4 silent"

# Test 2: 5th edit — warning fires
OUT=$(fire_edit || true)
if ! echo "$OUT" | grep -q "edit streak — 5"; then
  echo "FAIL: 5th edit should warn"
  echo "stderr was: $OUT"
  exit 1
fi
echo "PASS: 5th edit warns"

# Test 3: Bash call resets counter
fire_bash
if [ -f "$STREAK_FILE" ]; then
  echo "FAIL: Bash did not clear streak file"
  exit 1
fi
echo "PASS: Bash resets streak"

# Test 4: After reset, next edit is 1 again (silent)
OUT=$(fire_edit || true)
if echo "$OUT" | grep -q "edit streak"; then
  echo "FAIL: first edit after reset should be silent"
  exit 1
fi
echo "PASS: post-reset silent"

# Test 5: CLAUDE_DISABLE_EDIT_STREAK=1 silences even at 10+
rm -f "$STREAK_FILE"
for i in 1 2 3 4 5 6 7 8 9 10; do
  OUT=$(CLAUDE_DISABLE_EDIT_STREAK=1 fire_edit || true)
  if echo "$OUT" | grep -q "edit streak"; then
    echo "FAIL: CLAUDE_DISABLE_EDIT_STREAK=1 should silence"
    exit 1
  fi
done
echo "PASS: opt-out silences"

# Test 6: fast profile skips entirely
rm -f "$STREAK_FILE"
OUT=$(CLAUDE_HOOK_PROFILE=fast fire_edit || true)
# In fast, no file should be written
if [ -f "$STREAK_FILE" ]; then
  echo "FAIL: fast profile should not update streak file"
  exit 1
fi
echo "PASS: fast profile skips"

# Test 7: cross-call accumulation via SESSION_ID
# Empirically proves whether per-session state survives across hook invocations.
# Without fix: each `bash "$HOOK"` spawns a new PID → different PPID → count resets.
# With fix (superkit_session_key): SESSION_ID wins, all 5 calls share one state file.
export SESSION_ID="test-sess-$$"
unset CLAUDE_EDIT_STREAK_FILE
SESS_STREAK_FILE="${TMPDIR}/claude-edit-streak-${SESSION_ID}"
rm -f "$SESS_STREAK_FILE"

for i in 1 2 3 4 5; do
  echo '{"tool_name":"Edit","tool_input":{"file_path":"/tmp/fake.txt"}}' | bash "$HOOK" 2>/dev/null || true
done

SESS_COUNT=$(cat "$SESS_STREAK_FILE" 2>/dev/null || echo 0)
if [ "$SESS_COUNT" -lt 5 ]; then
  echo "FAIL: cross-call accumulation — state did not accumulate across invocations (count=$SESS_COUNT, expected 5)"
  echo "  Likely cause: hook uses bare \$PPID instead of superkit_session_key()"
  unset SESSION_ID
  rm -f "$SESS_STREAK_FILE"
  exit 1
fi
echo "PASS: cross-call accumulation via SESSION_ID (count=$SESS_COUNT)"

unset SESSION_ID
rm -f "$SESS_STREAK_FILE"

# Cleanup
rm -f "$STREAK_FILE"
echo ""
echo "ALL EDIT-STREAK TESTS PASSED (7/7)"
