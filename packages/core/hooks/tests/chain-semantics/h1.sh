#!/bin/bash
# h1.sh — test hook: exits 2 with a diagnostic line on stderr.
# Used to probe whether exit 2 in one hook suppresses peer hooks.

LOG="${CHAIN_TEST_LOG:-${TMPDIR:-/tmp}/claude-chain-test.log}"
printf '%s h1 start (pid=%d ppid=%d)\n' "$(date +%H:%M:%S.%N)" "$$" "$PPID" >> "$LOG"
# Sleep a bit so concurrent peers can be observed in the log
sleep 0.3
printf '%s h1 exit=2\n' "$(date +%H:%M:%S.%N)" >> "$LOG"
echo "h1: this hook intentionally exits 2" >&2
exit 2
