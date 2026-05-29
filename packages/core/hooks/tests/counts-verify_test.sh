#!/bin/bash
# counts-verify_test.sh — regression test for superkit-counts-verify.sh (Task 19)
#
# Asserts:
#   1. the verifier PASSES (exit 0) on the current, correct repo (local commit)
#   2. a skewed README count is DETECTED (exit 2), then the README is restored
#   3. the network About check is gated: a local commit does NOT call `gh`,
#      while --check-remote / git push opt in
#
# Hermetic: README.md is backed up and restored via a trap, even on failure.
# The verifier resolves CLAUDE.md / README.md / packages/* relative to CWD,
# so the test runs from the repo root.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
HOOK="$REPO_ROOT/packages/core/hooks/superkit-counts-verify.sh"
[ -x "$HOOK" ] || { echo "FAIL: hook not executable at $HOOK"; exit 1; }
[ -f "$REPO_ROOT/README.md" ] || { echo "FAIL: README.md not found at repo root $REPO_ROOT"; exit 1; }

README="$REPO_ROOT/README.md"
BACKUP="$(mktemp "${TMPDIR:-/tmp}/counts-verify-readme-backup.XXXXXX")"
cp "$README" "$BACKUP"

restore() { cp "$BACKUP" "$README"; rm -f "$BACKUP"; }
trap restore EXIT

run_commit() {
  # Run the verifier as a git-commit PreToolUse payload from the repo root.
  # Force CHECK_REMOTE off so the test never makes a network call.
  ( cd "$REPO_ROOT" && echo '{"tool_input":{"command":"git commit -m test"}}' \
      | SUPERKIT_VERIFY_CHECK_REMOTE=0 bash "$HOOK" >/dev/null 2>&1 )
}

# ── Test 1: clean repo passes ─────────────────────────────────────────
if run_commit; then
  echo "PASS: verifier passes on the current correct repo"
else
  echo "FAIL: verifier should pass on the unmodified repo (exit non-zero)"
  exit 1
fi

# ── Test 2: skewed README count is detected ───────────────────────────
# Bump the "Core Agents" row number to a bogus value and confirm a block.
# Uses the same label anchor the verifier relies on.
LINE=$(grep -nE '^\| \*\*Core Agents\*\* \|' "$README" | head -1 | cut -d: -f1)
if [ -z "$LINE" ]; then
  echo "FAIL: could not find '| **Core Agents** |' row to skew"
  exit 1
fi
ORIG=$(sed -n "${LINE}p" "$README")
# Replace the first integer in the row cell with a clearly-wrong 999.
SKEWED=$(printf '%s' "$ORIG" | sed -E 's/(\| \*\*Core Agents\*\* \| )[0-9]+/\1999/')
if [ "$SKEWED" = "$ORIG" ]; then
  echo "FAIL: could not skew the Core Agents count (regex did not match)"
  exit 1
fi
# Write the skewed line back in place.
TMP_README="$(mktemp "${TMPDIR:-/tmp}/counts-verify-skewed.XXXXXX")"
awk -v ln="$LINE" -v repl="$SKEWED" 'NR==ln{print repl; next} {print}' "$README" > "$TMP_README"
cp "$TMP_README" "$README"
rm -f "$TMP_README"

if run_commit; then
  echo "FAIL: verifier should BLOCK when a README count is skewed"
  restore; trap - EXIT
  exit 1
else
  echo "PASS: verifier blocks on skewed README count"
fi

# Restore and confirm the repo is green again.
restore
trap - EXIT
if run_commit; then
  echo "PASS: verifier green again after restore"
else
  echo "FAIL: verifier should pass after restoring README"
  exit 1
fi

# ── Test 3: network check is gated off for local commits ──────────────
# Stub `gh` to touch a sentinel file when invoked. The verifier suppresses
# gh's stderr (2>/dev/null), so signal via a file instead of stderr.
# Prepend the stub dir to PATH so it wins over any real gh.
STUB_DIR="$(mktemp -d "${TMPDIR:-/tmp}/counts-verify-stub.XXXXXX")"
SENTINEL="$STUB_DIR/gh-was-called"
cat > "$STUB_DIR/gh" <<STUB
#!/bin/sh
touch "$SENTINEL"
# Emit an empty description so the verifier's [ -n "\$GH_DESC" ] guard skips
# the About comparison (no false block).
exit 0
STUB
chmod +x "$STUB_DIR/gh"

rm -f "$SENTINEL"
( cd "$REPO_ROOT" && echo '{"tool_input":{"command":"git commit -m test"}}' \
  | PATH="$STUB_DIR:$PATH" SUPERKIT_VERIFY_CHECK_REMOTE=0 bash "$HOOK" >/dev/null 2>&1 ) || true
if [ -f "$SENTINEL" ]; then
  echo "FAIL: local commit invoked gh (network check should be gated off)"
  rm -rf "$STUB_DIR"; exit 1
fi
echo "PASS: local commit does not invoke gh (network gated off)"

# --check-remote opts in: the stub gh IS called.
rm -f "$SENTINEL"
( cd "$REPO_ROOT" && echo '{"tool_input":{"command":"git commit -m test"}}' \
  | PATH="$STUB_DIR:$PATH" bash "$HOOK" --check-remote >/dev/null 2>&1 ) || true
if [ -f "$SENTINEL" ]; then
  echo "PASS: --check-remote invokes gh"
else
  echo "FAIL: --check-remote should invoke gh"
  rm -rf "$STUB_DIR"; exit 1
fi
rm -rf "$STUB_DIR"

echo ""
echo "ALL COUNTS-VERIFY TESTS PASSED"
