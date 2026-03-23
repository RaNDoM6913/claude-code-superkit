---
description: Stop full local stack (services only, Docker stays running)
allowed-tools: Bash
---

# Stop Full Local Stack (Claude Code)

Stop all services started by Claude Code. Docker containers keep running by default.

## Steps

Run the Claude Code stop script:

```bash
bash .claude/scripts/stop.sh
```

For stopping Docker too (PostgreSQL, Redis, MinIO):

```bash
bash .claude/scripts/stop.sh --with-docker
```

Report the result to the user.

## What Gets Stopped

1. **LaunchAgents** — unloads all `com.myapp.*` plist files to prevent auto-restart
2. **Tracked PIDs** — kills processes from `~/.config/myapp/claude-code/pids`
3. **Orphan processes** — kills `go run`, `vite`, `npm dev`, `cloudflared` by pattern match
4. **Docker** (with `--with-docker`) — `docker compose down` for PostgreSQL, Redis, MinIO
5. **Verification** — checks no processes remain, warns if any survive

$ARGUMENTS
