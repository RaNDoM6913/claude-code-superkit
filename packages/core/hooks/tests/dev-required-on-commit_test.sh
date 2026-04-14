#!/bin/bash
# dev-required-on-commit_test.sh — regression tests for dev-required-on-commit.sh
# Usage: bash packages/core/hooks/tests/dev-required-on-commit_test.sh
# Exit codes: 0 if all cases pass, 1 on first failure.

set -u

HOOK=$(cd "$(dirname "$0")/.." && pwd)/dev-required-on-commit.sh
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

SID="test-dev-required-$$"
COUNTER="${TMPDIR:-/tmp}/claude-edit-count-${SID}"
MARKER="${TMPDIR:-/tmp}/claude-dev-marker-${SID}"

PASS=0
FAIL=0
FAIL_DETAILS=""

reset_state() { rm -f "$COUNTER" "$MARKER"; }

run_case() {
  local name="$1"
  local expected="$2"
  shift 2
  local repo="$TMP/case-$PASS-$FAIL"
  rm -rf "$repo"
  mkdir -p "$repo"
  (cd "$repo" && git init -q && git -c user.email=t@t -c user.name=t commit --allow-empty -qm init)
  # NOTE: caller manages counter/marker state so we don't wipe pre-set values.
  # shellcheck disable=SC2068
  $@ "$repo"
  local payload
  payload=$(printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git -C %s commit -m %s"},"session_id":"%s"}' "$repo" "${COMMIT_MSG:-test}" "$SID")
  local actual
  actual=$(echo "$payload" | bash "$HOOK" >/dev/null 2>&1; echo $?)
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $name (exit=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
    FAIL_DETAILS="${FAIL_DETAILS}\n  - $name (expected=$expected actual=$actual)"
  fi
  unset COMMIT_MSG
}

# ── Case helpers ──────────────────────────────────────────────────────────

stage_code() {
  local r="$1"
  (cd "$r" && mkdir -p backend && \
    echo "package main" > backend/main.go && \
    git add backend/main.go)
}

stage_docs_only() {
  local r="$1"
  (cd "$r" && \
    echo "# readme" > README.md && \
    git add README.md)
}

set_counter() { echo "$1" > "$COUNTER"; }
set_marker() { touch "$MARKER"; }

# ── Run suite ──────────────────────────────────────────────────────────────

echo "dev-required-on-commit_test.sh — regression suite"
echo ""

# Case A: 0 edits + code staged → allow
reset_state
run_case "A: 0 edits + code staged → ALLOW" 0 stage_code

# Case B: 3 edits + code + no /dev marker → BLOCK
reset_state; set_counter 3
run_case "B: 3 edits + code + no /dev → BLOCK" 2 stage_code

# Case C: 3 edits + [quick] override → ALLOW (state reset)
reset_state; set_counter 3
COMMIT_MSG="'[quick] fix typo'"
run_case "C: 3 edits + [quick] override → ALLOW" 0 stage_code
[ ! -f "$COUNTER" ] && [ ! -f "$MARKER" ] && echo "    (state reset verified)" || echo "    WARN: state not reset after C"

# Case D: 3 edits + marker present → ALLOW
reset_state; set_counter 3; set_marker
run_case "D: 3 edits + /dev marker → ALLOW" 0 stage_code

# Case E: 5 edits + docs-only staged → ALLOW (docs-only exempt)
reset_state; set_counter 5
run_case "E: 5 edits + docs-only → ALLOW (exempt)" 0 stage_docs_only

# Case F: [no-dev] override on any count → ALLOW
reset_state; set_counter 10
COMMIT_MSG="'[no-dev] infra change'"
run_case "F: [no-dev] override → ALLOW" 0 stage_code

echo ""
echo "Results: $PASS passed, $FAIL failed"
reset_state
if [ "$FAIL" -gt 0 ]; then
  echo -e "Failures:${FAIL_DETAILS}"
  exit 1
fi
exit 0
