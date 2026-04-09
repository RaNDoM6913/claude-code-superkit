#!/bin/bash
# bundle-size-warn.sh — PostToolUse hook for Edit/Write
# Warns on heavy package imports that bloat bundle size.
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

# Get the content that was written/edited
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')

if [ -z "$CONTENT" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
WARNINGS=""

# 1. moment.js (67kb gzipped)
if echo "$CONTENT" | grep -qE "from\s+['\"]moment['\"]|require\s*\(\s*['\"]moment['\"]\s*\)" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: moment (67kb gzipped) — consider date-fns or dayjs as lighter alternatives in ${BASENAME}"
fi

# 2. lodash full import (71kb gzipped)
if echo "$CONTENT" | grep -qE "from\s+['\"]lodash['\"]|require\s*\(\s*['\"]lodash['\"]\s*\)" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: lodash full import (71kb gzipped) — use lodash-es with named imports (import { debounce } from 'lodash-es') in ${BASENAME}"
fi

# 3. import * as THREE (600kb+)
if echo "$CONTENT" | grep -qE "import\s+\*\s+as\s+THREE" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: import * as THREE (600kb+) — use named imports (import { Scene, Mesh } from 'three') or dynamic import() for code splitting in ${BASENAME}"
fi

# 4. chart.js (200kb+ gzipped)
if echo "$CONTENT" | grep -qE "from\s+['\"]chart\.js['\"]|require\s*\(\s*['\"]chart\.js['\"]\s*\)" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: chart.js (200kb+) — use tree-shaking imports: import { Chart, LineController } from 'chart.js' in ${BASENAME}"
fi

# 5. @mui/material (300kb+)
if echo "$CONTENT" | grep -qE "from\s+['\"]@mui/material['\"]" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: @mui/material barrel import (300kb+) — use deep imports: import Button from '@mui/material/Button' in ${BASENAME}"
fi

# 6. antd (350kb+)
if echo "$CONTENT" | grep -qE "from\s+['\"]antd['\"]" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: antd barrel import (350kb+) — use babel-plugin-import or import { Button } from 'antd' with tree-shaking in ${BASENAME}"
fi

# 7. framer-motion (140kb)
if echo "$CONTENT" | grep -qE "from\s+['\"]framer-motion['\"]" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n  ⚠ Bundle: framer-motion (140kb) — consider motion/react (lighter) or CSS animations for simple transitions in ${BASENAME}"
fi

# 8. Generic namespace import warning (import * as)
if echo "$CONTENT" | grep -qE "import\s+\*\s+as\s+" 2>/dev/null; then
  # Don't double-warn on THREE which is already covered
  if ! echo "$CONTENT" | grep -qE "import\s+\*\s+as\s+THREE" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n  ⚠ Bundle: namespace import (import * as) defeats tree-shaking — prefer named imports in ${BASENAME}"
  fi
fi

# Output warnings
if [ -n "$WARNINGS" ]; then
  echo -e "\nBundle size check:${WARNINGS}"
  echo ""
fi

exit 0
