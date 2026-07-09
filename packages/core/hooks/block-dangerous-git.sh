#!/bin/bash
# block-dangerous-git.sh — PreToolUse hook for Bash
# Blocks dangerous git commands: --no-verify, --force, reset --hard, branch -D

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# ── Strip commit-MESSAGE payloads before scanning ────────────────────────────
# A commit message that merely *describes* --no-verify / a force push must not
# trip the guards below (this fired twice in prod while writing commit messages
# that document these very rules). We remove the -m / --message arguments and
# the body of a `git commit -F -` heredoc, then run every existing regex on the
# REMAINDER unchanged — so chained segments (&&, ;, |) OUTSIDE the message are
# still scanned: `git commit -m "x" && git push --force` must still block.
# Safety bias: when a strip is uncertain we remove too LITTLE (a false block is
# annoying but safe) rather than too much (which could hide a real command).
SCAN_COMMAND="$COMMAND"

# (a/b) Strip -m / --message arguments. Quoted forms are removed FIRST, so a
#       spurious << or && that lives INSIDE a message is gone before it can
#       matter; unquoted single-token forms are removed last (they stop at the
#       first whitespace or shell metacharacter ; & | < > ( ) so a glued
#       `-m foo;git push --force` keeps the `;git push` for scanning). The
#       attached unquoted `-mfoo` form is left alone deliberately (rare; erring
#       toward strip-less — worst case is a harmless false block).
SCAN_COMMAND=$(printf '%s' "$SCAN_COMMAND" | sed -E \
  -e 's/--message="[^"]*"//g' \
  -e "s/--message='[^']*'//g" \
  -e 's/--message[[:space:]]+"[^"]*"//g' \
  -e "s/--message[[:space:]]+'[^']*'//g" \
  -e 's/(^|[[:space:]])-m"[^"]*"/\1/g' \
  -e "s/(^|[[:space:]])-m'[^']*'/\1/g" \
  -e 's/(^|[[:space:]])-m[[:space:]]+"[^"]*"/\1/g' \
  -e "s/(^|[[:space:]])-m[[:space:]]+'[^']*'/\1/g" \
  -e 's/--message=[^[:space:];&|<>()]*//g' \
  -e 's/--message[[:space:]]+[^[:space:];&|<>()]*//g' \
  -e 's/(^|[[:space:]])-m[[:space:]]+[^[:space:];&|<>()]*/\1/g')

# (c) Strip a `git commit ... <<MARKER ... MARKER` heredoc BODY (message fed via
#     -F -). Runs AFTER the -m strip so that a << appearing only inside an -m
#     message has already been removed and cannot trigger a false heredoc. Only
#     the body lines are dropped — the opener line and anything after the
#     terminator are kept and scanned, so a chained dangerous command survives.
SCAN_COMMAND=$(printf '%s' "$SCAN_COMMAND" | awk '
BEGIN { in_h = 0; marker = ""; dash = 0 }
function get_marker(line,   rest) {
  if (match(line, /<<-?/)) {
    rest = substr(line, RSTART + RLENGTH)
    if (match(rest, /[A-Za-z_][A-Za-z0-9_]*/))
      return substr(rest, RSTART, RLENGTH)
  }
  return ""
}
{
  if (in_h) {
    t = $0
    if (dash) sub(/^\t+/, "", t)
    if (t == marker) { in_h = 0; print; next }
    next
  }
  if ($0 ~ /git[[:space:]]+commit/) {
    m = get_marker($0)
    if (m != "") { in_h = 1; marker = m; dash = ($0 ~ /<<-/); print; next }
  }
  print
}')

if echo "$SCAN_COMMAND" | grep -qE '\-\-no-verify'; then
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

if { echo "$SCAN_COMMAND" | grep -qE 'git[[:space:]]+push' \
     && echo "$SCAN_COMMAND" | grep -qE '(^|[[:space:]])(--force([[:space:]=]|$)|-f([[:space:]]|$))'; } \
   || echo "$SCAN_COMMAND" | grep -qE 'git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+\+'; then
  cat >&2 <<'EOF'
BLOCKED: Force push is not allowed.
  Why: overwrites remote history; collaborators' clones break silently.
       +refspec pushes (git push origin +main) force non-fast-forward too.
  Suggested alternative:
    git push --force-with-lease          # safe — refuses if remote moved
    git push --force-with-lease=<branch>  # even safer — scopes to your ref
EOF
  exit 2
fi

if echo "$SCAN_COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
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

if echo "$SCAN_COMMAND" | grep -qE 'git\s+branch\s+-D'; then
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

if echo "$SCAN_COMMAND" | grep -qE 'git[[:space:]]+checkout[[:space:]]+(\.([[:space:]]|$)|--([[:space:]]|$)|-f([[:space:]]|$)|--force([[:space:]]|$))'; then
  cat >&2 <<'EOF'
BLOCKED: git checkout discards uncommitted changes.
  Why: checkout of '.', '--', '-f', or '--force' overwrites working-tree
       edits with no undo — the uncommitted work is gone for good.
  Suggested alternative:
    git stash push -u -m before-discard   # preserve WIP first
    git restore --source=<ref> <path>     # narrow, per-file restore
EOF
  exit 2
fi

if echo "$SCAN_COMMAND" | grep -qE 'git[[:space:]]+clean[[:space:]]+-[A-Za-z]*f|git[[:space:]]+clean[[:space:]]+.*--force'; then
  cat >&2 <<'EOF'
BLOCKED: git clean -f permanently deletes untracked files.
  Why: removes untracked files/dirs outright — git cannot recover them.
  Suggested alternative:
    git clean -n                          # dry run — list what WOULD be removed
    git stash push -u                     # stash untracked instead of deleting
EOF
  exit 2
fi

if echo "$SCAN_COMMAND" | grep -qE 'git[[:space:]]+switch[[:space:]]+.*(--discard-changes|--force([[:space:]]|$)|-[A-Za-z]*f([[:space:]]|$)|-C([[:space:]]|$))'; then
  cat >&2 <<'EOF'
BLOCKED: git switch --discard-changes / -C throws away work.
  Why: forces the switch and drops uncommitted changes with no undo.
  Suggested alternative:
    git stash push -u -m before-switch    # preserve WIP first
    git switch <branch>                   # plain switch keeps your changes
EOF
  exit 2
fi

# ── Task 18: stash-commit bypass patterns ─────────────────────────────────
# Real incident from github.com/anthropics/claude-code/issues/40117 — a
# stash+commit+stash-pop sequence can slip staged changes past hook
# scrutiny. Also catch -q/--quiet combined with --no-verify and
# --amend --no-verify which target pre-commit gate bypass.

if echo "$SCAN_COMMAND" | grep -qE 'git\s+stash.*&&.*git\s+commit.*stash\s+pop'; then
  echo "BLOCKED: stash → commit → stash pop bypass pattern detected." >&2
  echo "  This pattern is a known way to slip staged work past commit-gate hooks." >&2
  echo "  Commit the staged work directly, then stash/pop the remainder." >&2
  exit 2
fi

if echo "$SCAN_COMMAND" | grep -qE 'git\s+commit.*(-q|--quiet).*--no-verify'; then
  echo "BLOCKED: git commit -q/--quiet combined with --no-verify." >&2
  echo "  This combination exists solely to silence the hook failure. Fix the" >&2
  echo "  underlying pre-commit-hook error instead of muting it." >&2
  exit 2
fi

if echo "$SCAN_COMMAND" | grep -qE 'git\s+commit.*--amend.*--no-verify'; then
  echo "BLOCKED: git commit --amend --no-verify is a pre-commit-hook bypass." >&2
  echo "  Fix the hook error, stage the fix, then --amend without --no-verify." >&2
  exit 2
fi

exit 0
