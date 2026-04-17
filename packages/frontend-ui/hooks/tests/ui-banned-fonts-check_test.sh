#!/bin/bash
# ui-banned-fonts-check_test.sh — regression tests
# Usage: bash packages/frontend-ui/hooks/tests/ui-banned-fonts-check_test.sh
# Exit codes: 0 if all pass, 1 on first failure.

set -u

HOOK=$(cd "$(dirname "$0")/.." && pwd)/ui-banned-fonts-check.sh
PASS=0
FAIL=0

expect_warning() {
  local name="$1"; local payload="$2"
  local out
  out=$(echo "$payload" | bash "$HOOK" 2>&1 >/dev/null || true)
  if echo "$out" | grep -q "reflex-list font detected"; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected warning, got none"
    FAIL=$((FAIL + 1))
  fi
}

expect_silent() {
  local name="$1"; local payload="$2"
  local out
  out=$(echo "$payload" | bash "$HOOK" 2>&1 >/dev/null || true)
  if [ -z "$out" ]; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected silent, got warning: $(echo "$out" | head -1)"
    FAIL=$((FAIL + 1))
  fi
}

echo "── ui-banned-fonts-check.sh tests ──"

expect_warning "A) Inter in font-family on .css" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{font-family:Inter,sans-serif;}"}}'

expect_warning "B) DM Sans in Tailwind font- utility on .tsx" \
  '{"tool_input":{"file_path":"/tmp/x.tsx","new_string":"<h1 className=\"font-[DM Sans]\">Hi</h1>"}}'

expect_warning "C) Playfair Display via Google Fonts import" \
  '{"tool_input":{"file_path":"/tmp/x.html","new_string":"<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700\" rel=\"stylesheet\">"}}'

expect_warning "D) Space Grotesk in CSS font-family" \
  '{"tool_input":{"file_path":"/tmp/x.scss","new_string":"body{font-family: \"Space Grotesk\", sans-serif;}"}}'

expect_silent "E) Non-UI file (.go) silent" \
  '{"tool_input":{"file_path":"/tmp/x.go","new_string":"func Inter() {}"}}'

expect_silent "F) JS variable named inter — not a font-family — silent" \
  '{"tool_input":{"file_path":"/tmp/x.ts","new_string":"const inter = 42;"}}'

expect_silent "G) Acceptable font (Söhne) silent" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":"body{font-family: \"Söhne\", sans-serif;}"}}'

# Opt-out test needs env var set for the hook subshell, not the helper
out=$(echo '{"tool_input":{"file_path":"/tmp/x.css","new_string":"body{font-family:Inter;}"}}' | CLAUDE_DISABLE_UI_FONT_CHECK=1 bash "$HOOK" 2>&1 >/dev/null || true)
if [ -z "$out" ]; then
  echo "  ✓ H) Opt-out via CLAUDE_DISABLE_UI_FONT_CHECK"
  PASS=$((PASS + 1))
else
  echo "  ✗ H) Opt-out failed — got output: $out"
  FAIL=$((FAIL + 1))
fi

expect_silent "I) Code-block path (syntax-highlighter) silent" \
  '{"tool_input":{"file_path":"/tmp/syntax-highlighter.css","new_string":"pre{font-family:Space Mono;}"}}'

echo ""
echo "── Results ──"
echo "  Pass: $PASS  Fail: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
