#!/bin/bash
# block-dangerous-git.sh — PreToolUse hook for Bash
# Blocks dangerous git commands: --no-verify, --force, reset --hard, branch -D

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
  cat >&2 <<'EOF'
BLOCKED: --no-verify is not allowed.
  Why: pre-commit hooks exist to catch regressions before they land.
  Suggested alternative:
    1) Run the failing hook manually, read its output, fix the issue.
    2) If the hook itself is wrong, amend the hook config with a
       documented reason rather than silencing it at every commit.
EOF
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\-\-force|git\s+push\s+.*\-f\b'; then
  cat >&2 <<'EOF'
BLOCKED: Force push is not allowed.
  Why: overwrites remote history; collaborators' clones break silently.
  Suggested alternative:
    git push --force-with-lease          # safe — refuses if remote moved
    git push --force-with-lease=<branch>  # even safer — scopes to your ref
EOF
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  cat >&2 <<'EOF'
BLOCKED: git reset --hard can destroy work.
  Why: drops uncommitted changes AND moves HEAD — double hit.
  Suggested alternative:
    git stash push -u -m 'before-reset'   # preserve WIP first
    git reset --soft <ref>                # keep staged + WC
    git reset --mixed <ref>               # keep WC only
    git restore --source=<ref> <path>     # narrow, per-file restore
EOF
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D'; then
  cat >&2 <<'EOF'
BLOCKED: git branch -D force-deletes.
  Why: drops a branch even if its commits are unmerged / unpushed.
  Suggested alternative:
    git branch -d <name>                  # safe — refuses if unmerged
    git push origin --delete <name>       # delete remote counterpart
    git reflog show <name>                # recover if you just -D'd one
EOF
  exit 2
fi

# ── Task 18: stash-commit bypass patterns ─────────────────────────────────
# Real incident from github.com/anthropics/claude-code/issues/40117 — a
# stash+commit+stash-pop sequence can slip staged changes past hook
# scrutiny. Also catch -q/--quiet combined with --no-verify and
# --amend --no-verify which target pre-commit gate bypass.

if echo "$COMMAND" | grep -qE 'git\s+stash.*&&.*git\s+commit.*stash\s+pop'; then
  echo "BLOCKED: stash → commit → stash pop bypass pattern detected." >&2
  echo "  This pattern is a known way to slip staged work past commit-gate hooks." >&2
  echo "  Commit the staged work directly, then stash/pop the remainder." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+commit.*(-q|--quiet).*--no-verify'; then
  echo "BLOCKED: git commit -q/--quiet combined with --no-verify." >&2
  echo "  This combination exists solely to silence the hook failure. Fix the" >&2
  echo "  underlying pre-commit-hook error instead of muting it." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+commit.*--amend.*--no-verify'; then
  echo "BLOCKED: git commit --amend --no-verify is a pre-commit-hook bypass." >&2
  echo "  Fix the hook error, stage the fix, then --amend without --no-verify." >&2
  exit 2
fi

exit 0
