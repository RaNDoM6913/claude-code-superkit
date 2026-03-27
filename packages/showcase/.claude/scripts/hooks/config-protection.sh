#!/bin/bash
# config-protection.sh — warn when modifying linter/formatter/standard config files
# Triggers on: PostToolUse(Edit|Write)
# Profile: standard, strict

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

# Read tool input
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .filePath // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARN=false

case "$BASENAME" in
  .eslintrc*|eslint.config*|.prettierrc*|prettier.config*|biome.json)
    WARN=true ;;
  tsconfig*.json)
    WARN=true ;;
  .golangci.yml|.golangci.yaml|golangci-lint.yml)
    WARN=true ;;
  .stylelintrc*|stylelint.config*)
    WARN=true ;;
  Cargo.toml)
    # Only warn if [lints] or clippy section changed
    WARN=false ;;
  settings.json)
    # .claude/settings.json — meta-protection
    if echo "$FILE_PATH" | grep -q ".claude/settings.json"; then
      WARN=true
    fi
    ;;
  .env|.env.*|.env.local|.env.production|.env.staging)
    WARN=true
    ;;
  DECISIONS.md)
    echo ""
    echo "WARNING: DECISIONS.md is append-only"
    echo "  Do NOT delete or modify existing entries — only add new ones."
    echo "  To reverse a decision, add a new entry that supersedes the old one."
    echo ""
    exit 0
    ;;
esac

if [ "$WARN" = true ]; then
  echo ""
  echo "WARNING: Config file modified: $BASENAME"
  echo "  Ensure coding standards are not weakened."
  echo "  Changes to linter/formatter configs affect the entire project."
  echo ""
fi

exit 0
