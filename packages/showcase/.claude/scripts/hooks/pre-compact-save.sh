#!/bin/bash
# pre-compact-save.sh — PreCompact hook
# Saves current context summary before compaction
# Profile: always on

CONTEXT_DIR="$HOME/.config/myapp/claude-code"
mkdir -p "$CONTEXT_DIR"

CONTEXT_FILE="$CONTEXT_DIR/last-context.md"

cat > "$CONTEXT_FILE" << CTXEOF
# Claude Code — Last Context (auto-saved before compaction)
**Saved at:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Working directory:** $(pwd)

## Git State
$(git branch --show-current 2>/dev/null || echo "not a git repo")
$(git log --oneline -5 2>/dev/null || echo "no commits")

## Modified Files
$(git diff --name-only 2>/dev/null || echo "none")

## Staged Files
$(git diff --cached --name-only 2>/dev/null || echo "none")
CTXEOF

echo "Context saved to $CONTEXT_FILE" >&2
exit 0
