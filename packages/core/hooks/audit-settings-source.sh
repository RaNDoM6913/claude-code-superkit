#!/bin/bash
# audit-settings-source.sh — CVE-2025-59536 mitigation.
# Triggers on: SessionStart
# Profile: standard, strict (skipped on fast for startup speed)
#
# A malicious `.claude/settings.json` committed to an untrusted repo can
# register a PreToolUse hook that runs arbitrary code on every tool call,
# effectively an RCE on session open. Reference:
#   research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-
#     claude-code-project-files-cve-2025-59536/
#
# This hook inspects .claude/settings.json in the current project:
# - If the file exists AND was last touched by an author who is NOT the
#   current git user OR was modified by ANY author in the last 7 days
#   (likely a recent pull from an untrusted branch), print a loud warning
#   to stderr AND touch ${TMPDIR:-/tmp}/claude-untrusted-settings-${SESSION}
#   so downstream hooks can downgrade decisions.
# - Fails open (exit 0) in every path — this is a warning, not a block.
# Opt-out: CLAUDE_DISABLE_SETTINGS_AUDIT=1

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ] || [ "${CLAUDE_DISABLE_SETTINGS_AUDIT:-}" = "1" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SETTINGS="$PROJECT_DIR/.claude/settings.json"

# Only run inside a git repo with a settings.json to audit
if [ ! -f "$SETTINGS" ] || ! git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

# Identify current git user (trusted author)
MY_EMAIL=$(git -C "$PROJECT_DIR" config user.email 2>/dev/null)
if [ -z "$MY_EMAIL" ]; then
  # If we can't identify the user we can't classify foreignness — skip.
  exit 0
fi

# Look at the last 10 commits touching .claude/settings.json
LAST_COMMITS=$(git -C "$PROJECT_DIR" log --format='%H|%ae|%ct' -n 10 -- .claude/settings.json 2>/dev/null)
if [ -z "$LAST_COMMITS" ]; then
  # File exists but untracked — treat as trusted (user placed it manually).
  exit 0
fi

NOW=$(date +%s)
SEVEN_DAYS=$((7 * 24 * 3600))
FOREIGN_RECENT=""
while IFS='|' read -r sha email ts; do
  [ -z "$sha" ] && continue
  AGE=$((NOW - ts))
  if [ "$email" != "$MY_EMAIL" ] && [ "$AGE" -lt "$SEVEN_DAYS" ]; then
    FOREIGN_RECENT="${FOREIGN_RECENT}    - ${sha:0:8} by ${email} ($((AGE / 86400))d ago)\n"
  fi
done <<< "$LAST_COMMITS"

if [ -z "$FOREIGN_RECENT" ]; then
  exit 0
fi

# Touch marker so downstream hooks can consult it
INPUT=$(cat 2>/dev/null || echo '')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
MARKER="${TMPDIR:-/tmp}/claude-untrusted-settings-${SESSION_KEY}"
touch "$MARKER"

cat >&2 <<EOF

────────────────────────────────────────────────────────────────────
⚠ SECURITY WARNING — .claude/settings.json was modified recently by
  someone other than you. This file controls what hooks run on every
  tool call. A malicious settings.json in an untrusted repo can
  execute arbitrary code (CVE-2025-59536).

  Recent foreign commits touching .claude/settings.json:
$(echo -e "$FOREIGN_RECENT")
  Actions:
    1. Review the diff: git log -p .claude/settings.json
    2. If anything looks off, open Claude Code with --no-hooks until
       you've vetted the file.
    3. To silence this warning: CLAUDE_DISABLE_SETTINGS_AUDIT=1

  Reference: https://research.checkpoint.com/2026/
    rce-and-api-token-exfiltration-through-claude-code-project-files-
    cve-2025-59536/
────────────────────────────────────────────────────────────────────

EOF
exit 0
