---
description: Apply or rollback database migrations
argument-hint: [up|down]
allowed-tools: Bash
---

# Database Migrations

Apply or rollback database migrations.

## Steps

If no argument is given, default to `up`:

```bash
cd /path/to/your-project/backend && make migrate-$ARGUMENTS
```

If `$ARGUMENTS` is empty, run:
```bash
cd /path/to/your-project/backend && make migrate-up
```

Report the result.

## Notes

- Migrations are in `backend/migrations/`
- Format: `000NNN_description.{up,down}.sql`
- Requires running PostgreSQL (Docker)
