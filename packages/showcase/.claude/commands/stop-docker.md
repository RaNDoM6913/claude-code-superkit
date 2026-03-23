---
description: Stop full local stack INCLUDING Docker (PostgreSQL, Redis, MinIO)
allowed-tools: Bash
---

# Stop Everything Including Docker (Claude Code)

Stop all services started by Claude Code AND Docker containers.

## Steps

Run the stop script with `--with-docker` flag:

```bash
bash .claude/scripts/stop.sh --with-docker
```

Report the result to the user.

## What Gets Stopped

1. **LaunchAgents** — unloads all `com.myapp.*` plist files
2. **All services** — backend, bots, frontends, tunnel
3. **Orphan processes** — zombie `go run`, `vite`, `npm dev`
4. **Docker** — PostgreSQL, Redis, MinIO via `docker compose down`

$ARGUMENTS
