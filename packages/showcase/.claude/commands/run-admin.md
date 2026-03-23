---
description: Start admin panel — modes: live (default), demo (no backend), final (strict live + seed data)
argument-hint: "[demo|final] [--no-seed] [--seed-mode upsert|reset|clear]"
allowed-tools: Bash
---

# Run Admin Panel

Start the SocialApp admin panel in one of three modes.

## Mode Selection

Parse `$ARGUMENTS` to determine mode:
- **No args or "live"** → Live mode (Docker + backend + login + frontend)
- **"demo"** → Demo mode (frontend only, mock data, no backend/Docker)
- **"final"** → Final/strict mode (everything live, seed data, no mock fallbacks)

## Live Mode (default)

```bash
bash .codex/skills/run-admin/scripts/run_admin.sh
```

- **Docker infra**: PostgreSQL, Redis, MinIO
- **Backend API**: port 8080
- **Login backend**: port 8082
- **Frontend**: port 5173 (live auth mode)
- Admin login: http://localhost:5173
- Test user Telegram ID: 123456789 (LOGIN_DEV_MODE=true)

## Demo Mode

```bash
bash .codex/skills/run-admin-demo/scripts/run_admin_demo.sh
```

- **Frontend only**: port 5174 (all modes forced to mock)
- Login is skipped entirely
- No Docker or backend required
- Open: http://localhost:5174

## Final Mode

```bash
bash .codex/skills/run-admin-final/scripts/run_admin_final.sh $ARGUMENTS
```

- **Docker infra**: PostgreSQL, Redis, MinIO
- **Backend API**: port 8080
- **Login backend**: port 8082 (LOGIN_DEV_MODE=false)
- **Frontend**: port 5175 (strict live mode)
- **Seed data**: 6 test users + metrics + support + moderation + ads data
- Arguments: `--no-seed`, `--seed-mode upsert|reset|clear`
- Required env: `LOGIN_TELEGRAM_BOT_TOKEN`, `VITE_ADMIN_TELEGRAM_BOT_USERNAME`

## After Start

- Logs: `~/.config/myapp/run-admin/logs/`
- Stop: `/stop-admin`

$ARGUMENTS
