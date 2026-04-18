#!/bin/bash
# pre-compact-save.sh — PreCompact hook
# Saves current context summary before compaction
# Captures: git state, modified files, task state, architectural decisions, review findings
# Profile: always on

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

CONTEXT_DIR="$HOME/.config/claude-superkit"
mkdir -p "$CONTEXT_DIR"

CONTEXT_FILE="$CONTEXT_DIR/last-context.md"

# Collect recent architectural decisions from git log
RECENT_DECISIONS=""
if git log --oneline -20 --format="%s" 2>/dev/null | grep -iE "(feat|refactor|arch|design|migrate)" | head -5 | grep -q .; then
  RECENT_DECISIONS=$(git log --oneline -20 --format="- %s" 2>/dev/null | grep -iE "(feat|refactor|arch|design|migrate)" | head -5)
fi

# Collect active plan if exists
ACTIVE_PLAN=""
if [ -f ".claude/.active-plan.md" ]; then
  ACTIVE_PLAN=$(head -50 ".claude/.active-plan.md" 2>/dev/null)
fi

# Collect review findings from last session
REVIEW_FINDINGS=""
if [ -f ".claude/.last-review.md" ]; then
  REVIEW_FINDINGS=$(cat ".claude/.last-review.md" 2>/dev/null)
fi

# Collect discovered issues
DISCOVERED_ISSUES=""
if [ -f ".claude/.discovered-issues.md" ]; then
  DISCOVERED_ISSUES=$(cat ".claude/.discovered-issues.md" 2>/dev/null)
fi

# Detect project stacks
STACKS=""
[ -f "go.mod" ] && STACKS="${STACKS}Go "
[ -f "Cargo.toml" ] && STACKS="${STACKS}Rust "
[ -f "pyproject.toml" ] && STACKS="${STACKS}Python "
[ -f "package.json" ] && [ -f "tsconfig.json" ] && STACKS="${STACKS}TypeScript "

cat > "$CONTEXT_FILE" << CTXEOF
# Claude Code — Last Context (auto-saved before compaction)
**Saved at:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Working directory:** $(pwd)
**Stacks:** ${STACKS:-unknown}
**Profile:** ${CLAUDE_HOOK_PROFILE:-standard}

## Git State
**Branch:** $(git branch --show-current 2>/dev/null || echo "not a git repo")
**Recent commits:**
$(git log --oneline -5 2>/dev/null || echo "no commits")

## Modified Files (unstaged)
$(git diff --name-only 2>/dev/null || echo "none")

## Staged Files
$(git diff --cached --name-only 2>/dev/null || echo "none")

## Task State
$(if [ -f ".claude/.task-state.json" ]; then cat .claude/.task-state.json; else echo "no active task"; fi)

## Recent Architectural Decisions
$(if [ -n "$RECENT_DECISIONS" ]; then echo "$RECENT_DECISIONS"; else echo "none detected"; fi)

## Active Plan
$(if [ -n "$ACTIVE_PLAN" ]; then echo "$ACTIVE_PLAN"; else echo "no active plan"; fi)

## Review Findings (last session)
$(if [ -n "$REVIEW_FINDINGS" ]; then echo "$REVIEW_FINDINGS"; else echo "none"; fi)

## Discovered Issues
$(if [ -n "$DISCOVERED_ISSUES" ]; then echo "$DISCOVERED_ISSUES"; else echo "none"; fi)
CTXEOF

# Validate saved context is not empty
if [ ! -s "$CONTEXT_FILE" ]; then
  echo "WARNING: Context file is empty after save" >&2
fi

echo "Context saved to $CONTEXT_FILE" >&2
exit 0
