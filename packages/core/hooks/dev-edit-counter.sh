#!/bin/bash
# dev-edit-counter.sh — counts code-file edits in current session
# Triggers on: PostToolUse(Edit|Write|MultiEdit)
# Profile: standard, strict
#
# Purpose: feeds the `dev-required-on-commit.sh` gate. When Claude accumulates
# 3+ edits to real code files without invoking /dev, the next git commit
# must either have a /dev marker or a [quick]/[no-dev]/[trivial]/[hotfix]
# override in the commit message.
#
# State file: /tmp/claude-edit-count-${SESSION_KEY}
# Reset: on successful commit or fresh session (new session_id).

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read tool input — PostToolUse payload: .tool_input.file_path + .session_id
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // .file_path // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# ── Skip tests, docs, config, and non-production paths ──
case "$FILE_PATH" in
  *_test.go|*test_*.go|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx)
    exit 0 ;;
  *.md|*.mdx|*.txt|*.json|*.yaml|*.yml|*.toml|*.ini|*.cfg|*.env*)
    exit 0 ;;
  */.claude/*|*/memory/*|*/docs/*|*/node_modules/*|*/vendor/*|*/dist/*|*/build/*)
    exit 0 ;;
  */.git/*|*/.obsidian/*)
    exit 0 ;;
esac

# ── Count only real code files ──
case "$FILE_PATH" in
  *.go|*.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.sql|*.rb|*.java|*.kt|*.cs|*.swift|*.c|*.cpp|*.h|*.hpp) ;;
  *) exit 0 ;;
esac

# Use Claude Code session_id (stable across all hooks in one session).
# Fallback to PPID for tests + old Claude Code versions that don't send it.
SESSION_KEY="${SESSION_ID:-${CLAUDE_HOOK_PID:-$PPID}}"
COUNTER="${TMPDIR:-/tmp}/claude-edit-count-${SESSION_KEY}"
CURRENT=$(cat "$COUNTER" 2>/dev/null || echo 0)
echo $((CURRENT + 1)) > "$COUNTER"

exit 0
