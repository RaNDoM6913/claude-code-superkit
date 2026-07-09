#!/bin/bash
# block-dangerous-git_test.sh — regression test for block-dangerous-git.sh
# Feeds the hook JSON on stdin ({"tool_input":{"command":"..."}}) exactly as
# the PreToolUse wiring does, and asserts exit codes across the full matrix:
#   exit 0 = allowed, exit 2 = blocked.
set -euo pipefail

HOOK="$(cd "$(dirname "$0")/.." && pwd)/block-dangerous-git.sh"
[ -x "$HOOK" ] || { echo "FAIL: hook not executable at $HOOK"; exit 1; }

PASS_COUNT=0
FAIL_COUNT=0

# assert_exit <expected-code> <command>
# Note: no matrix command contains a double-quote or backslash, so the command
# embeds directly into the JSON without escaping.
assert_exit() {
  local expected="$1"
  local cmd="$2"
  local actual=0
  echo "{\"tool_input\":{\"command\":\"$cmd\"}}" | bash "$HOOK" >/dev/null 2>&1 || actual=$?
  if [ "$actual" -eq "$expected" ]; then
    echo "PASS: exit $actual (want $expected)  |  $cmd"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: exit $actual, expected $expected  |  $cmd"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "── MUST PASS (exit 0) — safe ops, incl. the recommended --force-with-lease escape hatch"
assert_exit 0 "git push --force-with-lease"
assert_exit 0 "git push --force-with-lease=main"
assert_exit 0 "git push --force-if-includes --force-with-lease"
assert_exit 0 "git push origin main"
assert_exit 0 "git checkout main"
assert_exit 0 "git checkout -b feature"
assert_exit 0 "git checkout feature-branch"
assert_exit 0 "git switch main"
assert_exit 0 "git switch -c new-branch"
assert_exit 0 "git clean -n"
assert_exit 0 "git restore --source=HEAD~1 file.go"
assert_exit 0 "git status"

echo ""
echo "── MUST BLOCK (exit 2) — force push (bare / -f / +refspec) + working-tree discard"
assert_exit 2 "git push --force"
assert_exit 2 "git push -f origin main"
assert_exit 2 "git push origin +main"
assert_exit 2 "git push origin +refs/heads/main:refs/heads/main"
assert_exit 2 "git checkout ."
assert_exit 2 "git checkout -- src/foo.go"
assert_exit 2 "git checkout -f"
assert_exit 2 "git clean -fd"
assert_exit 2 "git clean -fdx"
assert_exit 2 "git switch --discard-changes"
assert_exit 2 "git switch -C main"

echo ""
echo "── PRE-EXISTING blocks (exit 2) — prove no regression"
assert_exit 2 "git commit --no-verify"
assert_exit 2 "git reset --hard HEAD~1"
assert_exit 2 "git branch -D feature"

echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "BLOCK-DANGEROUS-GIT TESTS FAILED ($FAIL_COUNT/$TOTAL failed)"
  exit 1
fi
echo "ALL BLOCK-DANGEROUS-GIT TESTS PASSED ($PASS_COUNT/$TOTAL)"
