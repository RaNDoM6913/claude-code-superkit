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
# Long-lived anti-reset cycle log — the hook derives this path from
# SESSION_KEY (= session_id = SID).
CYCLES_FILE="$HOME/.claude/state/dev-cycles-${SID}.jsonl"

PASS=0
FAIL=0
FAIL_DETAILS=""

# Clear ALL session state between cases — including the anti-reset cycle log,
# so override cases never inherit a consecutive-override penalty from earlier
# cases. (The final call also cleans up the long-lived file on the way out.)
reset_state() { rm -f "$COUNTER" "$MARKER" "$CYCLES_FILE"; }

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

# Exempt-path stagers: a CODE file under memory/ or .claude/ must still be
# treated as exempt (HAS_CODE stays false) — the D3 regression target.
stage_memory() {
  local r="$1"
  (cd "$r" && mkdir -p memory && \
    echo "package mem" > memory/snippet.go && \
    git add memory/snippet.go)
}

stage_claude() {
  local r="$1"
  (cd "$r" && mkdir -p .claude && \
    echo "package cfg" > .claude/config.go && \
    git add .claude/config.go)
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

# Case C: 3 edits + [quick: <rationale≥15 chars>] → ALLOW (Task 12)
reset_state; set_counter 3
COMMIT_MSG="'[quick: minor config path adjustment, no logic change]'"
run_case "C: 3 edits + [quick: …] rationale → ALLOW" 0 stage_code
[ ! -f "$COUNTER" ] && [ ! -f "$MARKER" ] && echo "    (state reset verified)" || echo "    WARN: state not reset after C"

# Case D: 3 edits + marker present → ALLOW
reset_state; set_counter 3; set_marker
run_case "D: 3 edits + /dev marker → ALLOW" 0 stage_code

# Case E: 5 edits + docs-only staged → ALLOW (docs-only exempt)
reset_state; set_counter 5
run_case "E: 5 edits + docs-only → ALLOW (exempt)" 0 stage_docs_only

# Case F: [no-dev: <rationale>] override on any count → ALLOW
reset_state; set_counter 10
COMMIT_MSG="'[no-dev: infra-only change, .claude settings]'"
run_case "F: [no-dev: …] rationale → ALLOW" 0 stage_code

# ── Task 12 cases ─────────────────────────────────────────────────────────

# Case G: bare [quick] without rationale → BLOCK (Task 12)
reset_state; set_counter 3
COMMIT_MSG="'[quick] typo'"
run_case "G: bare [quick] (no rationale) → BLOCK" 2 stage_code

# Case H: [quick: short] rationale <15 chars → BLOCK
reset_state; set_counter 3
COMMIT_MSG="'[quick: tiny]'"
run_case "H: [quick: tiny] under 15 chars → BLOCK" 2 stage_code

# Case I: [hotfix] without ticket → BLOCK
reset_state; set_counter 3
COMMIT_MSG="'[hotfix] emergency'"
run_case "I: bare [hotfix] (no ticket) → BLOCK" 2 stage_code

# Case J: [hotfix: #42 fix] → ALLOW (ticket present)
reset_state; set_counter 3
COMMIT_MSG="'[hotfix: #42 urgent auth regression]'"
run_case "J: [hotfix: #42 …] ticket → ALLOW" 0 stage_code

# Case K: [hotfix: no-ticket: <reason ≥15>] → ALLOW
reset_state; set_counter 3
COMMIT_MSG="'[hotfix: no-ticket: customer-reported 500 on payment flow]'"
run_case "K: [hotfix: no-ticket: …] explicit justification → ALLOW" 0 stage_code

# ── D3 regression: exempt short-circuit + intentional tag match ────────────

# Case L: memory-only commit whose message MENTIONS a tag in prose → ALLOW.
# (Old bug: the override regex grepped the whole command string, so a prose
#  mention of [no-dev: x] — reason <15 chars — hard-blocked an exempt commit.)
reset_state
COMMIT_MSG="'note explaining the [no-dev: x] override tag for future readers'"
run_case "L: memory-only + prose tag mention → ALLOW (exempt)" 0 stage_memory

# Case M: memory-only, no tag at all → ALLOW
reset_state
run_case "M: memory-only + no tag → ALLOW (exempt)" 0 stage_memory

# Case N: .claude-only commit → ALLOW
reset_state
run_case "N: .claude-only → ALLOW (exempt)" 0 stage_claude

# Case O: code commit under anti-reset penalty (OVERRIDE_DISABLED) carrying a
# real LEADING override tag → BLOCK. Seed 3 consecutive override cycles so
# consecutive_override_tail ≥ 3 flips OVERRIDE_DISABLED=true.
reset_state; set_counter 3
mkdir -p "$(dirname "$CYCLES_FILE")"
_now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
{
  printf '{"ts":"%s","outcome":"allow-override","tag":"[quick]","counter":0}\n' "$_now"
  printf '{"ts":"%s","outcome":"allow-override","tag":"[quick]","counter":0}\n' "$_now"
  printf '{"ts":"%s","outcome":"allow-override","tag":"[quick]","counter":0}\n' "$_now"
} > "$CYCLES_FILE"
COMMIT_MSG="'[no-dev: real infra change, but override path is locked now]'"
run_case "O: code + penalty + real leading tag → BLOCK (penalty)" 2 stage_code

# Case P: code commit with a valid LEADING tag, no penalty → ALLOW *and* a
# cycle must be appended to the anti-reset log (feeds cycles_last_hour).
reset_state; set_counter 3
COMMIT_MSG="'[quick: legitimate small fix with enough rationale text]'"
run_case "P: code + valid leading tag, no penalty → ALLOW" 0 stage_code
if grep -q '"outcome":"allow-override"' "$CYCLES_FILE" 2>/dev/null; then
  echo "  ✓ P-state: allow-override cycle appended"
  PASS=$((PASS + 1))
else
  echo "  ✗ P-state: expected allow-override cycle in cycle log"
  FAIL=$((FAIL + 1))
  FAIL_DETAILS="${FAIL_DETAILS}\n  - P-state: no allow-override cycle appended"
fi

# Case Q: code commit whose message mentions a tag only MID-SENTENCE → NOT an
# override; control falls to the normal edit-budget block (count 3, no /dev
# marker) → BLOCK.
reset_state; set_counter 3
COMMIT_MSG="'fix the [no-dev: handling] path in the commit parser code'"
run_case "Q: code + mid-sentence tag mention → BLOCK (not an override)" 2 stage_code

echo ""
echo "Results: $PASS passed, $FAIL failed"
reset_state
if [ "$FAIL" -gt 0 ]; then
  echo -e "Failures:${FAIL_DETAILS}"
  exit 1
fi
exit 0
