#!/bin/bash
# superkit-update.sh — auto-update superkit files at session start
# Triggers on: SessionStart
# Profile: all (fast, standard, strict)
#
# Reads .claude/.superkit-meta (created by setup.sh) to find the
# superkit clone path. Pulls latest, compares VERSION, and re-copies
# updated files if a new version is available.

# Read meta file
META_FILE="$CLAUDE_PROJECT_DIR/.claude/.superkit-meta"
if [ ! -f "$META_FILE" ]; then
  exit 0  # superkit source not tracked, skip
fi

source "$META_FILE"

# Verify source exists
if [ ! -d "$SUPERKIT_SOURCE" ]; then
  exit 0  # clone directory missing, skip silently
fi

if [ ! -f "$SUPERKIT_SOURCE/VERSION" ]; then
  exit 0  # not a valid superkit clone
fi

# Rate limit: check at most once per 6 hours
LAST_UPDATE_FILE="$HOME/.claude/.superkit-update-last-check"
NOW=$(date +%s)
LAST=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo "0")
DIFF=$((NOW - LAST))

if [ "$DIFF" -lt 21600 ]; then
  exit 0  # checked less than 6h ago
fi

echo "$NOW" > "$LAST_UPDATE_FILE"

# Fetch latest from remote (silent)
cd "$SUPERKIT_SOURCE" || exit 0
git fetch --quiet 2>/dev/null || exit 0

# Check if behind
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse @{u} 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # already up to date
fi

# Pull latest
git pull --quiet 2>/dev/null || {
  echo ""
  echo "⚠ superkit: git pull failed in $SUPERKIT_SOURCE"
  echo "  Run manually: cd $SUPERKIT_SOURCE && git pull"
  echo ""
  exit 0
}

# Compare versions
NEW_VERSION=$(cat "$SUPERKIT_SOURCE/VERSION" | tr -d '[:space:]')
OLD_VERSION="$SUPERKIT_VERSION"

# Re-copy core files (non-destructive: overwrites existing, adds new)
PACKAGES="$SUPERKIT_SOURCE/packages"
CLAUDE_DIR="$CLAUDE_PROJECT_DIR/.claude"

# Core agents
for f in "$PACKAGES/core/agents/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/agents/$(basename "$f")"
done

# Core commands
for f in "$PACKAGES/core/commands/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/commands/$(basename "$f")"
done

# Core hooks
for f in "$PACKAGES/core/hooks/"*.sh; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
done

# Core rules
for f in "$PACKAGES/core/rules/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/rules/$(basename "$f")"
done

# Core skills
for skill_dir in "$PACKAGES/core/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  mkdir -p "$CLAUDE_DIR/skills/$skill_name"
  [ -f "$skill_dir/SKILL.md" ] && cp "$skill_dir/SKILL.md" "$CLAUDE_DIR/skills/$skill_name/SKILL.md"
done

# Stack agents (if stacks configured)
for stack in $SUPERKIT_STACKS; do
  if [ -d "$PACKAGES/stack-agents/$stack" ]; then
    for f in "$PACKAGES/stack-agents/$stack/"*.md; do
      [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/agents/$(basename "$f")"
    done
  fi
  if [ -d "$PACKAGES/stack-hooks/$stack" ]; then
    for f in "$PACKAGES/stack-hooks/$stack/"*.sh; do
      [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
    done
  fi
done

# Settings.json — SKIP (user may have customized it)
# CLAUDE.md — SKIP (user fills it with project info)

# Make hooks executable
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null

# Update meta
sed -i.bak "s/SUPERKIT_VERSION=.*/SUPERKIT_VERSION=\"$NEW_VERSION\"/" "$META_FILE" 2>/dev/null
rm -f "$META_FILE.bak"

echo ""
echo "✅ superkit auto-updated: $OLD_VERSION → $NEW_VERSION"
AGENT_COUNT=$(ls "$CLAUDE_DIR/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
CMD_COUNT=$(ls "$CLAUDE_DIR/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "   $AGENT_COUNT agents, $CMD_COUNT commands synced from $SUPERKIT_SOURCE"
echo "   Changelog: https://github.com/RaNDoM6913/claude-code-superkit/releases"
echo ""

exit 0
