#!/usr/bin/env bash
# Project-specific: replace with your stop script.
#
# This script originally stopped all services started by start.sh:
#   1. Unloaded LaunchAgents (macOS) to prevent auto-restart
#   2. Killed tracked PIDs from the pids file
#   3. Killed orphan processes by pattern (go run, vite, npm dev, etc.)
#   4. Optionally stopped Docker containers (--with-docker flag)
#   5. Verified no processes remain
#
# Key patterns to reuse:
#   - Graceful kill: kill PID, sleep 0.3, kill -9 PID if still running
#   - Pattern matching: pgrep -f "pattern" | xargs kill
#   - State cleanup: rm -f "$PIDS_FILE"

echo "Replace this stub with your project's stop script."
exit 1
