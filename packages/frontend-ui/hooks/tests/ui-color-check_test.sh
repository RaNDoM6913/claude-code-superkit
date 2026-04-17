#!/bin/bash
set -u
HOOK=$(cd "$(dirname "$0")/.." && pwd)/ui-color-check.sh
PASS=0; FAIL=0

expect_warn() {
  local name="$1"; local needle="$2"; local payload="$3"
  local out
  out=$(echo "$payload" | bash "$HOOK" 2>&1 >/dev/null || true)
  if echo "$out" | grep -q "$needle"; then
    echo "  ✓ $name"; PASS=$((PASS + 1))
  else
    echo "  ✗ $name — expected warning containing '$needle', got: $(echo "$out" | head -2)"
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

echo "── ui-color-check.sh tests ──"

expect_warn "A) pure #000 in color" "Pure #000 or #fff" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{color:#000;}"}}'

expect_warn "B) pure #fff in background" "Pure #000 or #fff" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".b{background:#fff;}"}}'

expect_warn "C) rgb(0,0,0) in color" "Pure rgb" \
  '{"tool_input":{"file_path":"/tmp/x.tsx","new_string":"const s={color:\"rgb(0, 0, 0)\"};"}}'

expect_warn "D) Tailwind bg-black" "bg-black/bg-white" \
  '{"tool_input":{"file_path":"/tmp/x.tsx","new_string":"<div className=\"bg-black text-white\">"}}'

expect_warn "E) gradient text (background-clip+linear-gradient)" "Gradient text detected" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":"h1{background:linear-gradient(45deg,#f00,#00f);background-clip:text;color:transparent;}"}}'

expect_warn "F) purple-to-blue gradient" "Purple→blue gradient" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".hero{background:linear-gradient(135deg, purple 0%, blue 100%);}"}}'

expect_warn "G) 3+ hsl without oklch" "Multiple hsl" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":":root{--a:hsl(0 50% 50%);--b:hsl(120 50% 50%);--c:hsl(240 50% 50%);}"}}'

expect_silent "H) oklch-only palette silent" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":":root{--a:oklch(50% 0.1 260);--b:oklch(40% 0.1 260);}"}}'

expect_silent "I) Non-UI file silent" \
  '{"tool_input":{"file_path":"/tmp/x.go","new_string":"func black() string { return \"#000\" }"}}'

expect_silent "J) box-shadow with rgba(0,0,0,0.5) — not a color declaration on color/background" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{box-shadow:0 2px 4px rgba(0,0,0,0.5);}"}}'

expect_silent "K) Single hsl (not palette) silent" \
  '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{color:hsl(200 50% 50%);}"}}'

out=$(echo '{"tool_input":{"file_path":"/tmp/x.css","new_string":".a{color:#000;}"}}' | CLAUDE_DISABLE_UI_COLOR_CHECK=1 bash "$HOOK" 2>&1 >/dev/null || true)
if [ -z "$out" ]; then
  echo "  ✓ L) Opt-out via CLAUDE_DISABLE_UI_COLOR_CHECK"; PASS=$((PASS + 1))
else
  echo "  ✗ L) Opt-out failed"; FAIL=$((FAIL + 1))
fi

echo ""
echo "── Results ──"
echo "  Pass: $PASS  Fail: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
