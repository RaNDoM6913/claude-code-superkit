#!/bin/bash
# h3.sh — test hook: touches a marker and exits 0.
# Presence of the marker after the experiment proves h3 ran despite h1's exit 2.

LOG="${CHAIN_TEST_LOG:-${TMPDIR:-/tmp}/claude-chain-test.log}"
MARKER="${CHAIN_TEST_MARKER:-${TMPDIR:-/tmp}/claude-chain-test-h3-ran}"
printf '%s h3 start (pid=%d ppid=%d)\n' "$(date +%H:%M:%S.%N)" "$$" "$PPID" >> "$LOG"
sleep 0.7
touch "$MARKER"
printf '%s h3 exit=0 (marker=%s)\n' "$(date +%H:%M:%S.%N)" "$MARKER" >> "$LOG"
exit 0
