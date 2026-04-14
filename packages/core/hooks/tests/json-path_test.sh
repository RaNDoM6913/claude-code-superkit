#!/bin/bash
# json-path_test.sh — sanity tests that the 5 hooks read `.tool_input.*`
# correctly after the 2026-04-14 fix. Before the fix, these hooks read
# `.command` / `.file_path` at the top level and silently exited 0.
# Each case here asserts that the hook actually exercises its main
# branch when given a well-formed Claude Code payload.
#
# Usage: bash packages/core/hooks/tests/json-path_test.sh
# Exit codes: 0 if all cases pass, 1 on first failure.

set -u

HOOKS=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
FAIL_DETAILS=""

# Prepare a repo with staged changes so doc-check + dev-required have something
# to diff against.
REPO="$TMP/repo"
mkdir -p "$REPO/backend/migrations"
(cd "$REPO" && git init -q && \
  echo "init" > README.md && git add README.md && \
  git -c user.email=t@t -c user.name=t commit -qm init && \
  echo "CREATE TABLE foo();" > backend/migrations/001_foo.up.sql && \
  git add backend/migrations/001_foo.up.sql)

assert_exit() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  local allow_any="${4:-false}"
  if [ "$allow_any" = "true" ] || [ "$actual" = "$expected" ]; then
    echo "  ✓ $name (exit=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
    FAIL_DETAILS="${FAIL_DETAILS}\n  - $name (expected=$expected actual=$actual)"
  fi
}

echo "json-path_test.sh — verify all 5 hooks read .tool_input.* correctly"
echo ""

# 1) doc-check-on-commit — must BLOCK (code staged, no docs)
PAYLOAD=$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git -C %s commit -m test"}}' "$REPO")
ACTUAL=$(echo "$PAYLOAD" | bash "$HOOKS/doc-check-on-commit.sh" >/dev/null 2>&1; echo $?)
assert_exit "doc-check-on-commit blocks missing docs" 2 "$ACTUAL"

# 2) superkit-counts-verify — exit 0 outside superkit repo (no packages/ layout)
PAYLOAD=$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git -C %s commit -m test"}}' "$REPO")
ACTUAL=$(cd "$TMP" && echo "$PAYLOAD" | bash "$HOOKS/superkit-counts-verify.sh" >/dev/null 2>&1; echo $?)
assert_exit "superkit-counts-verify exits 0 outside superkit repo" 0 "$ACTUAL"

# 3) config-protection — warn on .eslintrc (exit 0 always, but must fire)
PAYLOAD='{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"/tmp/.eslintrc.json"}}'
OUTPUT=$(echo "$PAYLOAD" | bash "$HOOKS/config-protection.sh" 2>&1)
ACTUAL=$?
if echo "$OUTPUT" | grep -q "WARNING: Config file modified"; then
  echo "  ✓ config-protection warns on .eslintrc (exit=$ACTUAL)"
  PASS=$((PASS + 1))
else
  echo "  ✗ config-protection did NOT warn on .eslintrc — output: $OUTPUT"
  FAIL=$((FAIL + 1))
  FAIL_DETAILS="${FAIL_DETAILS}\n  - config-protection missed .eslintrc.json"
fi

# 4) security-patterns — warn on eval() in a .js file (exit 0 always)
echo 'foo(eval(x));' > "$TMP/bad.js"
PAYLOAD=$(printf '{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{"file_path":"%s"}}' "$TMP/bad.js")
OUTPUT=$(echo "$PAYLOAD" | bash "$HOOKS/security-patterns.sh" 2>&1)
if echo "$OUTPUT" | grep -q "eval()"; then
  echo "  ✓ security-patterns flags eval()"
  PASS=$((PASS + 1))
else
  echo "  ✗ security-patterns missed eval() — output: $OUTPUT"
  FAIL=$((FAIL + 1))
  FAIL_DETAILS="${FAIL_DETAILS}\n  - security-patterns missed eval() in .js"
fi

# 5) loop-guard — first call just records (exit 0, no block)
export TMPDIR="$TMP"
rm -f "$TMP/claude-loop-guard-"*
PAYLOAD='{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"ls -la"}}'
ACTUAL=$(echo "$PAYLOAD" | bash "$HOOKS/loop-guard.sh" >/dev/null 2>&1; echo $?)
assert_exit "loop-guard first call → allow" 0 "$ACTUAL"
# Verify a fingerprint file was actually written (proves COMMAND was read)
LOG=$(ls "$TMP/claude-loop-guard-"* 2>/dev/null | head -1)
if [ -n "$LOG" ] && [ -s "$LOG" ]; then
  echo "  ✓ loop-guard wrote fingerprint ($(wc -l < "$LOG") entries)"
  PASS=$((PASS + 1))
else
  echo "  ✗ loop-guard did not write a fingerprint — command was not parsed"
  FAIL=$((FAIL + 1))
  FAIL_DETAILS="${FAIL_DETAILS}\n  - loop-guard skipped (empty .tool_input.command parse)"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo -e "Failures:${FAIL_DETAILS}"
  exit 1
fi
exit 0
