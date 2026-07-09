#!/bin/bash
# mirror-invariants_test.sh — mirror-drift regression suite.
#
# Claude components and their Codex mirrors are hand-maintained copies. When a
# clause is edited on one side and not the other, the pair silently drifts.
# This suite pins invariant substrings on BOTH sides of each mirror pair, the
# same way ponytail's scripts/check-rule-copies.js pins its 9 substrings:
# drift on either side fails the suite.
#
# Pure read-only: `grep`/`find`/`ls` only. No writes, no network.
#
# ─────────────────────────────────────────────────────────────────────────────
#  MAINTENANCE CONTRACT
#  Every string pinned in the tables below is expected to appear VERBATIM on
#  BOTH sides of its mirror pair. If you edit a mirrored clause:
#    • edit BOTH files (the Claude agent AND its Codex SKILL/AGENTS mirror), and
#    • if the clause's wording legitimately changed, update the pin here too.
#  Never "fix" a failure by touching only one side — that IS the drift this
#  suite exists to catch.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# Resolve the repo root exactly like sibling suites (counts-verify_test.sh):
# tests → hooks → core → packages → repo root.
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

# assert_contains <label> <repo-relative-file> <fixed-substring>
# PASS when the file exists AND contains the literal substring; FAIL otherwise.
assert_contains() {
  local label="$1" file="$2" substr="$3"
  local path="$REPO_ROOT/$file"
  if [ ! -f "$path" ]; then
    echo "FAIL: $label — file not found: $file"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return
  fi
  if grep -qF -- "$substr" "$path"; then
    echo "PASS: $label — [$substr] present in $file"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: $label — [$substr] MISSING from $file"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ─── INVARIANT TABLE (GROUP 1 + GROUP 2 share these 6 pairs) ─────────────────
# Row format: <claude_file>::<codex_mirror>::<sub1>|<sub2>|<sub3>
# The three subs per row are the external-symbol Evidence-Gate clause: the
# reviewer must consult real symbols (go doc / node_modules / inspect.signature
# / cargo) rather than reason "from memory", and label anything unverified
# "ASSUMED". Both sides of every pair must carry all three.
MIRROR_PAIRS=(
  "packages/stack-agents/go/go-reviewer.md::packages/codex/skills/go-reviewer/SKILL.md::go doc|from memory|ASSUMED"
  "packages/stack-agents/go/go-error-reviewer.md::packages/codex/skills/go-error-reviewer/SKILL.md::go doc|from memory|ASSUMED"
  "packages/stack-agents/go/go-concurrency-reviewer.md::packages/codex/skills/go-concurrency-reviewer/SKILL.md::go doc|from memory|ASSUMED"
  "packages/stack-agents/typescript/ts-reviewer.md::packages/codex/skills/ts-reviewer/SKILL.md::node_modules|from memory|ASSUMED"
  "packages/stack-agents/python/py-reviewer.md::packages/codex/skills/py-reviewer/SKILL.md::inspect.signature|from memory|ASSUMED"
  "packages/stack-agents/rust/rs-reviewer.md::packages/codex/skills/rs-reviewer/SKILL.md::cargo|from memory|ASSUMED"
)

# GROUP 2: severity enum — every reviewer (Claude + Codex) must offer all three.
SEVERITY_TOKENS=("CRITICAL" "WARNING" "SUGGESTION")

# GROUP 3: the Solution Ladder coding-style clause, mirrored Claude → Codex.
SOLUTION_LADDER_FILES=(
  "packages/core/rules/coding-style.md"
  "packages/codex/AGENTS.md"
)
SOLUTION_LADDER_SUBS="Solution Ladder|Minimal never means fragile|YAGNI"

# GROUP 4: Go reference-doc count reconciliation.
GO_REF_DIR="packages/stack-agents/go/references"
GO_COUNT_FILE="CLAUDE.md"

# ── GROUP 1 — external-symbol Evidence Gate pins on both sides of each pair ──
echo "── GROUP 1: Evidence-Gate mirror pairs (both sides carry all 3 pins)"
for row in "${MIRROR_PAIRS[@]}"; do
  claude_file="${row%%::*}"
  rest="${row#*::}"
  codex_file="${rest%%::*}"
  subs="${rest##*::}"
  IFS='|' read -r -a sub_arr <<< "$subs"
  for s in "${sub_arr[@]}"; do
    assert_contains "G1 claude" "$claude_file" "$s"
    assert_contains "G1 codex " "$codex_file" "$s"
  done
done

# ── GROUP 2 — severity enum present in all 12 reviewers (6 Claude + 6 Codex) ─
echo ""
echo "── GROUP 2: severity enum (CRITICAL/WARNING/SUGGESTION) in all 12 reviewers"
for row in "${MIRROR_PAIRS[@]}"; do
  claude_file="${row%%::*}"
  rest="${row#*::}"
  codex_file="${rest%%::*}"
  for f in "$claude_file" "$codex_file"; do
    for tok in "${SEVERITY_TOKENS[@]}"; do
      assert_contains "G2" "$f" "$tok"
    done
  done
done

# ── GROUP 3 — Solution Ladder mirror ────────────────────────────────────────
echo ""
echo "── GROUP 3: Solution Ladder clause mirrored Claude ↔ Codex"
IFS='|' read -r -a sl_arr <<< "$SOLUTION_LADDER_SUBS"
for f in "${SOLUTION_LADDER_FILES[@]}"; do
  for s in "${sl_arr[@]}"; do
    assert_contains "G3" "$f" "$s"
  done
done

# ── GROUP 4 — Go reference count reconciliation ─────────────────────────────
echo ""
echo "── GROUP 4: Go reference count reconciles with CLAUDE.md structure note"
N=$(find "$REPO_ROOT/$GO_REF_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
LITERAL="# ${N} Go knowledge documents"
if grep -qF -- "$LITERAL" "$REPO_ROOT/$GO_COUNT_FILE"; then
  echo "PASS: G4 — $GO_COUNT_FILE reconciles: '$LITERAL' (=$N *.md in $GO_REF_DIR)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  # Surface what CLAUDE.md actually claims, for a clear expected-vs-found error.
  FOUND=$(grep -E 'Go knowledge documents' "$REPO_ROOT/$GO_COUNT_FILE" \
            | head -1 | sed -nE 's/.*# *([0-9]+) Go knowledge documents.*/\1/p')
  echo "FAIL: G4 — $GO_REF_DIR has $N *.md files, but $GO_COUNT_FILE says '${FOUND:-<none>} Go knowledge documents' (expected literal '$LITERAL')"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "MIRROR-INVARIANTS TESTS FAILED ($FAIL_COUNT/$TOTAL failed)"
  exit 1
fi
echo "ALL MIRROR-INVARIANTS TESTS PASSED ($PASS_COUNT/$TOTAL)"
