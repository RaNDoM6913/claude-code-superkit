#!/bin/bash
# superkit-update.sh — auto-update superkit files at session start
# Triggers on: SessionStart
# Profile: all (fast, standard, strict)
#
# Reads .claude/.superkit-meta (created by setup.sh) to find the
# superkit clone path. Compares install version (meta) vs source version
# (clone's VERSION file), pulls remote if behind, and re-copies updated
# files when install lags source.
#
# Two independent triggers for sync:
#   1. Install-version lags source-version (someone pulled the clone but
#      did not sync this repo). Cheap local check, no network required.
#   2. Source clone is behind remote — pull, then re-check version.

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

# ── Cheap version check FIRST (no network) ───────────────────────────
# Detects the case where someone manually pulled the clone (or another
# project synced first) — install in this repo lags the source clone.
SOURCE_VERSION=$(cat "$SUPERKIT_SOURCE/VERSION" | tr -d '[:space:]')
INSTALL_VERSION="$SUPERKIT_VERSION"

NEED_SYNC=false
if [ "$INSTALL_VERSION" != "$SOURCE_VERSION" ]; then
  NEED_SYNC=true
fi

# Rate limit: check remote at most once per 6 hours. Version-mismatch
# bypasses the rate limit (we already know we need to sync — no point
# delaying just because we recently checked remote).
LAST_UPDATE_FILE="$HOME/.claude/.superkit-update-last-check"
NOW=$(date +%s)
LAST=$(cat "$LAST_UPDATE_FILE" 2>/dev/null || echo "0")
DIFF=$((NOW - LAST))

SKIP_REMOTE_CHECK=false
if [ "$DIFF" -lt 21600 ]; then
  SKIP_REMOTE_CHECK=true
fi

# Fully up to date: install matches source AND we checked remote recently
if [ "$NEED_SYNC" = "false" ] && [ "$SKIP_REMOTE_CHECK" = "true" ]; then
  exit 0
fi

# ── Network check ────────────────────────────────────────────────────
if [ "$SKIP_REMOTE_CHECK" = "false" ]; then
  echo "$NOW" > "$LAST_UPDATE_FILE"

  cd "$SUPERKIT_SOURCE" 2>/dev/null && git fetch --quiet 2>/dev/null
  LOCAL=$(cd "$SUPERKIT_SOURCE" && git rev-parse HEAD 2>/dev/null)
  REMOTE=$(cd "$SUPERKIT_SOURCE" && git rev-parse @{u} 2>/dev/null)

  if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    cd "$SUPERKIT_SOURCE" && git pull --quiet 2>/dev/null || {
      echo ""
      echo "⚠ superkit: git pull failed in $SUPERKIT_SOURCE"
      echo "  Run manually: cd $SUPERKIT_SOURCE && git pull"
      echo ""
      # Continue — install may still lag source even without pull
    }
    # Refresh source version after pull attempt
    SOURCE_VERSION=$(cat "$SUPERKIT_SOURCE/VERSION" | tr -d '[:space:]')
    if [ "$INSTALL_VERSION" != "$SOURCE_VERSION" ]; then
      NEED_SYNC=true
    fi
  fi
fi

# Nothing to sync after remote check either
if [ "$NEED_SYNC" = "false" ]; then
  exit 0
fi

# ── Re-copy core files (non-destructive: overwrites existing, adds new) ──
NEW_VERSION="$SOURCE_VERSION"
OLD_VERSION="$INSTALL_VERSION"
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

# Core hooks (.sh AND .py — added .py 2026-05-14 for intake-classifier.py)
for f in "$PACKAGES/core/hooks/"*.sh; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
done
for f in "$PACKAGES/core/hooks/"*.py; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
done

# Core rules
for f in "$PACKAGES/core/rules/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/rules/$(basename "$f")"
done

# Core skills (SKILL.md + any other files inside each skill dir)
for skill_dir in "$PACKAGES/core/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  mkdir -p "$CLAUDE_DIR/skills/$skill_name"
  [ -f "$skill_dir/SKILL.md" ] && cp "$skill_dir/SKILL.md" "$CLAUDE_DIR/skills/$skill_name/SKILL.md"
  for sf in "$skill_dir"*; do
    if [ -f "$sf" ] && [ "$(basename "$sf")" != "SKILL.md" ]; then
      cp "$sf" "$CLAUDE_DIR/skills/$skill_name/$(basename "$sf")"
    fi
  done
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
    for f in "$PACKAGES/stack-hooks/$stack/"*.py; do
      [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/scripts/hooks/$(basename "$f")"
    done
  fi
done

# Settings.json — SKIP (user may have customized it)
# CLAUDE.md — SKIP (user fills it with project info)

# Make hooks executable
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.sh 2>/dev/null
chmod +x "$CLAUDE_DIR/scripts/hooks/"*.py 2>/dev/null

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
