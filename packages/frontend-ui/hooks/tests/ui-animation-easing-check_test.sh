#!/bin/bash
set -u
HOOK=$(cd "$(dirname "$0")/.." && pwd)/ui-animation-easing-check.sh
PASS=0; FAIL=0

expect_warn() {
  local name="$1"; local needle="$2"; local payload="$3"
  local out
  out=$(echo "$payload" | bash "$HOOK" 2>&1 >/dev/null || true)
  if echo "$out" | grep -q "$needle"; then
    echo "  ✓ $name"; PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected '$needle', got: $(echo "$out" | head -2)"
    FAIL=$((FAIL + 1))
  fi
}

expect_silent() {
  local name="$1"; local payload="$2"
  local out
  out=$(echo "$payload" | bash "$HOOK" 2>&1 >/dev/null || true)
  if [ -z "$out" ]; then
    echo "  ✓ $name"; PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected silent, got: $(echo "$out" | head -1)"
    FAIL=$((FAIL + 1))
  fi
}

echo "── ui-animation-easing-check.sh tests ──"

expect_warn "A) ease-in on transition" "ease-in" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:transform 200ms ease-in;}"}}'

expect_silent "B) ease-in-out is fine" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:transform 200ms ease-in-out;}"}}'

expect_silent "C) ease-out is fine" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:transform 200ms ease-out;}"}}'

expect_warn "D) transition: all" "transition: all" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:all 300ms;}"}}'

expect_warn "E) Tailwind transition-all" "Tailwind transition-all" \
  '{"tool_input":{"file_path":"/tmp/x.tsx","new_string":"<div className=\"transition-all duration-300\">"}}'

expect_warn "F) scale(0) in transform" "scale(0)" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".enter{transform:scale(0);}"}}'

expect_silent "G) scale(0.95) is fine" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".enter{transform:scale(0.95);}"}}'

expect_warn "H) Tailwind scale-0" "Tailwind scale-0" \
  '{"tool_input":{"file_path":"/tmp/x.tsx","new_string":"<div className=\"scale-0 data-[state=open]:scale-100\">"}}'

expect_warn "I) transitioning width" "width/height" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:width 300ms ease-out;}"}}'

expect_warn "J) transitioning height" "width/height" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:height 300ms;}"}}'

expect_silent "K) transitioning transform + opacity is fine" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:transform 200ms ease-out, opacity 200ms ease-out;}"}}'

expect_silent "L) Non-UI file silent" \
  '{"tool_input":{"file_path":"/tmp/x.go","new_string":"// transition all"}}'

out=$(echo '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{transition:all 300ms;}"}}' | CLAUDE_DISABLE_UI_ANIM_CHECK=1 bash "$HOOK" 2>&1 >/dev/null || true)
if [ -z "$out" ]; then
  echo "  ✓ M) Opt-out via CLAUDE_DISABLE_UI_ANIM_CHECK"; PASS=$((PASS + 1))
else
  echo "  ✗ M) Opt-out failed"; FAIL=$((FAIL + 1))
fi

echo ""
echo "── Results ──"
echo "  Pass: $PASS  Fail: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
