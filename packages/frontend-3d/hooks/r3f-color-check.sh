#!/bin/bash
# r3f-color-check.sh — PostToolUse hook for Edit/Write
# Checks Three.js / React Three Fiber color management anti-patterns.
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

# Only process .tsx/.jsx/.ts files
if [[ ! "$FILE_PATH" =~ \.(tsx|jsx|ts)$ ]]; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Only check files that import three or @react-three
if ! grep -qE "from\s+['\"](@react-three/|three)" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# 1. sRGBEncoding / LinearEncoding deprecated since Three.js r152
if grep -qE '(sRGBEncoding|LinearEncoding)' "$FILE_PATH" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ R3F: sRGBEncoding/LinearEncoding is deprecated since r152 — use texture.colorSpace = THREE.SRGBColorSpace or THREE.LinearSRGBColorSpace in ${BASENAME}"
fi

# 2. Texture loaded without explicit colorSpace assignment
if grep -qE '(useTexture|useLoader\s*\(\s*TextureLoader|new\s+TextureLoader)' "$FILE_PATH" 2>/dev/null; then
  if ! grep -qE '\.colorSpace\s*=' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ R3F: texture loaded without explicit colorSpace — set texture.colorSpace to avoid incorrect gamma in ${BASENAME}"
  fi
fi

# 3. MeshStandardMaterial on screen/display elements (should use meshBasicMaterial)
if grep -qiE '(meshStandardMaterial|MeshStandardMaterial)' "$FILE_PATH" 2>/dev/null; then
  if grep -qiE '(screen|display|monitor|ui|hud|overlay)' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ R3F: MeshStandardMaterial on screen/display mesh — consider meshBasicMaterial (no lighting needed for flat screens) in ${BASENAME}"
  fi
fi

# 4. Material with texture but no toneMapped prop
if grep -qE '(\bmap\s*=|\bmap:\s)' "$FILE_PATH" 2>/dev/null; then
  if grep -qE '(meshStandardMaterial|meshBasicMaterial|meshPhongMaterial|MeshStandardMaterial|MeshBasicMaterial|MeshPhongMaterial)' "$FILE_PATH" 2>/dev/null; then
    if ! grep -qE 'toneMapped' "$FILE_PATH" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n  ⚠ R3F: material with texture but no toneMapped prop — add toneMapped={false} for UI/screen textures to preserve colors in ${BASENAME}"
    fi
  fi
fi

# Output warnings
if [ -n "$WARNINGS" ]; then
  echo -e "\nR3F color management check:${WARNINGS}"
  echo ""
fi

exit 0
