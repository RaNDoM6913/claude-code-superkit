#!/bin/bash
# ui-banned-fonts-check.sh — warns on reflex-list fonts in .css/.tsx/.html
# Triggers on: PostToolUse (Edit|Write)
# Profile: all (advisory only, never blocks)
# Opt-out: CLAUDE_DISABLE_UI_FONT_CHECK=1
#
# Scans the incoming diff for fonts in the reflex_fonts_to_reject list
# from packages/frontend-ui/rules/ui-anti-patterns.md. Writes a stderr
# warning pointing at the rule so Claude can correct course BEFORE the
# edit settles into the design system. Never blocks — exit 0 always.

if [ "${CLAUDE_DISABLE_UI_FONT_CHECK:-}" = "1" ]; then
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

# Skip if file path suggests we're in a code-block / prose / syntax highlighter
# context where monospace fonts like Space Mono are legitimately used.
case "$FILE_PATH" in
  *code-block*|*codeblock*|*prose*|*syntax-highlight*|*highlighter*)
    exit 0
    ;;
esac

# reflex_fonts_to_reject — case-insensitive exact-ish matching.
# Match is scoped to font-family declarations and common Tailwind font classes
# to avoid false positives (e.g. a variable named `inter` in JSX).
BANNED_PATTERNS=(
  'Fraunces'
  'Newsreader'
  '\bLora\b'
  'Crimson[[:space:]]*(Pro|Text)?'
  'Playfair([[:space:]]*Display)?'
  'Cormorant([[:space:]]*Garamond)?'
  '\bSyne\b'
  'IBM[[:space:]]*Plex[[:space:]]*(Sans|Serif|Mono)'
  'Space[[:space:]]*(Mono|Grotesk)'
  '\bInter\b'
  'DM[[:space:]]*(Sans|Serif[[:space:]]*(Display|Text))'
  '\bOutfit\b'
  'Plus[[:space:]]*Jakarta[[:space:]]*Sans'
  'Instrument[[:space:]]*(Sans|Serif)'
)

# Collect hits
HITS=""
for pat in "${BANNED_PATTERNS[@]}"; do
  # Look for font in font-family declaration OR Tailwind font-* utility OR import url
  matches=$(echo "$NEW_STRING" | grep -E "(font-family:.*${pat}|font-\[['\"]?${pat}|['\"]${pat}['\"].*(font|family)|fonts\.googleapis\.com.*${pat// /+}|${pat}[[:space:]]*[,;])" -io 2>/dev/null | head -3)
  if [ -n "$matches" ]; then
    # Extract clean font name for reporting
    clean=$(echo "$pat" | sed -E 's/\\b|\[\[:space:\]\]\*|\(|\)|\?|\|/ /g' | tr -s ' ' | sed -E 's/^ | $//g' | head -c 40)
    HITS="${HITS}  • ${clean}\n"
  fi
done

if [ -n "$HITS" ]; then
  echo "" >&2
  echo "⚠ UI: reflex-list font detected in ${FILE_PATH}" >&2
  printf "%b" "$HITS" >&2
  echo "  These fonts are the LLM's training-data defaults and create visual" >&2
  echo "  monoculture. Consider running the font-selection procedure in" >&2
  echo "  packages/frontend-ui/rules/typography-guidelines.md (Step 1-4)." >&2
  echo "  Opt out: export CLAUDE_DISABLE_UI_FONT_CHECK=1" >&2
  echo "" >&2
fi

exit 0
