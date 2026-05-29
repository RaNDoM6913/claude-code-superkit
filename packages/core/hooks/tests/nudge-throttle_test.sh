#!/bin/bash
# nudge-throttle_test.sh — regression test for advisory throttling (Task 18)
#
# Opus 4.8 self-flags, so repeated identical advisories are noise. The
# superkit_should_emit_advisory helper suppresses an identical advisory that
# recurs within CLAUDE_NUDGE_WINDOW_MIN (default 10). This test proves:
#   1. first identical advisory is emitted, second within the window is suppressed
#   2. CLAUDE_NUDGE_WINDOW_MIN=0 disables throttling
#   3. a different message is NOT suppressed by an unrelated one
#   4. edit-streak-check.sh suppresses its repeated streak nudge under one session
set -euo pipefail

LIB="$(cd "$(dirname "$0")/.." && pwd)/lib/profile.sh"
[ -f "$LIB" ] || { echo "FAIL: lib not found at $LIB"; exit 1; }
# shellcheck source=/dev/null
source "$LIB"

command -v superkit_should_emit_advisory >/dev/null 2>&1 \
  || { echo "FAIL: superkit_should_emit_advisory not exported by profile.sh"; exit 1; }

TMPDIR="${TMPDIR:-/tmp}"

# ── Test 1: first emits, second within window suppressed ──────────────
export SUPERKIT_NUDGE_STATE="$TMPDIR/superkit-nudge-helper-test-$$"
rm -f "$SUPERKIT_NUDGE_STATE"
if superkit_should_emit_advisory "same nudge"; then
  echo "PASS: first identical advisory emitted"
else
  echo "FAIL: first advisory should be emitted"
  rm -f "$SUPERKIT_NUDGE_STATE"; exit 1
fi
if superkit_should_emit_advisory "same nudge"; then
  echo "FAIL: second identical advisory within window should be suppressed"
  rm -f "$SUPERKIT_NUDGE_STATE"; exit 1
else
  echo "PASS: second identical advisory suppressed within window"
fi

# ── Test 2: a different message is not suppressed ─────────────────────
if superkit_should_emit_advisory "a different nudge"; then
  echo "PASS: distinct advisory not suppressed by unrelated one"
else
  echo "FAIL: distinct advisory should still emit"
  rm -f "$SUPERKIT_NUDGE_STATE"; exit 1
fi
rm -f "$SUPERKIT_NUDGE_STATE"

# ── Test 3: CLAUDE_NUDGE_WINDOW_MIN=0 disables throttling ─────────────
export SUPERKIT_NUDGE_STATE="$TMPDIR/superkit-nudge-helper-test2-$$"
rm -f "$SUPERKIT_NUDGE_STATE"
CLAUDE_NUDGE_WINDOW_MIN=0 superkit_should_emit_advisory "x" || { echo "FAIL: window=0 should always emit (1st)"; rm -f "$SUPERKIT_NUDGE_STATE"; exit 1; }
CLAUDE_NUDGE_WINDOW_MIN=0 superkit_should_emit_advisory "x" || { echo "FAIL: window=0 should always emit (2nd)"; rm -f "$SUPERKIT_NUDGE_STATE"; exit 1; }
echo "PASS: CLAUDE_NUDGE_WINDOW_MIN=0 disables throttling"
rm -f "$SUPERKIT_NUDGE_STATE"

# ── Test 4: edit-streak-check.sh end-to-end throttling ────────────────
# Under a fixed SESSION_ID, drive the streak past the threshold so the
# advisory fires, then drive it again — the second nudge must be suppressed.
HOOK="$(cd "$(dirname "$0")/.." && pwd)/edit-streak-check.sh"
[ -x "$HOOK" ] || { echo "FAIL: edit-streak hook not executable at $HOOK"; exit 1; }

export SESSION_ID="nudge-throttle-sess-$$"
export SUPERKIT_NUDGE_STATE="$TMPDIR/superkit-nudge-${SESSION_ID}"
STREAK_FILE="$TMPDIR/claude-edit-streak-${SESSION_ID}"
rm -f "$SUPERKIT_NUDGE_STATE" "$STREAK_FILE"
unset CLAUDE_EDIT_STREAK_FILE 2>/dev/null || true

fire_edit() {
  echo '{"tool_name":"Edit","tool_input":{"file_path":"/tmp/fake.txt"}}' | bash "$HOOK" 2>&1 >/dev/null
}

# Edits 1-4 silent, 5th fires the advisory.
for i in 1 2 3 4; do fire_edit >/dev/null || true; done
OUT5=$(fire_edit || true)
if ! echo "$OUT5" | grep -q "edit streak — 5"; then
  echo "FAIL: 5th edit should warn (first advisory)"
  echo "  stderr: $OUT5"
  rm -f "$SUPERKIT_NUDGE_STATE" "$STREAK_FILE"; unset SESSION_ID SUPERKIT_NUDGE_STATE; exit 1
fi
echo "PASS: edit-streak first advisory emitted (edit 5)"

# 6th edit: streak >= 5 again, but identical advisory must be throttled.
OUT6=$(fire_edit || true)
if echo "$OUT6" | grep -q "edit streak"; then
  echo "FAIL: 6th edit advisory should be suppressed within window"
  echo "  stderr: $OUT6"
  rm -f "$SUPERKIT_NUDGE_STATE" "$STREAK_FILE"; unset SESSION_ID SUPERKIT_NUDGE_STATE; exit 1
fi
echo "PASS: edit-streak repeat advisory suppressed within window"

rm -f "$SUPERKIT_NUDGE_STATE" "$STREAK_FILE"
unset SESSION_ID SUPERKIT_NUDGE_STATE

echo ""
echo "ALL NUDGE-THROTTLE TESTS PASSED (6/6)"
