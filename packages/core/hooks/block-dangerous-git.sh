#!/bin/bash
# block-dangerous-git.sh — PreToolUse hook for Bash
# Blocks dangerous git commands: --no-verify, --force, reset --hard, branch -D

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
  echo "BLOCKED: --no-verify is not allowed. Fix the underlying issue instead." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\-\-force|git\s+push\s+.*\-f\b'; then
  echo "BLOCKED: Force push is not allowed. Use --force-with-lease if absolutely necessary." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard can destroy work. Use git stash or git reset --soft instead." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D'; then
  echo "BLOCKED: git branch -D force-deletes. Use -d for safe delete." >&2
  exit 2
fi

exit 0
