---
description: Stop local admin panel stack (live or demo)
argument-hint: [--with-docker] [--demo]
allowed-tools: Bash
---

# Stop Admin Panel

Stop running admin panel services.

## Steps

If the user wants to stop the demo (mock) frontend:
```bash
bash .codex/skills/stop-admin-demo/scripts/stop_admin_demo.sh
```

If the user wants to stop the live stack (default):
```bash
bash .codex/skills/stop-admin/scripts/stop_admin.sh $ARGUMENTS
```

## Options

- `--with-docker` — also stop Docker containers (postgres, redis, minio)
- `--demo` — stop mock frontend on port 5174 instead of live stack

$ARGUMENTS
