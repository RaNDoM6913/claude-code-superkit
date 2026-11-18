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
#   (j) self-contained packages (frontend-ui / frontend-3d) and SUPERKIT_EXTRAS
#       (flat agent + red-blue-auditor bundle) follow the same pristine rule
#   (k) ui-reviewer.md collision: one selected variant; pristine older copy of it →
#       refreshed, pristine core → upgraded to the umbrella, pristine umbrella →
#       never downgraded to core, customised → preserved and reported as a conflict
#   (l) meta file is parsed, not sourced; invalid stack/extra names are ignored
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
wf "$P/core/helpers/statusline.cjs"              "STATUSLINE-V3"     # (i) synced under the pristine rule
# (j) self-contained packages + extras (static across tags)
wf "$P/frontend-ui/hooks/ui-color-check.sh"            "UIHOOK"
wf "$P/frontend-ui/hooks/tests/ui-color-check_test.sh" "UITEST"         # never shipped
wf "$P/frontend-ui/rules/ui-rule.md"                   "UIRULE"
wf "$P/frontend-ui/skills/craft/SKILL.md"              "CRAFT"
wf "$P/frontend-3d/agents/r3f.md"                      "R3F"
wf "$P/frontend-3d/commands/capture-screen.md"         "CAPTURE"
wf "$P/frontend-3d/hooks/gsap.sh"                      "GSAP"
wf "$P/frontend-3d/skills/gltf/SKILL.md"               "GLTF"
wf "$P/extras/red-blue-auditor/agent.md"               "RBAGENT"
wf "$P/extras/red-blue-auditor/scan.sh"                "RBSCAN"
wf "$P/extras/design-system-reviewer.md"               "DSR"            # not in SUPERKIT_EXTRAS

# versioned files: pristine.md, ahook.sh, custom.md change every release
write_v() {
  wf "$P/core/agents/pristine.md" "P$1"
  wf "$P/core/hooks/ahook.sh"     "S$1"
  wf "$P/core/rules/custom.md"    "R$1"
  wf "$P/core/agents/ui-reviewer.md"                   "COREUI$1"   # (k) core variant
  wf "$P/frontend-ui/agents/ui-reviewer.md"            "UMB$1"      # (k) umbrella variant
  wf "$P/frontend-ui/agents/ui-color-reviewer.md"      "UICOLOR$1"
  wf "$P/frontend-3d/rules/threejs.md"                 "THREE$1"
  wf "$P/extras/bot-reviewer.md"                       "BOT$1"
  wf "$P/extras/red-blue-auditor/patterns/secrets.txt" "PAT$1"
}
commit_tag() { echo "$1" > "$SRC/VERSION"; write_v "$2"; git -C "$SRC" add -A; git -C "$SRC" commit -qm "$1"; git -C "$SRC" tag "v$1"; }
commit_tag 0.0.1 1
commit_tag 0.0.2 2
commit_tag 0.0.3 3   # HEAD / working tree → source VERSION 0.0.3

# ── Build a fresh fake consumer ──────────────────────────────────────
build_consumer() {  # $1 = consumer root, $2 = meta baseline version, [$3 stacks], [$4 extras]
  local C="$1" ver="$2" stacks="${3:-go}" extras="${4:-}"
  rm -rf "$C"
  mkdir -p "$C/.claude/scripts/hooks/lib" "$C/.claude/agents/references" \
           "$C/.claude/rules" "$C/.claude/commands" "$C/.claude/skills"
  cat > "$C/.claude/.superkit-meta" <<EOF
SUPERKIT_SOURCE="$SRC"
SUPERKIT_VERSION="$ver"
SUPERKIT_STACKS="$stacks"
SUPERKIT_EXTRAS="$extras"
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
chk "(i) absent statusline → created at .claude/scripts/" "$CONSUMER/.claude/scripts/statusline.cjs" "STATUSLINE-V3"

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

# ─────────────────────────────────────────────────────────────────────
# (i-fork) FORKED statusline.cjs → preserved (consumers legitimately fork it)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (i-fork) run: a forked statusline is preserved, not clobbered"
CONSUMER_I="$WORK/consumer_i"
build_consumer "$CONSUMER_I" 0.0.2
wf "$CONSUMER_I/.claude/scripts/statusline.cjs" "MY-FORKED-STATUSLINE"
OUT_I="$(run_updater "$CONSUMER_I")"
echo "$OUT_I" | sed 's/^/   [out] /'
chk "(i-fork) forked statusline → preserved byte-identical" "$CONSUMER_I/.claude/scripts/statusline.cjs" "MY-FORKED-STATUSLINE"
if echo "$OUT_I" | grep -qF "$CONSUMER_I/.claude/scripts/statusline.cjs"; then
  pass "(i-fork) forked statusline named in the preserved report"
else
  fail "(i-fork) forked statusline NOT reported"
fi

# ─────────────────────────────────────────────────────────────────────
# (h) MANIFEST FALLBACK — must be PER CATEGORY (v1.5.2 fix)
# A manifest that loses just one category's lines must still protect that
# category via the hard-coded fallback; the healthy category keeps reading
# from the manifest. Manifest mutations below are working-tree-only.
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (h) manifest fallback variants"
MANIFEST="$P/core/INTERNAL-FILES"
MANIFEST_BAK="$WORK/manifest.bak"
cp "$MANIFEST" "$MANIFEST_BAK"

# (h1) hooks-only manifest → rules category empty → rules MUST fall back
printf 'hooks/superkit-counts-verify.sh\nhooks/verify-hooks.sh\n' > "$MANIFEST"
C_H1="$WORK/consumer_h1"; build_consumer "$C_H1" 0.0.2
OUT_H1="$(run_updater "$C_H1")"
if [ ! -e "$C_H1/.claude/rules/superkit-integrity.md" ]; then
  pass "(h1) hooks-only manifest: superkit-integrity.md still NOT copied (rules fallback)"
else
  fail "(h1) hooks-only manifest: superkit-integrity.md LEAKED into consumer"
fi
if [ ! -e "$C_H1/.claude/scripts/hooks/verify-hooks.sh" ]; then
  pass "(h1) hooks-only manifest: hooks still skipped (from manifest)"
else
  fail "(h1) hooks-only manifest: verify-hooks.sh copied"
fi
if echo "$OUT_H1" | grep -q "no 'rules/' entries"; then
  pass "(h1) empty category warned on stderr"
else
  fail "(h1) no stderr warning for the empty rules category"
fi

# (h2) rules-only manifest → hooks category empty → hooks MUST fall back
printf 'rules/superkit-integrity.md\n' > "$MANIFEST"
C_H2="$WORK/consumer_h2"; build_consumer "$C_H2" 0.0.2
OUT_H2="$(run_updater "$C_H2")"
if [ ! -e "$C_H2/.claude/scripts/hooks/verify-hooks.sh" ]; then
  pass "(h2) rules-only manifest: verify-hooks.sh still NOT copied (hooks fallback)"
else
  fail "(h2) rules-only manifest: verify-hooks.sh LEAKED into consumer"
fi
if [ ! -e "$C_H2/.claude/rules/superkit-integrity.md" ]; then
  pass "(h2) rules-only manifest: rules still skipped (from manifest)"
else
  fail "(h2) rules-only manifest: superkit-integrity.md copied"
fi

# (h3) manifest present but ALL lines commented → both categories fall back
printf '# nothing here\n# hooks/superkit-counts-verify.sh\n' > "$MANIFEST"
C_H3="$WORK/consumer_h3"; build_consumer "$C_H3" 0.0.2
OUT_H3="$(run_updater "$C_H3")"
if [ ! -e "$C_H3/.claude/rules/superkit-integrity.md" ] && [ ! -e "$C_H3/.claude/scripts/hooks/verify-hooks.sh" ]; then
  pass "(h3) all-commented manifest: both categories fall back, nothing leaked"
else
  fail "(h3) all-commented manifest: an internal file leaked"
fi

# (h4) manifest MISSING entirely → both fall back, silently (pre-manifest clones)
rm -f "$MANIFEST"
C_H4="$WORK/consumer_h4"; build_consumer "$C_H4" 0.0.2
OUT_H4="$(run_updater "$C_H4")"
if [ ! -e "$C_H4/.claude/rules/superkit-integrity.md" ] && [ ! -e "$C_H4/.claude/scripts/hooks/verify-hooks.sh" ]; then
  pass "(h4) missing manifest: both categories fall back, nothing leaked"
else
  fail "(h4) missing manifest: an internal file leaked"
fi
if echo "$OUT_H4" | grep -q "entries"; then
  fail "(h4) missing manifest warned (should be silent — benign for pre-manifest clones)"
else
  pass "(h4) missing manifest stays silent"
fi

# (h5) complete manifest restored → all three skipped again (from the manifest)
cp "$MANIFEST_BAK" "$MANIFEST"
C_H5="$WORK/consumer_h5"; build_consumer "$C_H5" 0.0.2
OUT_H5="$(run_updater "$C_H5")"
if echo "$OUT_H5" | grep -qE '· 3 skipped \(internal\)' && [ ! -e "$C_H5/.claude/rules/superkit-integrity.md" ]; then
  pass "(h5) complete manifest: 3 internal skipped, no fallback needed"
else
  fail "(h5) complete manifest: skip accounting wrong"
fi

# ─────────────────────────────────────────────────────────────────────
# (j) SELF-CONTAINED PACKAGES + EXTRAS — same pristine rule as core
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (j) run: frontend-ui + frontend-3d + extras (bot-reviewer, red-blue-auditor)"
C_J="$WORK/consumer_j"
build_consumer "$C_J" 0.0.2 "go frontend-ui frontend-3d" "bot-reviewer red-blue-auditor"
wf "$C_J/.claude/agents/ui-color-reviewer.md"                   "UICOLOR2"     # pristine @ v0.0.2
wf "$C_J/.claude/rules/threejs.md"                              "MY-THREE"     # customised
wf "$C_J/.claude/agents/bot-reviewer.md"                        "BOT1"         # older tag
wf "$C_J/.claude/scripts/red-blue-auditor/patterns/secrets.txt" "MY-PATTERNS"  # customised
OUT_J="$(run_updater "$C_J")"
echo "$OUT_J" | sed 's/^/   [out] /'
chk "(j) frontend-ui agent pristine@v0.0.2 → updated"      "$C_J/.claude/agents/ui-color-reviewer.md" "UICOLOR3"
chk "(j) frontend-3d rule customised → preserved"          "$C_J/.claude/rules/threejs.md" "MY-THREE"
chk "(j) flat extra pristine@v0.0.1 → updated"             "$C_J/.claude/agents/bot-reviewer.md" "BOT3"
chk "(j) red-blue pattern customised → preserved"          "$C_J/.claude/scripts/red-blue-auditor/patterns/secrets.txt" "MY-PATTERNS"
chk "(j) absent frontend-ui hook → created"                "$C_J/.claude/scripts/hooks/ui-color-check.sh" "UIHOOK"
chk "(j) absent frontend-ui rule → created"                "$C_J/.claude/rules/ui-rule.md" "UIRULE"
chk "(j) absent frontend-ui skill → created"               "$C_J/.claude/skills/craft/SKILL.md" "CRAFT"
chk "(j) absent frontend-3d agent → created"               "$C_J/.claude/agents/r3f.md" "R3F"
chk "(j) absent frontend-3d command → created"             "$C_J/.claude/commands/capture-screen.md" "CAPTURE"
chk "(j) absent frontend-3d hook → created"                "$C_J/.claude/scripts/hooks/gsap.sh" "GSAP"
chk "(j) absent frontend-3d skill → created"               "$C_J/.claude/skills/gltf/SKILL.md" "GLTF"
chk "(j) absent bundled extra agent → created"             "$C_J/.claude/agents/red-blue-auditor.md" "RBAGENT"
chk "(j) absent red-blue scan.sh → created"                "$C_J/.claude/scripts/red-blue-auditor/scan.sh" "RBSCAN"
chk "(j) ui-reviewer: pristine core@v0.0.2 replaced by umbrella" "$C_J/.claude/agents/ui-reviewer.md" "UMB3"
for x in "$C_J/.claude/scripts/hooks/ui-color-check.sh" "$C_J/.claude/scripts/hooks/gsap.sh" "$C_J/.claude/scripts/red-blue-auditor/scan.sh"; do
  if [ -x "$x" ]; then pass "(j) executable: ${x#$C_J/}"; else fail "(j) not executable: ${x#$C_J/}"; fi
done
if [ ! -e "$C_J/.claude/scripts/hooks/tests" ] && [ ! -e "$C_J/.claude/scripts/hooks/ui-color-check_test.sh" ]; then
  pass "(j) package hooks/tests/ never shipped"
else
  fail "(j) package hooks/tests/ leaked into consumer"
fi
if [ ! -e "$C_J/.claude/agents/design-system-reviewer.md" ]; then
  pass "(j) extra not listed in SUPERKIT_EXTRAS → not created"
else
  fail "(j) unlisted extra was created"
fi
for x in "$C_J/.claude/rules/threejs.md" "$C_J/.claude/scripts/red-blue-auditor/patterns/secrets.txt"; do
  if echo "$OUT_J" | grep -qF "preserved: $x"; then pass "(j) preserved file reported: ${x#$C_J/}"; else fail "(j) preserved file NOT reported: ${x#$C_J/}"; fi
done
if echo "$OUT_J" | grep -qF "$C_J/.claude/agents/ui-reviewer.md"; then
  fail "(j) replaced pristine ui-reviewer wrongly reported as preserved"
else
  pass "(j) replaced ui-reviewer not reported as preserved"
fi
if grep -q 'SUPERKIT_VERSION="0.0.3"' "$C_J/.claude/.superkit-meta"; then
  pass "(j) meta version bumped after package + extras sync"
else
  fail "(j) meta version not bumped"
fi

# ─────────────────────────────────────────────────────────────────────
# (k) ui-reviewer COLLISION — one selected variant, same policy as installer
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (k) ui-reviewer collision policy"
C_K1="$WORK/consumer_k1"; build_consumer "$C_K1" 0.0.2 "frontend-ui"
wf "$C_K1/.claude/agents/ui-reviewer.md" "UMB1"
OUT_K1="$(run_updater "$C_K1")"
chk "(k1) frontend-ui: umbrella @v0.0.1 → updated umbrella" "$C_K1/.claude/agents/ui-reviewer.md" "UMB3"

C_K2="$WORK/consumer_k2"; build_consumer "$C_K2" 0.0.2 "frontend-ui"
wf "$C_K2/.claude/agents/ui-reviewer.md" "MY-UI-REVIEWER"
OUT_K2="$(run_updater "$C_K2")"
chk "(k2) frontend-ui: customised ui-reviewer → preserved" "$C_K2/.claude/agents/ui-reviewer.md" "MY-UI-REVIEWER"
if echo "$OUT_K2" | grep -F "preserved: $C_K2/.claude/agents/ui-reviewer.md" | grep -q "ui-reviewer conflict"; then
  pass "(k2) customised ui-reviewer reported as a conflict"
else
  fail "(k2) conflict not reported"
fi

C_K3="$WORK/consumer_k3"; build_consumer "$C_K3" 0.0.2 "go"
wf "$C_K3/.claude/agents/ui-reviewer.md" "COREUI1"
OUT_K3="$(run_updater "$C_K3")"
chk "(k3) core only: core @v0.0.1 → updated core" "$C_K3/.claude/agents/ui-reviewer.md" "COREUI3"

C_K4="$WORK/consumer_k4"; build_consumer "$C_K4" 0.0.2 "go"
wf "$C_K4/.claude/agents/ui-reviewer.md" "UMB2"
OUT_K4="$(run_updater "$C_K4")"
chk "(k4) core only: pristine older umbrella → kept (never downgraded)" "$C_K4/.claude/agents/ui-reviewer.md" "UMB2"
if echo "$OUT_K4" | grep -q "note: kept the frontend-ui umbrella $C_K4/.claude/agents/ui-reviewer.md"; then
  pass "(k4) kept umbrella noted in the report"
else
  fail "(k4) kept umbrella not noted"
fi
if echo "$OUT_K4" | grep -qF "preserved: $C_K4/.claude/agents/ui-reviewer.md"; then
  fail "(k4) pristine umbrella wrongly reported as locally customized"
else
  pass "(k4) pristine umbrella not counted as customized"
fi

C_K4B="$WORK/consumer_k4b"; build_consumer "$C_K4B" 0.0.2 "go"
wf "$C_K4B/.claude/agents/ui-reviewer.md" "UMB3"
OUT_K4B="$(run_updater "$C_K4B")"
chk "(k4b) core only: current umbrella → kept (never downgraded)" "$C_K4B/.claude/agents/ui-reviewer.md" "UMB3"

C_K5="$WORK/consumer_k5"; build_consumer "$C_K5" 0.0.2 "frontend-ui"
wf "$C_K5/.claude/agents/ui-reviewer.md" "UMB3"
OUT_K5="$(run_updater "$C_K5")"
chk "(k5) frontend-ui: current umbrella → untouched" "$C_K5/.claude/agents/ui-reviewer.md" "UMB3"
if echo "$OUT_K5" | grep -qF "$C_K5/.claude/agents/ui-reviewer.md"; then
  fail "(k5) current umbrella falsely reported as preserved"
else
  pass "(k5) current umbrella not reported"
fi

# ─────────────────────────────────────────────────────────────────────
# (l) META SAFETY — parsed, never sourced; invalid names ignored
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── (l) run: tampered meta (command substitution, traversal, glob, uppercase)"
C_L="$WORK/consumer_l"; build_consumer "$C_L" 0.0.2
{
  printf 'SUPERKIT_SOURCE="%s"\n' "$SRC"
  printf 'SUPERKIT_VERSION="0.0.2"\n'
  printf 'SUPERKIT_STACKS="go $(touch %s) ../stack-agents Frontend-UI frontend-3d"\n' "$WORK/PWNED-STACKS"
  printf 'SUPERKIT_EXTRAS="../../core/agents * bot-reviewer `touch %s`"\n' "$WORK/PWNED-EXTRAS"
  printf 'SUPERKIT_PROFILE="standard"\n'
} > "$C_L/.claude/.superkit-meta"
OUT_L="$(cd "$P/extras" && run_updater "$C_L")"
echo "$OUT_L" | sed 's/^/   [out] /'
if [ ! -e "$WORK/PWNED-STACKS" ] && [ ! -e "$WORK/PWNED-EXTRAS" ]; then
  pass "(l) no command substitution ran from the meta file"
else
  fail "(l) meta file content was executed"
fi
chk "(l) valid stack next to invalid ones still synced (frontend-3d)" "$C_L/.claude/agents/r3f.md" "R3F"
chk "(l) valid extra next to invalid ones still synced"              "$C_L/.claude/agents/bot-reviewer.md" "BOT3"
if [ ! -e "$C_L/.claude/agents/ui-color-reviewer.md" ]; then
  pass "(l) uppercase stack name ignored (frontend-ui not synced)"
else
  fail "(l) uppercase stack name was accepted"
fi
if [ ! -e "$C_L/.claude/agents/design-system-reviewer.md" ] && [ ! -e "$C_L/.claude/agents/red-blue-auditor.md" ]; then
  pass "(l) '*' extra not glob-expanded"
else
  fail "(l) '*' extra expanded to other extras"
fi
if grep -q 'SUPERKIT_VERSION="0.0.3"' "$C_L/.claude/.superkit-meta"; then
  pass "(l) parsed meta still drives the version bump"
else
  fail "(l) meta version not bumped"
fi

# (k6) LAST — needs an UNTAGGED source commit: the consumer holds the core
# variant's current source content, which matches no released tag. Selecting the
# umbrella must still treat it as pristine (cross-variant compare).
echo "COREUI-HEAD" > "$P/core/agents/ui-reviewer.md"
git -C "$SRC" add -A && git -C "$SRC" commit -qm "untagged core ui-reviewer"
C_K6="$WORK/consumer_k6"; build_consumer "$C_K6" 0.0.2 "frontend-ui"
wf "$C_K6/.claude/agents/ui-reviewer.md" "COREUI-HEAD"
OUT_K6="$(run_updater "$C_K6")"
chk "(k6) frontend-ui: untagged current core → replaced by umbrella" "$C_K6/.claude/agents/ui-reviewer.md" "UMB3"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -gt 0 ]; then
  echo "SUPERKIT-UPDATE TESTS FAILED ($FAIL/$TOTAL failed)"
  exit 1
fi
echo "ALL SUPERKIT-UPDATE TESTS PASSED ($PASS/$TOTAL)"
