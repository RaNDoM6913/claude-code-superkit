#!/usr/bin/env bash
# Regression: [wip] commit on main must be BLOCKED (exit 2).
set -u
HOOK="$(cd "$(dirname "$0")/.." && pwd)/dev-required-on-commit.sh"
TMP=$(mktemp -d); cd "$TMP"
git init -q && git -c user.email=t@t -c user.name=t checkout -q -b main
git -c user.email=t@t -c user.name=t commit -q --allow-empty -m "init"
echo "x" > a.txt && git add a.txt

PAYLOAD='{"tool_name":"Bash","tool_input":{"command":"git commit -m \"[wip] x\""}}'
OUT=$(printf '%s' "$PAYLOAD" | bash "$HOOK" 2>&1); RC=$?

if [ "$RC" -eq 2 ] && printf '%s' "$OUT" | grep -q "not allowed on main"; then
  echo "PASS: [wip] on main blocked"; cd /; rm -rf "$TMP"; exit 0
else
  echo "FAIL: rc=$RC out=$OUT"; cd /; rm -rf "$TMP"; exit 1
fi
