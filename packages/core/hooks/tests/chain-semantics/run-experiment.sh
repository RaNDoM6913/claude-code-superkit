#!/bin/bash
# run-experiment.sh — runs h1, h2, h3 directly (not via Claude Code) using
# both sequential and background modes, so we can observe the mechanics of
# each approach in isolation.
#
# For the TRUE Claude Code behaviour you must copy settings-experiment.json
# into a test project's .claude/settings.json, open it in Claude Code,
# invoke a Bash tool, and inspect the log. This script only proves the hook
# scripts themselves work — not how Claude Code schedules them.
#
# Usage: bash run-experiment.sh

set -u
DIR=$(cd "$(dirname "$0")" && pwd)
export CHAIN_TEST_LOG="${TMPDIR:-/tmp}/claude-chain-test.log"
export CHAIN_TEST_MARKER="${TMPDIR:-/tmp}/claude-chain-test-h3-ran"

rm -f "$CHAIN_TEST_LOG" "$CHAIN_TEST_MARKER"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ SEQUENTIAL mode (what settings.json LOOKS like it does)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$DIR/h1.sh" >/dev/null 2>&1 && echo "  h1 exit=0"
H1_EXIT=$?
echo "  h1 exit=$H1_EXIT"
bash "$DIR/h2.sh" >/dev/null 2>&1
echo "  h2 exit=$?"
bash "$DIR/h3.sh" >/dev/null 2>&1
echo "  h3 exit=$?"
echo ""
echo "  LOG:"
sed 's/^/    /' "$CHAIN_TEST_LOG"
echo ""
[ -f "$CHAIN_TEST_MARKER" ] && echo "  h3 marker exists: YES" || echo "  h3 marker exists: NO"
rm -f "$CHAIN_TEST_LOG" "$CHAIN_TEST_MARKER"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ PARALLEL mode (what Anthropic docs say Claude Code actually does)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$DIR/h1.sh" >/dev/null 2>&1 &
bash "$DIR/h2.sh" >/dev/null 2>&1 &
bash "$DIR/h3.sh" >/dev/null 2>&1 &
wait
echo ""
echo "  LOG (sorted by timestamp — interleaving proves parallelism):"
sort "$CHAIN_TEST_LOG" | sed 's/^/    /'
echo ""
[ -f "$CHAIN_TEST_MARKER" ] && echo "  h3 marker exists: YES (h3 ran despite h1 exit 2)" || echo "  h3 marker exists: NO"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶ How to verify inside real Claude Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'HELP'
  1. Create a throwaway project:   mkdir /tmp/cc-chain-test && cd /tmp/cc-chain-test
  2. Copy the experiment settings: mkdir -p .claude && \
                                   cp <superkit>/packages/core/hooks/tests/chain-semantics/settings-experiment.json \
                                      .claude/settings.json
     (edit ${CLAUDE_PROJECT_DIR} substitutions to point at the superkit clone)
  3. Open Claude Code in that directory.
  4. Ask it to run any Bash command — e.g. "run: ls".
  5. Inspect /tmp/claude-chain-test.log (interleaving) and /tmp/claude-chain-test-h3-ran (presence).
  6. Record observations in CHAIN-SEMANTICS.md.
HELP
