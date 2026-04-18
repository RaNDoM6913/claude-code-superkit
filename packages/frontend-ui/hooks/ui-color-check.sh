#!/bin/bash
# ui-color-check.sh — warns on pure #000/#fff, AI-palette patterns, gradient text
# Triggers on: PostToolUse (Edit|Write)
# Profile: all (advisory only, never blocks)
# Opt-out: CLAUDE_DISABLE_UI_COLOR_CHECK=1
#
# Flags three categories of AI-color-reflex:
#   1. Pure #000 / #fff / rgb(0,0,0) / rgb(255,255,255)
#   2. Gradient text (background-clip: text with a multi-color gradient)
#   3. Purple→blue / cyan-on-black / neon-glow accents
#
# Per color-and-contrast.md: tint everything toward brand hue, use oklch,
# avoid gradient text for impact, avoid the AI palette.

# Unified profile + disable check
SUPERKIT_PROFILE_LIB="$(dirname "$0")/lib/profile.sh"
[ -f "$SUPERKIT_PROFILE_LIB" ] || SUPERKIT_PROFILE_LIB="$(dirname "$0")/../lib/profile.sh"
# shellcheck source=/dev/null
[ -f "$SUPERKIT_PROFILE_LIB" ] && source "$SUPERKIT_PROFILE_LIB" && should_skip_hook "$(basename "$0" .sh)" && exit 0

if [ "${CLAUDE_DISABLE_UI_COLOR_CHECK:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // .new_string // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ -z "$NEW_STRING" ]; then
  exit 0
fi

# Only scan UI-relevant files
case "$FILE_PATH" in
  *.css|*.scss|*.tsx|*.jsx|*.ts|*.html|*.vue|*tailwind.config.*|*.tokens.*)
    ;;
  *)
    exit 0
    ;;
esac

WARNINGS=""

# (1) Pure black / white — look in color / background(-color) / fill / stroke contexts
# to avoid false positives on shadow opacity, box-shadow: 0 0 0 etc.
# SEP matches :, optional whitespace, optional quote/backtick (JSX/TS inline styles)
SEP='[[:space:]]*:[[:space:]]*[\"'"'"'\`]*[[:space:]]*'
if echo "$NEW_STRING" | grep -qE "(color|background|background-color|fill|stroke)${SEP}#(000|fff|000000|ffffff|FFF|FFFFFF)([^0-9a-fA-F]|$)"; then
  WARNINGS+="  • Pure #000 or #fff in color/background — tint toward brand hue (oklch)\n"
elif echo "$NEW_STRING" | grep -qE "(color|background|background-color|fill|stroke)${SEP}rgb[a]?\([[:space:]]*0[[:space:]]*,[[:space:]]*0[[:space:]]*,[[:space:]]*0|(color|background|background-color|fill|stroke)${SEP}rgb[a]?\([[:space:]]*255[[:space:]]*,[[:space:]]*255[[:space:]]*,[[:space:]]*255"; then
  WARNINGS+="  • Pure rgb(0,0,0) or rgb(255,255,255) — tint toward brand hue (oklch)\n"
fi

# Tailwind bg-black / text-black / bg-white / text-white (not tinted)
# Note: if the project uses Tailwind with customised black/white tokens, this
# may false-positive. It's advisory only, so a small false-positive tax is OK.
if echo "$NEW_STRING" | grep -qE '\b(bg|text|fill|stroke|border)-(black|white)\b'; then
  WARNINGS+="  • Tailwind bg-black/bg-white or text-black/text-white — prefer tinted neutrals\n"
fi

# (2) Gradient text — background-clip: text with a *-gradient background
if echo "$NEW_STRING" | grep -qE 'background-clip[[:space:]]*:[[:space:]]*text' && \
   echo "$NEW_STRING" | grep -qE 'background(-image)?[[:space:]]*:[[:space:]]*(linear|radial|conic)-gradient'; then
  WARNINGS+="  • Gradient text detected (background-clip: text + gradient) — solid colors only for text\n"
fi

# Tailwind gradient-text pattern
if echo "$NEW_STRING" | grep -qE 'bg-clip-text[[:space:]][^>]*bg-gradient-to|bg-gradient-to[[:space:]][^>]*bg-clip-text'; then
  WARNINGS+="  • Tailwind gradient text (bg-clip-text + bg-gradient-*) — solid colors only for text\n"
fi

# (3) AI palette — purple-to-blue gradient
if echo "$NEW_STRING" | grep -qiE 'linear-gradient\([^)]*(purple|violet|indigo|#8b5cf6|#a855f7|#7c3aed)[^)]*(blue|cyan|#3b82f6|#06b6d4|#0ea5e9)'; then
  WARNINGS+="  • Purple→blue gradient detected — a trademark AI-palette pattern, reconsider\n"
fi

# Cyan on black — #0ff or oklch cyan on pure black
if echo "$NEW_STRING" | grep -qE 'color[[:space:]]*:[[:space:]]*(#0ff|#00ffff|cyan)' && \
   echo "$NEW_STRING" | grep -qE '(background|bg)[^;]*(#000|#0+0|black)'; then
  WARNINGS+="  • Cyan on black detected — the AI 'cyber' aesthetic default\n"
fi

# No oklch in a file that only uses hsl (suggest migration)
# Only warn when the file looks like it's defining a palette (multiple color tokens)
if echo "$NEW_STRING" | grep -qE 'hsl\(' && ! echo "$NEW_STRING" | grep -qE 'oklch\('; then
  # Count actual hsl() occurrences, not lines containing hsl
  hsl_count=$(echo "$NEW_STRING" | grep -oE 'hsl\(' | wc -l | tr -d ' ')
  if [ "${hsl_count:-0}" -ge 3 ]; then
    WARNINGS+="  • Multiple hsl() declarations without oklch() — prefer oklch for perceptual uniformity\n"
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo "" >&2
  echo "⚠ UI: color anti-patterns in ${FILE_PATH}" >&2
  printf "%b" "$WARNINGS" >&2
  echo "  See .claude/rules/color-and-contrast.md and ui-anti-patterns.md" >&2
  echo "  Opt out: export CLAUDE_DISABLE_UI_COLOR_CHECK=1" >&2
  echo "" >&2
fi

exit 0
