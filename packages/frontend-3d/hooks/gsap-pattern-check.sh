#!/bin/bash
# gsap-pattern-check.sh — PostToolUse hook for Edit/Write
# Checks for common GSAP anti-patterns in .tsx files.
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

# Only process .tsx files
if [[ ! "$FILE_PATH" =~ \.tsx$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# 1. scrub: true without a number — should be scrub: 1 or scrub: 0.5
if grep -qnE 'scrub:\s*true' "$FILE_PATH" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ GSAP: scrub: true should be a number (scrub: 1 or scrub: 0.5) for smooth animation in ${BASENAME}"
fi

# 2. scrollTrigger present but missing invalidateOnRefresh: true
if grep -qiE 'scrollTrigger\s*[:={]' "$FILE_PATH" 2>/dev/null; then
  if ! grep -q 'invalidateOnRefresh\s*:\s*true' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ GSAP: ScrollTrigger without invalidateOnRefresh: true — layout breaks on resize in ${BASENAME}"
  fi
fi

# 3. Timeline created without tl.set({}, {}, 1.0) extension
if grep -qE 'gsap\.timeline\(' "$FILE_PATH" 2>/dev/null; then
  if ! grep -qE '\.set\(\s*\{\s*\}\s*,\s*\{\s*\}\s*,\s*[0-9]' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ GSAP: timeline without tl.set({}, {}, 1.0) — animations may compress into first 10% of scroll in ${BASENAME}"
  fi
fi

# 4. GSAP imported directly from "gsap" instead of a centralized setup
if grep -qE "from\s+['\"]gsap['\"]" "$FILE_PATH" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ GSAP: direct import from \"gsap\" — use a centralized GSAP setup file for unified plugin registration in ${BASENAME}"
fi

# 5. Animations outside gsap.context()
if grep -qE 'gsap\.(to|from|fromTo|timeline)\(' "$FILE_PATH" 2>/dev/null; then
  if ! grep -q 'gsap\.context(' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ GSAP: animations without gsap.context() — may cause cleanup issues on unmount in ${BASENAME}"
  fi
fi

# Output warnings
if [ -n "$WARNINGS" ]; then
  echo -e "\nGSAP pattern check:${WARNINGS}"
  echo ""
fi

exit 0
