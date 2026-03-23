---
description: Start full local stack (Docker + backend + bots + frontends + named tunnel)
allowed-tools: Bash
---

# Start Full Local Stack (Claude Code)

Uses dedicated Claude Code scripts with separate PID tracking to avoid conflicts with Codex.

## Steps

1. Run the Claude Code start script:
```bash
bash .claude/scripts/start.sh
```

2. Wait for all services to start and report the status to the user.

## Pre-Start Cleanup (automatic)

The start script automatically:
1. **Unloads LaunchAgents** — prevents `com.myapp.*` services from conflicting
2. **Runs full stop** — kills tracked PIDs + orphan processes from crashed sessions
3. **Kills zombies** — force-kills any remaining `go run`, `vite`, `npm dev`, `cloudflared` by pattern

## What Gets Started

- **Docker infra**: PostgreSQL, Redis, MinIO
- **Backend API**: port 8080
- **Admin Login**: port 8082
- **Admin Frontend**: port 5175
- **User Frontend**: port 5176
- **User Bot** (your-user-bot)
- **Moderator Bot** (your-moderator-bot)
- **Support Bot** (your-support-bot)
- **Named Cloudflare tunnel** (myapp-tunnel → *.example.com)

## After Start

- Logs: `~/.config/myapp/claude-code/logs/`
- PIDs: `~/.config/myapp/claude-code/pids`
- Stop: `/stop` or `bash .claude/scripts/stop.sh`
- Stop + Docker: `/stop-docker` or `bash .claude/scripts/stop.sh --with-docker`

$ARGUMENTS
