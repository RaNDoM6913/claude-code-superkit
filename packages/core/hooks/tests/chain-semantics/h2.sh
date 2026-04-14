#!/bin/bash
# h2.sh — test hook: benign, sleeps mid-run, exit 0.
# Used to observe whether h1's exit 2 interrupts or lets peers finish.

LOG="${CHAIN_TEST_LOG:-${TMPDIR:-/tmp}/claude-chain-test.log}"
printf '%s h2 start (pid=%d ppid=%d)\n' "$(date +%H:%M:%S.%N)" "$$" "$PPID" >> "$LOG"
sleep 0.5
printf '%s h2 exit=0\n' "$(date +%H:%M:%S.%N)" >> "$LOG"
exit 0
