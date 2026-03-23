#!/usr/bin/env bash
# Project-specific: replace with your start script.
#
# This script originally started a full local stack:
#   1. Docker infra (PostgreSQL, Redis, MinIO)
#   2. Backend API (Go, port 8080)
#   3. Admin login service (Go, port 8082)
#   4. Frontend dev servers (Vite, ports 5175/5176)
#   5. Telegram bots (moderator, support, user)
#   6. Cloudflare tunnel (named tunnel for HTTPS)
#
# It tracked PIDs in ~/.config/myapp/claude-code/pids
# and provided a companion stop.sh to kill everything cleanly.
#
# Key patterns to reuse:
#   - PID tracking: echo "service_name=$!" >> "$PIDS_FILE"
#   - Port detection: lsof -iTCP:"$port" -sTCP:LISTEN
#   - Wait for port: retry loop with sleep 1
#   - Pre-start cleanup: kill previous PIDs + orphan processes by pattern
#   - Binary builds: go build -o bin/name ./cmd/name (never go run in scripts)

echo "Replace this stub with your project's start script."
echo "See the original implementation comments above for patterns."
exit 1
