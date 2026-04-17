#!/bin/bash
# ui-animation-easing-check.sh — warns on ease-in, transition: all, scale(0)
# Triggers on: PostToolUse (Edit|Write)
# Profile: all (advisory only, never blocks)
# Opt-out: CLAUDE_DISABLE_UI_ANIM_CHECK=1
#
# Flags motion anti-patterns from motion-and-animation.md and
# ui-anti-patterns.md:
#   - ease-in on UI transitions/animations (sluggish; use ease-out)
#   - transition: all (animates layout props; specify exact)
#   - scale(0) as entry animation (use scale(0.95))
#   - Animating width/height/top/left/margin (not compositor-accelerated)

if [ "${CLAUDE_DISABLE_UI_ANIM_CHECK:-}" = "1" ]; then
  exit 0
fi

INPUT=$(cat 2>/dev/null || echo '{}')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // .new_string // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ -z "$NEW_STRING" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.css|*.scss|*.tsx|*.jsx|*.ts|*.html|*.vue|*tailwind.config.*|*.tokens.*)
    ;;
  *)
    exit 0
    ;;
esac

WARNINGS=""

# (1) ease-in on UI — must NOT match ease-in-out (which is legitimate).
# POSIX-grep has no negative lookahead, so we use `ease-in([^-]|$)` which
# requires any non-hyphen character (or end-of-line) after ease-in.
if echo "$NEW_STRING" | grep -qE '(transition|animation)[[:space:]]*:[^;]*ease-in([^-]|$)'; then
  WARNINGS+="  • ease-in on UI transition/animation — use ease-out (starts fast, feels responsive)\n"
elif echo "$NEW_STRING" | grep -qE '(transition-timing-function|animation-timing-function)[[:space:]]*:[[:space:]]*ease-in([^-]|$)'; then
  WARNINGS+="  • ease-in timing function — use ease-out\n"
fi

# (2) transition: all
if echo "$NEW_STRING" | grep -qE 'transition[[:space:]]*:[[:space:]]*all\b'; then
  WARNINGS+="  • transition: all — specify exact properties (transform/opacity) to avoid layout stutter\n"
fi

# Tailwind transition-all
if echo "$NEW_STRING" | grep -qE '\btransition-all\b'; then
  WARNINGS+="  • Tailwind transition-all — prefer transition-transform / transition-opacity / transition-colors\n"
fi

# (3) scale(0) as entry animation — but not scale(0.X) which is fine
if echo "$NEW_STRING" | grep -qE '(transform|animation)[^;]*\bscale\([[:space:]]*0[[:space:]]*\)|@keyframes[^}]*\bscale\([[:space:]]*0[[:space:]]*\)'; then
  WARNINGS+="  • scale(0) as animation target — nothing in the real world appears from true zero; use scale(0.95)\n"
fi

# Tailwind scale-0 — must not match scale-0.95 or scale-01 etc.
# `scale-0` followed by anything that is NOT a digit/period/letter, or end-of-line.
if echo "$NEW_STRING" | grep -qE 'scale-0[^0-9.a-zA-Z]|scale-0$'; then
  WARNINGS+="  • Tailwind scale-0 — prefer scale-95 (or custom tw scale) for entry/exit animations\n"
fi

# (4) Animating layout properties (width/height/top/left/margin) — expensive
if echo "$NEW_STRING" | grep -qE 'transition[^;]*\b(width|height|top|left|right|bottom|margin(-top|-right|-bottom|-left)?|padding(-top|-right|-bottom|-left)?)\b'; then
  WARNINGS+="  • Transitioning width/height/top/left/margin — use transform + opacity (compositor-accelerated)\n"
fi

if [ -n "$WARNINGS" ]; then
  echo "" >&2
  echo "⚠ UI: motion anti-patterns in ${FILE_PATH}" >&2
  printf "%b" "$WARNINGS" >&2
  echo "  See .claude/rules/motion-and-animation.md" >&2
  echo "  Opt out: export CLAUDE_DISABLE_UI_ANIM_CHECK=1" >&2
  echo "" >&2
fi

exit 0
