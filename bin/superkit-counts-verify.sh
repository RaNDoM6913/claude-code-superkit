#!/bin/sh
# bin/superkit-counts-verify.sh — convenience wrapper
#
# Forwards to the canonical hook at packages/core/hooks/superkit-counts-verify.sh.
# The canonical path is wired into .claude/settings.json as a PreToolUse hook;
# this wrapper exists so contributors can run the same check manually from
# the repo root via `bash bin/superkit-counts-verify.sh` without remembering
# the full hook path.
#
# CLI args (e.g. --check-remote, which verifies the GitHub About description
# over the network) are forwarded to the canonical hook.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK="$REPO_ROOT/packages/core/hooks/superkit-counts-verify.sh"

if [ ! -f "$HOOK" ]; then
  printf 'Error: canonical hook missing at %s\n' "$HOOK" >&2
  exit 1
fi

# This convenience wrapper is for MANUAL runs from the repo root. It always
# synthesises a git-commit payload so the canonical hook runs its count/version
# checks (instead of early-exiting "not a commit"). It deliberately does NOT
# read stdin: a previous `[ -t 0 ]` check fell through to reading stdin in
# non-interactive contexts (CI, detached/backgrounded shells) where stdin has
# no TTY and no EOF, hanging forever — and silently no-op'd (early-exit) when
# stdin EOF'd empty. To feed a real PreToolUse payload, invoke the canonical
# hook ($HOOK) directly; it reads stdin as normal.
printf '{"tool_input":{"command":"git commit -m verify"}}' | exec bash "$HOOK" "$@"
