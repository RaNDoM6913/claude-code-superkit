#!/bin/bash
# profile.sh — shared helper for hook strictness + disable logic
# Source at the top of every hook:
#   source "$(dirname "$0")/lib/profile.sh"
#   should_skip_hook "$(basename "$0" .sh)" && exit 0

should_skip_hook() {
  local hook_name="$1"

  # Explicit disable list takes precedence over everything
  local disabled="${CLAUDE_DISABLED_HOOKS:-}"
  if [ -n "$disabled" ]; then
    local IFS=','
    for item in $disabled; do
      # Trim whitespace
      item="${item## }"
      item="${item%% }"
      [ "$item" = "$hook_name" ] && return 0
    done
  fi

  # fast profile: skip everything except critical safety hooks
  local profile="${CLAUDE_HOOK_PROFILE:-standard}"
  if [ "$profile" = "fast" ]; then
    case "$hook_name" in
      block-dangerous-git|security-patterns|audit-settings-source|doc-check-on-commit)
        return 1
        ;;
      *)
        return 0
        ;;
    esac
  fi

  return 1
}

# Keep the function available to sourcing scripts.
export -f should_skip_hook 2>/dev/null || true

# Canonical per-session key: prefer Claude Code session_id, then hook PID, then PPID.
# Use for any TMPDIR state file that must accumulate across hook invocations in a session.
superkit_session_key() {
  printf '%s' "${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
}
export -f superkit_session_key 2>/dev/null || true
