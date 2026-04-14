#!/bin/bash
# dev-required-on-commit.sh — BLOCK commits when ≥3 code edits happened
#                              without /dev orchestration
# Triggers on: PreToolUse(Bash) when command contains "git commit"
# Profile: standard, strict
#
# Layer 3 enforcement of .claude/rules/dev-workflow.md:
#
#   Claude MUST follow the /dev orchestration for ALL tasks that involve
#   code changes — without the user explicitly calling /dev.
#
# State:
#   /tmp/claude-edit-count-${SESSION_KEY}  — counter incremented by dev-edit-counter.sh
#   /tmp/claude-dev-marker-${SESSION_KEY}  — set by dev-marker-set.sh when /dev fires
#
# Logic:
#   - count < 3                          → allow (too small to need /dev)
#   - count ≥ 3 AND marker exists        → allow (/dev was used)
#   - count ≥ 3 AND marker missing       → block (3+ edits, no /dev)
#   - commit message has [quick|no-dev|trivial|hotfix|wip]  → allow (override)
#
# On any allow path, counter + marker are reset so the next work-cycle
# starts fresh.
#
# EXIT CODES:
#   0 = allow
#   2 = BLOCK (no /dev + no override)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

# Match `git commit` including `git -C <path> commit`
if ! echo "$COMMAND" | grep -qE 'git(\s+-[cC]\s+\S+)*\s+commit'; then
  exit 0
fi

# Use Claude Code session_id for stable cross-hook state.
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
COUNTER="${TMPDIR:-/tmp}/claude-edit-count-${SESSION_KEY}"
MARKER="${TMPDIR:-/tmp}/claude-dev-marker-${SESSION_KEY}"

reset_state() {
  rm -f "$COUNTER" "$MARKER"
}

# ── Override: explicit bypass tag in commit message ──
# Recognised tags: [quick] [no-dev] [trivial] [hotfix] [wip]
if echo "$COMMAND" | grep -qiE '\[(quick|no-dev|trivial|hotfix|wip)\]'; then
  reset_state
  exit 0
fi

# ── Resolve the real target repo if `-C <path>` is present ──
GIT_TARGET_DIR=$(echo "$COMMAND" | sed -nE 's/.*git[[:space:]]+(-[cC][[:space:]]+([^[:space:]]+)).*/\2/p' | head -n1)
if [ -n "$GIT_TARGET_DIR" ] && [ -d "$GIT_TARGET_DIR" ]; then
  GIT_CMD_PREFIX="git -C $GIT_TARGET_DIR"
else
  GIT_CMD_PREFIX="git"
fi

STAGED=$($GIT_CMD_PREFIX diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ] && echo "$COMMAND" | grep -qE '(^|[[:space:]])(-a|--all)([[:space:]]|$)'; then
  STAGED=$($GIT_CMD_PREFIX diff --name-only 2>/dev/null)
fi

HAS_CODE=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.sql|*.rb|*.java|*.kt|*.cs|*.swift|*.c|*.cpp|*.h|*.hpp)
      # Skip test / presentation / .claude / memory / docs
      case "$f" in
        *_test.go|*test_*.go|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) continue ;;
        presentation/*|*/presentation/*) continue ;;
        .claude/*|*/.claude/*|memory/*|*/memory/*) continue ;;
      esac
      HAS_CODE=true
      break
      ;;
  esac
done <<< "$STAGED"

if [ "$HAS_CODE" = false ]; then
  # Docs-only or exempt-only commit — no /dev required.
  # Preserve counter (we don't want doc commits to reset the budget).
  exit 0
fi

# ── Check edit budget ──
COUNT=$(cat "$COUNTER" 2>/dev/null || echo 0)

if [ "$COUNT" -lt 3 ]; then
  # Below the threshold — allow and reset.
  reset_state
  exit 0
fi

if [ -f "$MARKER" ]; then
  # /dev was invoked — reset and allow.
  reset_state
  exit 0
fi

# ── Block ──
cat >&2 <<EOF

BLOCKED: $COUNT code-file edits without /dev orchestration

  Rule (.claude/rules/dev-workflow.md):
    Claude MUST follow /dev for ALL tasks that involve code changes.

  Options:
    1) Run /dev  — orchestrate through the phased workflow (recommended).
    2) Add one of these tags to your commit message to override:
         [quick]   — small fix, skip /dev intentionally
         [no-dev]  — non-trivial but /dev not applicable (explain why)
         [trivial] — cosmetic change (naming, formatting)
         [hotfix]  — emergency fix
         [wip]     — work-in-progress checkpoint

  Current state:
    edits  = $COUNT (threshold: 3)
    marker = missing  → /dev was NOT invoked this work-cycle

  To reset the counter without committing: rm $COUNTER

EOF
exit 2
