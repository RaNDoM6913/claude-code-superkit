#!/bin/bash
# superkit-update_test.sh — acceptance suite for the pristine-preserve auto-updater
# (packages/core/hooks/superkit-update.sh, the D1 root-defect fix).
#
# Everything runs inside a throwaway mktemp workspace: a FAKE kit git repo (three
# tags v0.0.1/v0.0.2/v0.0.3) and FAKE consumer .claude/ trees. This suite NEVER
# points at the real clone or at any real consumer — the SUPERKIT_SOURCE the
# updater sees is always the fixture repo.
#
# Assertions (per the D1 acceptance contract):
#   (a) pristine-at-baseline file  → overwritten with the new version's content
#   (b) customized file (no tag match) → preserved byte-identical AND reported
#   (c) stale file matching an OLDER released tag → overwritten (second-chance walk)
#   (d) internal manifest file → never overwritten AND never newly copied
#   (e) file absent in consumer → created (incl. NEW coverage: references, hooks/lib, stack-rules)
#   (f) meta baseline tag missing → fail-safe: no-match files preserved, tag-matches still sync
#   plus: self-bootstrap replaces a differing installed copy before syncing.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
NEW_UPDATER="$REPO_ROOT/packages/core/hooks/superkit-update.sh"

PASS=0; FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
# chk <label> <file> <expected-content>
chk() {
  if [ -f "$2" ] && [ "$(cat "$2" 2>/dev/null)" = "$3" ]; then
    pass "$1"
  else
    fail "$1 (got: $(cat "$2" 2>/dev/null || echo '<MISSING>'))"
  fi
}

WORK=$(mktemp -d 2>/dev/null) || { echo "FAIL: mktemp"; exit 1; }
trap 'rm -rf "$WORK"' EXIT

SRC="$WORK/kit"                       # fake kit repo → SUPERKIT_SOURCE
export HOME="$WORK/home"; mkdir -p "$HOME/.claude"   # isolate rate-limit file

wf() { mkdir -p "$(dirname "$1")"; printf '%s\n' "$2" > "$1"; }

# ── Build the fake kit git repo ──────────────────────────────────────
mkdir -p "$SRC"
git -C "$SRC" init -q
git -C "$SRC" config user.email t@example.com
git -C "$SRC" config user.name test
git -C "$SRC" config commit.gpgsign false

P="$SRC/packages"
cp "$NEW_UPDATER" "$P/core/hooks/superkit-update.sh" 2>/dev/null || { mkdir -p "$P/core/hooks"; cp "$NEW_UPDATER" "$P/core/hooks/superkit-update.sh"; }
chmod +x "$P/core/hooks/superkit-update.sh"

# manifest + the three repo-only internal files it names
wf "$P/core/INTERNAL-FILES" "$(printf '# fixture manifest\nhooks/superkit-counts-verify.sh\nhooks/verify-hooks.sh\nrules/superkit-integrity.md')"
wf "$P/core/hooks/superkit-counts-verify.sh" "internal-counts"
wf "$P/core/hooks/verify-hooks.sh"           "internal-verify"
wf "$P/core/rules/superkit-integrity.md"     "internal-rule"

# static files (unchanged across tags) — exercise the NEW coverage surfaces
wf "$P/core/agents/newfile.md"                   "NEWFILE-CONTENT"   # (e) absent → created
wf "$P/core/hooks/lib/profile.sh"                "LIBPROFILE"        # hooks/lib coverage
wf "$P/core/skills/demo/SKILL.md"                "SKILL-BODY"
wf "$P/stack-agents/go/goagent.md"               "GOAGENT"
wf "$P/stack-agents/go/references/ref.md"        "REF-DOC"           # references coverage
wf "$P/stack-rules/go/gosafe.md"                 "GOSAFE"            # stack-rules coverage
wf "$P/stack-hooks/go/gohook.sh"                 "GOHOOK"
wf "$P/core/docs-templates/adr-template.md"      "ADR-TEMPLATE-BODY" # project-root ADR template (create-if-missing)

# versioned files: pristine.md, ahook.sh, custom.md change every release
write_v() {
  wf "$P/core/agents/pristine.md" "P$1"
  wf "$P/core/hooks/ahook.sh"     "S$1"
  wf "$P/core/rules/custom.md"    "R$1"
}
commit_tag() { echo "$1" > "$SRC/VERSION"; write_v "$2"; git -C "$SRC" add -A; git -C "$SRC" commit -qm "$1"; git -C "$SRC" tag "v$1"; }
commit_tag 0.0.1 1
commit_tag 0.0.2 2
commit_tag 0.0.3 3   # HEAD / working tree → source VERSION 0.0.3

# ── Build a fresh fake consumer ──────────────────────────────────────
build_consumer() {  # $1 = consumer root, $2 = meta baseline version
  local C="$1" ver="$2"
  rm -rf "$C"
  mkdir -p "$C/.claude/scripts/hooks/lib" "$C/.claude/agents/references" \
           "$C/.claude/rules" "$C/.claude/commands" "$C/.claude/skills"
  cat > "$C/.claude/.superkit-meta" <<EOF
SUPERKIT_SOURCE="$SRC"
SUPERKIT_VERSION="$ver"
SUPERKIT_STACKS="go"
SUPERKIT_EXTRAS=""
SUPERKIT_PROFILE="standard"
EOF
  # Installed updater = the fixed script PLUS a marker → differs from source →
  # forces the self-bootstrap path (as a real stale install would).
  cp "$NEW_UPDATER" "$C/.claude/scripts/hooks/superkit-update.sh"
  printf '# LOCAL-STUB-MARKER\n' >> "$C/.claude/scripts/hooks/superkit-update.sh"
  chmod +x "$C/.claude/scripts/hooks/superkit-update.sh"
  # planted consumer files
  wf "$C/.claude/agents/pristine.md"                        "P2"          # (a) pristine @ v0.0.2
  wf "$C/.claude/scripts/hooks/ahook.sh"                    "S1"          # (c) matches older tag v0.0.1
  wf "$C/.claude/rules/custom.md"                           "LOCAL-EDIT"  # (b) customized
  wf "$C/.claude/scripts/hooks/superkit-counts-verify.sh"   "PLANTED"     # (d) internal planted
  # newfile.md / references/ref.md / lib/profile.sh / gosafe.md / gohook.sh / skills → absent (e)
}

run_updater() {  # $1 = consumer root ; echoes combined stdout+stderr
  CLAUDE_PROJECT_DIR="$1" bash "$1/.claude/scripts/hooks/superkit-update.sh" 2>&1
}

# ─────────────────────────────────────────────────────────────────────
# MAIN RUN — baseline meta 0.0.2 (tag exists), source 0.0.3
# ─────────────────────────────────────────────────────────────────────
echo "── main run: meta baseline v0.0.2 → source 0.0.3"
CONSUMER="$WORK/consumer"
build_consumer "$CONSUMER" 0.0.2
OUT="$(run_updater "$CONSUMER")"
echo "$OUT" | sed 's/^/   [out] /'

chk "(a) pristine@v0.0.2 → overwritten to new (P3)"            "$CONSUMER/.claude/agents/pristine.md" "P3"
chk "(c) stale matching older tag v0.0.1 → overwritten (S3)"   "$CONSUMER/.claude/scripts/hooks/ahook.sh" "S3"
chk "(b) customized (no tag match) → preserved byte-identical" "$CONSUMER/.claude/rules/custom.md" "LOCAL-EDIT"
if echo "$OUT" | grep -qF "$CONSUMER/.claude/rules/custom.md"; then
  pass "(b) customized file named in the report"
else
  fail "(b) customized file NOT named in report"
fi
chk "(d) internal file planted in consumer → NOT overwritten"  "$CONSUMER/.claude/scripts/hooks/superkit-counts-verify.sh" "PLANTED"
if [ ! -e "$CONSUMER/.claude/scripts/hooks/verify-hooks.sh" ]; then
  pass "(d) internal verify-hooks.sh absent → never newly copied"
else
  fail "(d) internal verify-hooks.sh was copied into consumer"
fi
if [ ! -e "$CONSUMER/.claude/rules/superkit-integrity.md" ]; then
  pass "(d) internal superkit-integrity.md absent → never newly copied"
else
  fail "(d) internal superkit-integrity.md was copied into consumer"
fi
chk "(e) absent core agent → created"          "$CONSUMER/.claude/agents/newfile.md" "NEWFILE-CONTENT"
chk "(e) absent reference doc → created"       "$CONSUMER/.claude/agents/references/ref.md" "REF-DOC"
chk "(e) absent hooks/lib file → created"      "$CONSUMER/.claude/scripts/hooks/lib/profile.sh" "LIBPROFILE"
chk "(e) absent stack-rule → created"          "$CONSUMER/.claude/rules/gosafe.md" "GOSAFE"
chk "(e) absent stack-hook → created"          "$CONSUMER/.claude/scripts/hooks/gohook.sh" "GOHOOK"
chk "(e) absent skill file → created"          "$CONSUMER/.claude/skills/demo/SKILL.md" "SKILL-BODY"
chk "(e) absent ADR template → created at project root" "$CONSUMER/docs-templates/adr-template.md" "ADR-TEMPLATE-BODY"

# self-bootstrap: the installed copy must have been replaced by the source copy
if grep -qF 'LOCAL-STUB-MARKER' "$CONSUMER/.claude/scripts/hooks/superkit-update.sh"; then
  fail "bootstrap: installed updater still carries the stub marker (not replaced)"
else
  pass "bootstrap: installed updater replaced by source copy before sync"
fi
# report line shape + K skipped == 3 internal
if echo "$OUT" | grep -qE '^superkit-update: [0-9]+ synced · [0-9]+ preserved .* · 3 skipped \(internal\)'; then
  pass "report: compact summary line with 3 internal skipped"
else
  fail "report: summary line missing/malformed"
fi
# meta version bumped to the new source version
if grep -q 'SUPERKIT_VERSION="0.0.3"' "$CONSUMER/.claude/.superkit-meta"; then
  pass "meta version bumped 0.0.2 → 0.0.3"
else
  fail "meta version not bumped"
fi

# ─────────────────────────────────────────────────────────────────────
# (f) MISSING BASELINE TAG — meta 0.0.9 (no v0.0.9 tag in the fixture)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (f) run: meta baseline v0.0.9 MISSING → source 0.0.3"
CONSUMER_F="$WORK/consumer_f"
build_consumer "$CONSUMER_F" 0.0.9
OUT_F="$(run_updater "$CONSUMER_F")"
echo "$OUT_F" | sed 's/^/   [out] /'

chk "(f) missing baseline: customized file preserved (fail-safe)" "$CONSUMER_F/.claude/rules/custom.md" "LOCAL-EDIT"
if echo "$OUT_F" | grep -qF "$CONSUMER_F/.claude/rules/custom.md"; then
  pass "(f) preserved file reported"
else
  fail "(f) preserved file not reported"
fi
chk "(f) missing baseline: file matching walked tag v0.0.1 still synced" "$CONSUMER_F/.claude/scripts/hooks/ahook.sh" "S3"

# ─────────────────────────────────────────────────────────────────────
# (g) ADR TEMPLATE — project-root, create-if-missing, never clobber/report
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (g) run: pre-existing ADR template stays untouched & unreported"
CONSUMER_G="$WORK/consumer_g"
build_consumer "$CONSUMER_G" 0.0.2
# Plant a locally-edited ADR template at the PROJECT root (not .claude/)
wf "$CONSUMER_G/docs-templates/adr-template.md" "MY-CUSTOM-ADR"
OUT_G="$(run_updater "$CONSUMER_G")"
echo "$OUT_G" | sed 's/^/   [out] /'

chk "(g) pre-existing ADR template → left untouched" "$CONSUMER_G/docs-templates/adr-template.md" "MY-CUSTOM-ADR"
if echo "$OUT_G" | grep -qF "$CONSUMER_G/docs-templates/adr-template.md"; then
  fail "(g) customized ADR template wrongly named in preserved report"
else
  pass "(g) ADR template NOT reported (doc template — silence is correct)"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -gt 0 ]; then
  echo "SUPERKIT-UPDATE TESTS FAILED ($FAIL/$TOTAL failed)"
  exit 1
fi
echo "ALL SUPERKIT-UPDATE TESTS PASSED ($PASS/$TOTAL)"
