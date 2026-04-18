#!/bin/bash
# subagent-stop-validate.sh — per-agent post-run validation
# Triggers on: SubagentStop
# Profile: standard, strict
#
# When a reviewer / security / test subagent finishes, peek at
# `last_assistant_message` (already in the payload — no transcript
# parsing needed) and:
#   - `go-reviewer` / `ts-reviewer` / `py-reviewer` / `rs-reviewer`
#     → warn if `CRITICAL` or `SEVERITY: CRITICAL` markers exist
#       that were not followed by "acknowledged" / "fixed" / "will fix"
#   - `security-scanner` / `red-blue-auditor` → warn on any HIGH / CRITICAL
#     severity finding (advisory here, not a block — a full block would
#     need a session-global acknowledgement workflow)
#   - `test-generator` → warn if the final message contains
#     "Generated N tests" but no evidence the tests were actually run
#     (no "pass" / "PASS" / "FAIL" / "running" / "go test" in output)
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

case "$AGENT_TYPE" in
  go-reviewer|ts-reviewer|py-reviewer|rs-reviewer|code-reviewer)
    # CRITICAL finding without an acknowledgement?
    if printf '%s' "$MSG" | grep -qE '(CRITICAL|SEVERITY:\s*CRITICAL|severity:\s*CRITICAL)'; then
      if ! printf '%s' "$MSG" | grep -qiE 'acknowledg|will fix|fixed|resolved|deferr|out of scope'; then
        warn "CRITICAL findings present but not acknowledged / fixed / deferred. Review recommended before proceeding."
      fi
    fi
    ;;
  security-scanner|red-blue-auditor|audit-security)
    if printf '%s' "$MSG" | grep -qE '(HIGH|CRITICAL|SEVERITY:\s*(HIGH|CRITICAL))'; then
      warn "HIGH or CRITICAL security finding reported. Do NOT merge until resolved or explicitly waived."
    fi
    ;;
  test-generator|playwright-test-generator)
    if printf '%s' "$MSG" | grep -qiE 'Generated [0-9]+ tests'; then
      if ! printf '%s' "$MSG" | grep -qiE '(\b(pass|fail|running|go test|npm test|pytest|cargo test|PASS|FAIL)\b|tests? (ran|passed|failed))'; then
        warn "Tests were generated but there is no evidence they were executed. Run them before committing."
      fi
    fi
    ;;
esac

exit 0
