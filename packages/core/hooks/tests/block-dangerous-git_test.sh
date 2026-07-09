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

# assert_exit_json <expected-code> <command> [label]
# Same contract as assert_exit, but JSON-encodes <command> with python3 (jq
# fallback) so it can carry double-quotes, single-quotes and embedded newlines
# (needed for -m "quoted" messages and -F - heredoc bodies). Escaping is NEVER
# hand-rolled — the encoder owns it. <label> keeps multiline commands readable
# in the output; defaults to the (possibly multiline) command.
json_encode() {
  # reads command on stdin, prints {"tool_input":{"command": <encoded>}}
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; print(json.dumps({"tool_input":{"command": sys.stdin.read()}}))'
  else
    jq -Rs '{tool_input: {command: .}}'
  fi
}
assert_exit_json() {
  local expected="$1"
  local cmd="$2"
  local label="${3:-$cmd}"
  local actual=0
  printf '%s' "$cmd" | json_encode | bash "$HOOK" >/dev/null 2>&1 || actual=$?
  if [ "$actual" -eq "$expected" ]; then
    echo "PASS: exit $actual (want $expected)  |  $label"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: exit $actual, expected $expected  |  $label"
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
echo "── D4: commit MESSAGE must NOT self-trip the guards (exit 0) — needs JSON encoding"
# (1) message that literally names --no-verify while explaining the ban
assert_exit_json 0 'git commit -m "docs: explain why --no-verify is banned"' \
  'message names --no-verify (explaining the ban)'
# (2) message that names a force push + the +refspec form
assert_exit_json 0 'git commit -m "hook: block git push --force and +refspec"' \
  'message names git push --force'
# (3) -F - heredoc whose body mentions BOTH --no-verify and --force
HEREDOC_BOTH=$'git commit -F - <<\'EOF\'\ndocs: document the git guardrails\n\nExplain why --no-verify is banned and why git push --force is blocked.\nEOF'
assert_exit_json 0 "$HEREDOC_BOTH" \
  'heredoc body (-F -) mentions --no-verify AND git push --force'
# --message= long form naming force-with-lease / --force as prose
assert_exit_json 0 "git commit --message='explain --force-with-lease vs --force'" \
  '--message= prose naming --force'
# chained-but-SAFE: message stripped, remainder is the recommended escape hatch
assert_exit_json 0 'git commit -m "x" && git push --force-with-lease' \
  'message stripped; chained --force-with-lease stays allowed'
# ADVERSARIAL: a real force-push command TEXT lives entirely inside the quotes
assert_exit_json 0 'git commit -m "sample; git push --force in a doc"' \
  'ADVERSARIAL: "; git push --force" is TEXT inside the quotes'
# ADVERSARIAL: heredoc body naming reset --hard / branch -D as documentation
HEREDOC_DESTRUCT=$'git commit -F - <<EOF\nchangelog: warn about git reset --hard and git branch -D\nEOF'
assert_exit_json 0 "$HEREDOC_DESTRUCT" \
  'ADVERSARIAL: heredoc body names reset --hard & branch -D'

echo ""
echo "── D4: guard must NOT weaken (exit 2) — danger OUTSIDE the message still blocks"
# (4) chained real force push after a stripped message
assert_exit_json 2 'git commit -m "x" && git push --force' \
  'chained: git push --force after a stripped message'
# (5) a real --no-verify flag sitting OUTSIDE any message
assert_exit_json 2 'git commit --no-verify -m "x"' \
  'real --no-verify flag outside the -m message'
# ADVERSARIAL: message stripped, then a real reset --hard via ; separator
assert_exit_json 2 'git commit -m "safe" ; git reset --hard HEAD~1' \
  'ADVERSARIAL: message stripped; chained git reset --hard blocks'
# ADVERSARIAL: unquoted -m token then a real chained force push
assert_exit_json 2 'git commit -m wip && git push --force' \
  'ADVERSARIAL: unquoted -m value; chained git push --force blocks'
# ADVERSARIAL: message stripped, then a second real --no-verify commit
assert_exit_json 2 'git commit -m "msg" && git commit --no-verify' \
  'ADVERSARIAL: chained second commit with real --no-verify blocks'

echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "BLOCK-DANGEROUS-GIT TESTS FAILED ($FAIL_COUNT/$TOTAL failed)"
  exit 1
fi
echo "ALL BLOCK-DANGEROUS-GIT TESTS PASSED ($PASS_COUNT/$TOTAL)"
