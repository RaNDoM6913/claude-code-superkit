#!/bin/bash
# tailwind-version-guard.sh — PostToolUse hook for Edit/Write
# Detects Tailwind CSS v3 vs v4 syntax mismatches.
# Warnings only (exit 0 always) — never blocks.
# Profile: standard, strict (skip on fast)

PROFILE="${CLAUDE_HOOK_PROFILE:-standard}"
if [ "$PROFILE" = "fast" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only process .tsx/.jsx/.css/.scss files
if [[ ! "$FILE_PATH" =~ \.(tsx|jsx|css|scss)$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Detect Tailwind version from nearest package.json
TW_VERSION=""
SEARCH_DIR=$(dirname "$FILE_PATH")
while [ "$SEARCH_DIR" != "/" ]; do
  if [ -f "${SEARCH_DIR}/package.json" ]; then
    TW_VERSION=$(jq -r '.dependencies.tailwindcss // .devDependencies.tailwindcss // empty' "${SEARCH_DIR}/package.json" 2>/dev/null)
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [ -z "$TW_VERSION" ]; then
  exit 0
fi

# Extract major version number
TW_MAJOR=$(echo "$TW_VERSION" | grep -oE '[0-9]+' | head -1)

if [ -z "$TW_MAJOR" ]; then
  exit 0
fi

WARNINGS=""

if [ "$TW_MAJOR" = "4" ]; then
  # Tailwind v4 project — warn on v3 patterns

  # Old postcss plugin name (tailwindcss used as postcss plugin in v3)
  if grep -qE "require\s*\(\s*['\"]tailwindcss['\"]\s*\)" "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ TW v4: postcss plugin 'tailwindcss' is v3 syntax — v4 uses @tailwindcss/postcss in ${BASENAME}"
  fi

  # @tailwind directives (v3 syntax)
  if grep -qE '@tailwind\s+(base|components|utilities)' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ TW v4: @tailwind directives are v3 syntax — v4 uses @import \"tailwindcss\" in ${BASENAME}"
  fi

  # tailwind.config reference (v4 uses CSS-based config)
  if grep -qE 'tailwind\.config' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ TW v4: tailwind.config is v3 syntax — v4 uses @theme in CSS for configuration in ${BASENAME}"
  fi

elif [ "$TW_MAJOR" = "3" ]; then
  # Tailwind v3 project — warn on v4 patterns

  # @import "tailwindcss" (v4 syntax)
  if grep -qE $'@import\\s+["\']tailwindcss["\']' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ TW v3: @import \"tailwindcss\" is v4 syntax — v3 uses @tailwind base/components/utilities in ${BASENAME}"
  fi

  # @theme directive (v4 syntax)
  if grep -qE '@theme\s*\{' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ TW v3: @theme directive is v4 syntax — v3 uses tailwind.config.js for theme configuration in ${BASENAME}"
  fi
fi

# Output warnings
if [ -n "$WARNINGS" ]; then
  echo -e "\nTailwind version guard (v${TW_MAJOR} detected):${WARNINGS}"
  echo ""
fi

exit 0
