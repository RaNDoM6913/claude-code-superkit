#!/bin/bash
# internal-manifest_test.sh — guards the single-source-of-truth for repo-only
# files (packages/core/INTERNAL-FILES) and its two consumers.
#
# Three internal files must NEVER ship into a consumer's .claude/:
#   hooks/superkit-counts-verify.sh, hooks/verify-hooks.sh, rules/superkit-integrity.md
# The skip-list used to be hand-duplicated in lib/installer.js and
# superkit-counts-verify.sh (and missing from superkit-update.sh). This suite
# fails the moment either consumer re-hard-codes a name instead of reading the
# manifest, or the manifest itself drifts from the three expected entries.
#
# Pure read-only: `grep`/file tests only. No writes, no network.
set -uo pipefail

# Resolve the repo root exactly like sibling suites (counts-verify_test.sh):
# tests → hooks → core → packages → repo root.
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

MANIFEST_REL="packages/core/INTERNAL-FILES"
MANIFEST="$REPO_ROOT/$MANIFEST_REL"
INSTALLER="lib/installer.js"
HOOK="packages/core/hooks/superkit-counts-verify.sh"

# Exactly these three, no more, no fewer (see PROMPT D2: "Do not expand").
EXPECTED_ENTRIES=(
  "hooks/superkit-counts-verify.sh"
  "hooks/verify-hooks.sh"
  "rules/superkit-integrity.md"
)

PASS_COUNT=0
FAIL_COUNT=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ── Parse the manifest the same way its consumers do ────────────────────────
# Drop '#' comment lines and blanks; trim surrounding whitespace.
ENTRIES=()
if [ -f "$MANIFEST" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"   # ltrim
    line="${line%"${line##*[![:space:]]}"}"   # rtrim
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac
    ENTRIES+=("$line")
  done < "$MANIFEST"
fi

# ── (a) manifest exists with exactly the 3 expected entries ─────────────────
echo "── (a): manifest exists with exactly the 3 expected entries"
if [ ! -f "$MANIFEST" ]; then
  fail "(a) manifest not found: $MANIFEST_REL"
else
  if [ "${#ENTRIES[@]}" -eq "${#EXPECTED_ENTRIES[@]}" ]; then
    pass "(a) manifest has exactly ${#EXPECTED_ENTRIES[@]} entries"
  else
    fail "(a) manifest has ${#ENTRIES[@]} entries, expected ${#EXPECTED_ENTRIES[@]} (${ENTRIES[*]:-<none>})"
  fi
  # Every expected entry must be present.
  for want in "${EXPECTED_ENTRIES[@]}"; do
    found=0
    for got in "${ENTRIES[@]:-}"; do [ "$got" = "$want" ] && found=1; done
    if [ "$found" -eq 1 ]; then pass "(a) manifest lists '$want'"; else fail "(a) manifest MISSING '$want'"; fi
  done
  # No unexpected entry may sneak in.
  for got in "${ENTRIES[@]:-}"; do
    [ -z "$got" ] && continue
    ok=0
    for want in "${EXPECTED_ENTRIES[@]}"; do [ "$got" = "$want" ] && ok=1; done
    [ "$ok" -eq 1 ] || fail "(a) manifest has UNEXPECTED entry '$got' (do not expand without evidence)"
  done
fi

# ── (b) each entry resolves to an existing file under packages/core/ ────────
echo ""
echo "── (b): each entry resolves to an existing file under packages/core/"
for entry in "${ENTRIES[@]:-}"; do
  [ -z "$entry" ] && continue
  if [ -f "$REPO_ROOT/packages/core/$entry" ]; then
    pass "(b) packages/core/$entry exists"
  else
    fail "(b) packages/core/$entry does NOT exist"
  fi
done

# ── (c) both consumers reference the manifest by name ───────────────────────
echo ""
echo "── (c): installer.js and superkit-counts-verify.sh reference INTERNAL-FILES"
for f in "$INSTALLER" "$HOOK"; do
  if grep -qF -- "INTERNAL-FILES" "$REPO_ROOT/$f"; then
    pass "(c) $f references INTERNAL-FILES"
  else
    fail "(c) $f does NOT reference INTERNAL-FILES (must read the manifest)"
  fi
done

# ── (d) no internal file NAME hard-coded outside a FALLBACK-marked line ─────
# The only legitimate literal occurrences are the fallback constants that guard
# against a missing manifest — those lines are tagged FALLBACK. Any occurrence
# on a non-FALLBACK line means a consumer re-hard-coded the skip-list.
echo ""
echo "── (d): 'verify-hooks.sh' / 'superkit-integrity.md' appear only on FALLBACK lines"
assert_only_in_fallback() {
  local file="$1" literal="$2" path="$REPO_ROOT/$1" offenders
  # Lines that contain the literal but are NOT marked FALLBACK are offenders.
  offenders="$(grep -nF -- "$literal" "$path" 2>/dev/null | grep -v 'FALLBACK' || true)"
  if [ -n "$offenders" ]; then
    fail "(d) $file hard-codes '$literal' outside a FALLBACK line:"
    echo "$offenders" | sed 's/^/         /'
  elif grep -qF -- "$literal" "$path"; then
    pass "(d) $file: '$literal' only on FALLBACK line(s)"
  else
    # Absent entirely is also fine — nothing to hard-code — but flag it so a
    # silently-deleted fallback is noticed.
    fail "(d) $file: '$literal' not found at all (fallback removed?)"
  fi
}
assert_only_in_fallback "$INSTALLER" "verify-hooks.sh"
assert_only_in_fallback "$INSTALLER" "superkit-integrity.md"
assert_only_in_fallback "$HOOK"      "verify-hooks.sh"
assert_only_in_fallback "$HOOK"      "superkit-integrity.md"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "INTERNAL-MANIFEST TESTS FAILED ($FAIL_COUNT/$TOTAL failed)"
  exit 1
fi
echo "ALL INTERNAL-MANIFEST TESTS PASSED ($PASS_COUNT/$TOTAL)"
