#!/bin/bash
# subagent-stop-validate_test.sh — regression test for subagent-stop-validate.sh
# Pipes SubagentStop payloads shaped like the agents' Output Contracts into
# the hook and asserts on its advisory stderr (the hook always exits 0).
set -uo pipefail

HOOK="$(cd "$(dirname "$0")/.." && pwd)/subagent-stop-validate.sh"
[ -x "$HOOK" ] || { echo "FAIL: hook not executable at $HOOK"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "FAIL: jq required"; exit 1; }

unset CLAUDE_DISABLED_HOOKS CLAUDE_DISABLE_SUBAGENT_VALIDATE
export CLAUDE_HOOK_PROFILE=standard

PASS=0
FAIL=0

# fire <agent_type> <message> [event] — prints the hook's stderr; fails on non-zero exit
fire() {
  local agent="$1" msg="$2" event="${3:-SubagentStop}" out rc
  out=$(jq -cn --arg e "$event" --arg a "$agent" --arg m "$msg" \
    '{hook_event_name:$e, agent_type:$a, last_assistant_message:$m}' | "$HOOK" 2>&1 >/dev/null)
  rc=$?
  [ "$rc" -eq 0 ] || out="NONZERO_EXIT($rc) $out"
  printf '%s' "$out"
}

expect_silent() {
  local name="$1" out="$2"
  if [ -z "$out" ]; then
    echo "PASS: $name"; PASS=$((PASS + 1))
  else
    echo "FAIL: $name — expected no warning, got: $out"; FAIL=$((FAIL + 1))
  fi
}

expect_warn() {
  local name="$1" out="$2" needle="$3"
  if printf '%s' "$out" | grep -q "^\[subagent-stop-validate\]" && printf '%s' "$out" | grep -qF -- "$needle" \
     && ! printf '%s' "$out" | grep -q "NONZERO_EXIT"; then
    echo "PASS: $name"; PASS=$((PASS + 1))
  else
    echo "FAIL: $name — expected warning containing '$needle', got: ${out:-<nothing>}"; FAIL=$((FAIL + 1))
  fi
}

# ---------------------------------------------------------------- reviewers
CLEAN='## Review Report
Coverage: COMPLETE
### Findings
none
### Summary
clean; 0 open questions — mergeable.'
expect_silent "reviewer: clean report" "$(fire code-reviewer "$CLEAN")"

COUNT_ONLY='### Summary
0 CRITICAL, 0 WARNING — nothing to fix; CRITICAL paths were all read.'
expect_silent "reviewer: bare word CRITICAL (no tag) is silent" "$(fire go-reviewer "$COUNT_ONLY")"

CRIT='### Findings
[CRITICAL/HIGH] src/orders/routes.ts:41 — cancel route checks sign-in, not order ownership
  Evidence: req.params.id goes straight to orders.cancel()
  Fix: load the order; return 404 unless order.customerId === req.user.id

### Summary
1 finding (1 CRITICAL); 0 open questions — not mergeable.'
expect_warn "reviewer: [CRITICAL/HIGH] finding warns" "$(fire code-reviewer "$CRIT")" "1 CRITICAL finding(s)"

INCIDENTAL='### Findings
[CRITICAL/HIGH] internal/repo/user.go:42 — sort column formatted into SQL text
  Evidence: a fixed allowlist exists in sort.go but is unused; the fixed column list is bypassed; deferred cleanup unrelated; caller unresolved
  Fix: map the column through the allowlist
Coverage: vendor/ out of scope'
expect_warn "reviewer: incidental fixed/unresolved/deferred/out of scope do not silence" "$(fire go-reviewer "$INCIDENTAL")" "CRITICAL"

ACK_TOKEN='### Findings
[CRITICAL/HIGH] src/store/blob.rs:58 — safe read_chunk lets callers read past the buffer
  Fix: bounds-check offset + len
  Status: FIXED in the follow-up commit'
expect_silent "reviewer: FIXED status token in the finding block silences" "$(fire rs-reviewer "$ACK_TOKEN")"

ACK_LABEL='[CRITICAL/MEDIUM] api/routes/orders.py:31 — permission check never awaited (needs verification)
  Evidence: coroutine object is truthy
  Acknowledged: accepted for the internal-only admin build, ADR-7'
expect_silent "reviewer: labelled Acknowledged: line silences" "$(fire py-reviewer "$ACK_LABEL")"

NEG='[CRITICAL/HIGH] src/a.ts:1 — token logged in plain text
  Status: NOT FIXED'
expect_warn "reviewer: NOT FIXED is not an acknowledgement" "$(fire ts-reviewer "$NEG")" "1 CRITICAL finding(s)"

MIXED='### Findings
[CRITICAL/HIGH] src/a.ts:1 — first defect
  Status: DEFERRED to TASK-9 (owner decision)
[CRITICAL/HIGH] src/b.ts:2 — second defect
  Fix: escape the value

### Open Questions
- src/c.ts:3 — earlier question RESOLVED by the new test'
expect_warn "reviewer: ack applies per finding; ack elsewhere does not silence" "$(fire code-reviewer "$MIXED")" "1 CRITICAL finding(s)"

INCID_STATUS='[CRITICAL/HIGH] db/migrations/001.sql:4 — FK created DEFERRABLE INITIALLY DEFERRED lets orphan rows commit
  Fix: this MUST be FIXED before release'
expect_warn "reviewer: uppercase DEFERRED/FIXED inside evidence or fix text does not silence" "$(fire code-reviewer "$INCID_STATUS")" "1 CRITICAL finding(s)"

SPACED='[CRITICAL / HIGH] api/auth.go:9 — session token logged'
expect_warn "security: spaced [CRITICAL / HIGH] tag warns" "$(fire security-scanner "$SPACED")" "CRITICAL security finding"

BRACKET='[CRITICAL] cmd/main.go:10 — panics on empty config'
expect_warn "reviewer: [CRITICAL] bracket form warns" "$(fire go-reviewer "$BRACKET")" "CRITICAL"

WARN_HIGH='[WARNING/HIGH] src/a.ts:1 — missing await
  Fix: await it'
expect_silent "reviewer: [WARNING/HIGH] is silent" "$(fire code-reviewer "$WARN_HIGH")"

# ----------------------------------------------------------------- security
SEC_WARN='### Findings
[WARNING/HIGH] [CHECK-07] internal/http/users.go:31 — missing rate limit
### Risk Summary
1 WARNING — 36 checks: 30 done, 2 partial, 1 unverified, 3 N/A
### Posture
No CRITICAL path found.'
expect_silent "security: [WARNING/HIGH] and bare CRITICAL prose are silent" "$(fire security-scanner "$SEC_WARN")"

SEC_CRIT='[CRITICAL/HIGH] [CHECK-26] internal/store/users.go:42 — search term concatenated into SQL'
expect_warn "security: [CRITICAL/HIGH] warns" "$(fire security-scanner "$SEC_CRIT")" "CRITICAL security finding"

RB_RECO='### Recommendations (prioritized)
1. [CRITICAL] .claude/settings.json:5 — remove the allow entry — fix immediately'
expect_warn "red-blue: [CRITICAL] recommendation warns" "$(fire red-blue-auditor "$RB_RECO")" "CRITICAL security finding"

# ----------------------------------------------------------- test generators
TG_FAIL='## Test Generation Report
Generated 9 tests in 1 file — Result: FAIL
Execution: go test -count=1 -v -run '"'"'^(TestCancel)$'"'"' ./internal/order/ → exit 1; 9 collected, 8 passed, 1 failed, 0 skipped; rerun: same; side effects: none'
expect_silent "test-generator: FAIL with Execution exit line is silent" "$(fire test-generator "$TG_FAIL")"

TG_VITEST='## Test Generation Report
Generated 4 tests in 1 file — Result: PASS
Execution: npx --no -- vitest run src/cart.test.ts → exit 0; 4 collected, 4 passed, 0 failed, 0 skipped; rerun: same; side effects: none'
expect_silent "test-generator: vitest PASS with Execution exit line is silent" "$(fire test-generator "$TG_VITEST")"

TG_NOTRUN_GO='## Test Generation Report
Generated 3 tests in 1 file — Result: NOT RUN
Execution: NOT RUN — go test -count=1 -tags=integration ./internal/store/; Postgres not reachable'
expect_warn "test-generator: NOT RUN naming go test warns" "$(fire test-generator "$TG_NOTRUN_GO")" "Result: NOT RUN"

TG_ZERO='## Test Generation Report
Generated 0 tests in 0 files — Result: NOT RUN
Execution: NOT RUN — nothing to run; NOT FOUND: internal/missing.go'
expect_silent "test-generator: Generated 0 tests is silent" "$(fire test-generator "$TG_ZERO")"

TG_ONE='## Test Generation Report
Generated 1 test in 1 file — Result: NOT RUN
Execution: NOT RUN — cargo test --lib parser; toolchain missing'
expect_warn "test-generator: singular 'Generated 1 test' is checked" "$(fire test-generator "$TG_ONE")" "1 test(s) generated"

TG_PROSE='## E2E Test Generation Report
Generated 2 tests in 1 file — Result: NOT RUN
Execution: NOT RUN — npx --no -- playwright test e2e/items.spec.ts; running it needs browsers; a failed install is not ours to fix
Coverage: PARTIAL — pass/fail unknown'
expect_warn "e2e-test-generator: prose running/fail/pass does not silence NOT RUN" "$(fire e2e-test-generator "$TG_PROSE")" "Result: NOT RUN"

TG_PASS_NOEXEC='## Test Generation Report
Generated 5 tests in 2 files — Result: PASS
Coverage: COMPLETE'
expect_warn "test-generator: PASS without Execution exit line warns" "$(fire test-generator "$TG_PASS_NOEXEC")" "no 'Execution:"

TG_NO_RESULT='## Test Generation Report
Generated 5 tests in 2 files
Execution: pytest tests/test_cart.py → exit 0; 5 passed'
expect_warn "test-generator: line 2 without Result warns" "$(fire test-generator "$TG_NO_RESULT")" "no 'Result:"

TG_NO_LINE='NOT FOUND: internal/missing.go — nothing to test'
expect_silent "test-generator: no Generated line is silent" "$(fire test-generator "$TG_NO_LINE")"

# ------------------------------------------------------------------ gating
expect_silent "opt-out CLAUDE_DISABLE_SUBAGENT_VALIDATE=1" "$(CLAUDE_DISABLE_SUBAGENT_VALIDATE=1 fire code-reviewer "$CRIT")"
expect_silent "fast profile skips" "$(CLAUDE_HOOK_PROFILE=fast fire code-reviewer "$CRIT")"
expect_silent "non-SubagentStop event ignored" "$(fire code-reviewer "$CRIT" Stop)"
expect_silent "unlisted agent type ignored" "$(fire docs-reviewer "$CRIT")"

echo ""
echo "subagent-stop-validate: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
