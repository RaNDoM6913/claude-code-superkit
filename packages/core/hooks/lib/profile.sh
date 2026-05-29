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

# superkit_advise <message> — emit a warn-only PreToolUse advisory as JSON
# `hookSpecificOutput.additionalContext` on stdout so it reaches the model.
# Claude Code can swallow non-blocking PreToolUse stderr; stdout JSON is the
# reliable channel for advisory context (ECC-inspired). Callers that also
# print to stderr (for human-readable transcript logs) should additionally
# call this so the model actually sees the reminder. Prefer jq (every hook in
# this kit already assumes jq is on PATH); fall back to a manually-escaped
# printf only if jq is unavailable, so the hook never emits invalid JSON.
superkit_advise() {
  local msg="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -cn --arg m "$msg" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$m}}'
  else
    # Minimal JSON string escaping: backslash, double-quote, then control chars.
    local esc="$msg"
    esc="${esc//\\/\\\\}"
    esc="${esc//\"/\\\"}"
    esc="${esc//$'\t'/\\t}"
    esc="${esc//$'\r'/\\r}"
    esc="${esc//$'\n'/\\n}"
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$esc"
  fi
}
export -f superkit_advise 2>/dev/null || true

# superkit_should_emit_advisory <message> — per-session dedup/throttle for
# noisy ADVISORY hooks (Opus 4.8 self-flags, so repeated nudges are noise).
#   returns 0 → emit (first time, or window elapsed)
#   returns 1 → suppress (identical advisory already emitted within window)
# Keyed on superkit_session_key + a hash of the message, with a sliding
# N-minute window (CLAUDE_NUDGE_WINDOW_MIN, default 10). Setting the window
# to 0 disables throttling entirely (always emit). On success it records the
# emit time so the NEXT identical call within the window is suppressed.
#
# Scope note: this throttles advisory FREQUENCY only. It must never be used to
# suppress or filter reviewer findings — that is a separate layer. Use it only
# in nudge/advisory hooks (edit-streak, gateguard advisory, behavioral nudges).
superkit_should_emit_advisory() {
  local msg="$1"
  local window_min="${CLAUDE_NUDGE_WINDOW_MIN:-10}"

  # Non-numeric window → fall back to default; 0 → throttling disabled.
  case "$window_min" in (*[!0-9]*|"") window_min=10 ;; esac
  [ "$window_min" = "0" ] && return 0

  local window_sec=$((window_min * 60))
  local now
  now=$(date +%s)

  # Hash the message for a compact, collision-resistant key.
  local hash
  if command -v shasum >/dev/null 2>&1; then
    hash=$(printf '%s' "$msg" | shasum -a 256 | cut -d' ' -f1)
  elif command -v sha256sum >/dev/null 2>&1; then
    hash=$(printf '%s' "$msg" | sha256sum | cut -d' ' -f1)
  else
    # Last resort: cksum (weaker, but keeps the helper functional).
    hash=$(printf '%s' "$msg" | cksum | tr -d ' ')
  fi

  local state_file="${SUPERKIT_NUDGE_STATE:-${TMPDIR:-/tmp}/superkit-nudge-$(superkit_session_key)}"

  # Look up last emit time for this hash; suppress if still inside the window.
  if [ -f "$state_file" ]; then
    local last_epoch
    last_epoch=$(grep -E "^${hash} " "$state_file" 2>/dev/null | tail -1 | cut -d' ' -f2)
    case "$last_epoch" in (*[!0-9]*|"") last_epoch="" ;; esac
    if [ -n "$last_epoch" ] && [ "$last_epoch" -le "$now" ] \
       && [ "$((now - last_epoch))" -lt "$window_sec" ]; then
      return 1
    fi
  fi

  # Record this emit. Drop the prior line for this hash, append the fresh one,
  # then atomically replace. Also prune entries older than the window so the
  # file can't grow unbounded over a long session.
  local tmp="${state_file}.$$.${now}"
  {
    if [ -f "$state_file" ]; then
      while IFS=' ' read -r h e _; do
        [ -z "$h" ] && continue
        [ "$h" = "$hash" ] && continue
        case "$e" in (*[!0-9]*|"") continue ;; esac
        [ "$((now - e))" -ge "$window_sec" ] && continue
        printf '%s %s\n' "$h" "$e"
      done < "$state_file"
    fi
    printf '%s %s\n' "$hash" "$now"
  } > "$tmp" 2>/dev/null && mv -f "$tmp" "$state_file" 2>/dev/null
  # Fail-open: if the state write failed we still emit (return 0).
  return 0
}
export -f superkit_should_emit_advisory 2>/dev/null || true
