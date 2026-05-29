#!/bin/bash
# warn-visibility_test.sh — regression test for superkit_advise (Task 17)
#
# Verifies that warn-only PreToolUse advisories are surfaced as valid JSON
# `hookSpecificOutput.additionalContext` on stdout (Claude Code can swallow
# non-blocking PreToolUse stderr). Asserts both validity and correct escaping.
set -euo pipefail

LIB="$(cd "$(dirname "$0")/.." && pwd)/lib/profile.sh"
[ -f "$LIB" ] || { echo "FAIL: lib not found at $LIB"; exit 1; }
# shellcheck source=/dev/null
source "$LIB"

command -v superkit_advise >/dev/null 2>&1 || { echo "FAIL: superkit_advise not exported by profile.sh"; exit 1; }

# Test 1: valid JSON + correct escaping of embedded double-quotes
OUT=$(superkit_advise 'hello "world"')
if ! printf '%s' "$OUT" | jq -e '.hookSpecificOutput.additionalContext == "hello \"world\""' >/dev/null; then
  echo "FAIL: additionalContext did not round-trip with escaped quotes"
  echo "  got: $OUT"
  exit 1
fi
echo "PASS: escaped-quote message round-trips as valid JSON"

# Test 2: hookEventName is PreToolUse
if ! printf '%s' "$OUT" | jq -e '.hookSpecificOutput.hookEventName == "PreToolUse"' >/dev/null; then
  echo "FAIL: hookEventName should be PreToolUse"
  exit 1
fi
echo "PASS: hookEventName == PreToolUse"

# Test 3: backslashes and plain text survive
OUT2=$(superkit_advise 'path C:\temp and a plain sentence.')
if ! printf '%s' "$OUT2" | jq -e '.hookSpecificOutput.additionalContext == "path C:\\temp and a plain sentence."' >/dev/null; then
  echo "FAIL: backslash message did not round-trip"
  echo "  got: $OUT2"
  exit 1
fi
echo "PASS: backslash + plain text round-trips"

# Test 4: gateguard-pre-edit advisory path emits additionalContext on stdout.
# No prior Grep/Read state → advisory branch fires; assert stdout carries
# valid hookSpecificOutput JSON (stderr is allowed but not relied upon).
HOOK="$(cd "$(dirname "$0")/.." && pwd)/gateguard-pre-edit.sh"
[ -x "$HOOK" ] || { echo "FAIL: gateguard hook not executable at $HOOK"; exit 1; }
GG_STATE="${TMPDIR:-/tmp}/superkit-gateguard-warnvis-$$"
rm -f "$GG_STATE"
STDOUT=$(echo '{"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"/tmp/fake.txt"}}' \
  | CLAUDE_GATEGUARD_STATE="$GG_STATE" bash "$HOOK" 2>/dev/null || true)
rm -f "$GG_STATE"
if ! printf '%s' "$STDOUT" | jq -e '.hookSpecificOutput.hookEventName == "PreToolUse" and (.hookSpecificOutput.additionalContext | test("GateGuard"))' >/dev/null; then
  echo "FAIL: gateguard advisory did not surface additionalContext on stdout"
  echo "  stdout was: $STDOUT"
  exit 1
fi
echo "PASS: gateguard advisory surfaces additionalContext on stdout"

echo ""
echo "ALL WARN-VISIBILITY TESTS PASSED (4/4)"
