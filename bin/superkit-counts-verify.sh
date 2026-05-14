#!/bin/sh
# bin/superkit-counts-verify.sh — convenience wrapper
#
# Forwards to the canonical hook at packages/core/hooks/superkit-counts-verify.sh.
# The canonical path is wired into .claude/settings.json as a PreToolUse hook;
# this wrapper exists so contributors can run the same check manually from
# the repo root via `bash bin/superkit-counts-verify.sh` without remembering
# the full hook path.
#
# Behaviour is identical — both stdin payload (PreToolUse JSON) and exit code
# are passed through.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$REPO_ROOT/packages/core/hooks/superkit-counts-verify.sh"

if [ ! -f "$HOOK" ]; then
  printf 'Error: canonical hook missing at %s\n' "$HOOK" >&2
  exit 1
fi

# If invoked with no stdin (interactive run) synthesise an empty git-commit
# payload so the hook actually runs its checks instead of returning exit 0
# on "not a commit" early-out.
if [ -t 0 ]; then
  printf '{"tool_input":{"command":"git commit -m verify"}}' | exec bash "$HOOK"
else
  exec bash "$HOOK"
fi
