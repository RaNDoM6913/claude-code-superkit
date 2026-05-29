#!/usr/bin/env bash
# audit-trail-chain_test.sh — verify that concurrent sessions get separate
# .last-hash-<session> files rather than fighting over a single .last-hash.
#
# AUDIT_DIR is hard-coded as "$HOME/.claude/audit" inside audit-trail.sh,
# so we override HOME to a temp directory for hermeticity.
set -u

HOOK="$(cd "$(dirname "$0")/.." && pwd)/audit-trail.sh"

# Point HOME at a temp dir so audit-trail.sh writes there, not ~/.claude/audit
FAKE_HOME=$(mktemp -d)
AUDIT_DIR="$FAKE_HOME/.claude/audit"

cleanup() { rm -rf "$FAKE_HOME"; }
trap cleanup EXIT

# Emit one audit event for session $1.
# audit-trail.sh derives SESSION_KEY from the payload's .session_id field;
# the SESSION_ID env var is only consulted as a fallback when the payload
# omits .session_id. Here the payload always carries .session_id, so that
# value (not any env var) drives the per-session hash file.
emit() {
  local sid="$1"
  printf '%s' \
    '{"session_id":"'"$sid"'","tool_name":"Edit","tool_input":{"file_path":"x.txt"}}' \
    | HOME="$FAKE_HOME" bash "$HOOK" >/dev/null 2>&1
}

# Interleave two sessions: A, B, A, B
emit "sessA"
emit "sessB"
emit "sessA"
emit "sessB"

# Each session must have its own per-session hash file
FILE_A="$AUDIT_DIR/.last-hash-sessA"
FILE_B="$AUDIT_DIR/.last-hash-sessB"
GLOBAL="$AUDIT_DIR/.last-hash"

PASS=1

if [ ! -f "$FILE_A" ]; then
  echo "FAIL: missing $FILE_A"
  PASS=0
fi
if [ ! -f "$FILE_B" ]; then
  echo "FAIL: missing $FILE_B"
  PASS=0
fi
if [ -f "$GLOBAL" ]; then
  echo "FAIL: global .last-hash still exists (should have been replaced by per-session files)"
  PASS=0
fi

if [ "$PASS" -eq 1 ]; then
  echo "PASS: per-session hash chains (.last-hash-sessA, .last-hash-sessB)"
  exit 0
else
  echo "Files in audit dir: $(ls -a "$AUDIT_DIR" 2>/dev/null | tr '\n' ' ')"
  exit 1
fi
