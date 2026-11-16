#!/bin/bash
# subagent-stop-validate.sh — per-agent post-run validation
# Triggers on: SubagentStop
# Profile: standard, strict
#
# When a reviewer / security / test subagent finishes, peek at
# `last_assistant_message` (already in the payload — no transcript
# parsing needed) and:
#   - `go-reviewer` / `ts-reviewer` / `py-reviewer` / `rs-reviewer` /
#     `code-reviewer` → warn when a finding carries a CRITICAL severity tag
#     (`[CRITICAL/<confidence>]` or `[CRITICAL]`) and that finding — its tag
#     line plus the indented lines under it — has no explicit acknowledgement:
#     a "Status:" line whose value starts with ACKNOWLEDGED / FIXED / RESOLVED /
#     DEFERRED / WAIVED, or a labelled line `Acknowledged:`,
#     `Fixed:`, `Resolved:`, `Deferred:`, `Waived:`, `Will fix:`.
#     The bare word CRITICAL (summary counts, prose) never triggers.
#   - `security-scanner` / `red-blue-auditor` → warn on any CRITICAL severity
#     tag (`[CRITICAL/…]` or `[CRITICAL]`). Confidence HIGH (`[WARNING/HIGH]`)
#     never triggers. Advisory here, not a block — a full block would need a
#     session-global acknowledgement workflow.
#   - `test-generator` / `e2e-test-generator` → key on the report's line-2
#     contract `Generated <N> test(s) … — Result: <PASS | FAIL | NOT RUN>`:
#     N > 0 with Result NOT RUN or no Result → warn (tests not executed);
#     PASS / FAIL without an `Execution: … exit <code>` line → warn (claimed
#     run, no evidence). No `Generated N test(s)` line, or N = 0 → silent.
#
# This is always advisory (exit 0). Blocking the parent session
# requires a heavier follow-up (Task 16 v2) to give the user a way
# to acknowledge findings.
#
# Opt-out: CLAUDE_DISABLE_SUBAGENT_VALIDATE=1

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_SUBAGENT_VALIDATE:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
[ "$EVENT" = "SubagentStop" ] || exit 0

AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty' 2>/dev/null)
MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null)
[ -z "$AGENT_TYPE" ] || [ -z "$MSG" ] && exit 0

warn() {
  # Print to stderr with a consistent banner
  printf '\n[subagent-stop-validate] %s: %s\n' "$AGENT_TYPE" "$1" >&2
}

# Severity tag of a finding: [CRITICAL/HIGH], [CRITICAL/MEDIUM], [CRITICAL].
# Bash 3.2-compatible ERE (macOS /bin/bash); `]` first in a bracket is literal.
CRIT_TAG_RE='\[[[:space:]]*CRITICAL[[:space:]]*[]/]'
ACK_STATUS_RE='^[[:space:]]*([-*][[:space:]]+)?[Ss]tatus[[:space:]]*:[[:space:]]*(ACKNOWLEDGED|FIXED|RESOLVED|DEFERRED|WAIVED)([^A-Za-z_]|$)'
ACK_LABEL_RE='^[[:space:]]*([-*][[:space:]]+)?([Aa]cknowledged|[Ff]ixed|[Rr]esolved|[Dd]eferred|[Ww]aived|[Ww]ill fix)[[:space:]]*:'

# is_ack_line <line> — explicit acknowledgement on this line?
is_ack_line() {
  [[ $1 =~ $ACK_LABEL_RE ]] || [[ $1 =~ $ACK_STATUS_RE ]]
}

# count_unacked_critical — number of CRITICAL-tagged findings in $MSG whose
# block (tag line + following indented lines) carries no acknowledgement.
count_unacked_critical() {
  local line in_block=0 block_ack=0 unacked=0
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ $line =~ $CRIT_TAG_RE ]]; then
      [ "$in_block" -eq 1 ] && [ "$block_ack" -eq 0 ] && unacked=$((unacked + 1))
      in_block=1
      block_ack=0
      is_ack_line "$line" && block_ack=1
    elif [ "$in_block" -eq 1 ] && [[ $line =~ ^[[:space:]]+[^[:space:]] ]]; then
      is_ack_line "$line" && block_ack=1
    else
      [ "$in_block" -eq 1 ] && [ "$block_ack" -eq 0 ] && unacked=$((unacked + 1))
      in_block=0
    fi
  done <<< "$MSG"
  [ "$in_block" -eq 1 ] && [ "$block_ack" -eq 0 ] && unacked=$((unacked + 1))
  echo "$unacked"
}

case "$AGENT_TYPE" in
  go-reviewer|ts-reviewer|py-reviewer|rs-reviewer|code-reviewer)
    if printf '%s\n' "$MSG" | grep -qE "$CRIT_TAG_RE"; then
      UNACKED=$(count_unacked_critical)
      if [ "${UNACKED:-0}" -gt 0 ]; then
        warn "$UNACKED CRITICAL finding(s) not acknowledged / fixed / deferred. Review recommended before proceeding."
      fi
    fi
    ;;
  security-scanner|red-blue-auditor)
    # Severity tag only — confidence "HIGH" (e.g. "[WARNING/HIGH]") and the
    # bare word CRITICAL in counts or prose must not trigger this.
    if printf '%s\n' "$MSG" | grep -qE "$CRIT_TAG_RE"; then
      warn "CRITICAL security finding reported. Do NOT merge until resolved or explicitly waived."
    fi
    ;;
  test-generator|e2e-test-generator)
    # Line-2 contract: "Generated <N> tests in <M> files — Result: <PASS | FAIL | NOT RUN>"
    GEN_LINE=$(printf '%s\n' "$MSG" | grep -m1 -E 'Generated [0-9]+ tests?[^A-Za-z].*Result:')
    [ -n "$GEN_LINE" ] || GEN_LINE=$(printf '%s\n' "$MSG" | grep -m1 -E 'Generated [0-9]+ tests?([^A-Za-z]|$)')
    [ -n "$GEN_LINE" ] || exit 0
    N=$(printf '%s\n' "$GEN_LINE" | sed -E 's/.*Generated ([0-9]+) tests?.*/\1/')
    case "$N" in ''|*[!0-9]*) exit 0 ;; esac
    [ "$N" -gt 0 ] || exit 0
    RESULT=$(printf '%s\n' "$GEN_LINE" | grep -oE 'Result:[*_`[:space:]]*(PASS|FAIL|NOT RUN)' | head -1 | sed -E 's/^Result:[*_`[:space:]]*//')
    case "$RESULT" in
      PASS|FAIL)
        if ! printf '%s\n' "$MSG" | grep -qE '(^|[^A-Za-z])Execution[*_`]*:.*exit([[:space:]]+code)?[[:space:]]+[0-9]+'; then
          warn "Result: $RESULT reported for $N generated test(s), but no 'Execution: <command> → exit <code>' line shows the run. Run them before committing."
        fi
        ;;
      "NOT RUN")
        warn "$N test(s) generated but Result: NOT RUN — they were not executed. Run them before committing."
        ;;
      *)
        warn "$N test(s) generated but line 2 has no 'Result: PASS | FAIL | NOT RUN' — no evidence they were executed. Run them before committing."
        ;;
    esac
    ;;
esac

exit 0
