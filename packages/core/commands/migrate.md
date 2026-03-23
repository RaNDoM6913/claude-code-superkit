---
description: Apply or rollback database migrations — auto-detects migration tool
argument-hint: "[up|down|down N|status]"
allowed-tools: Bash, Read, Glob
---

# Database Migrations

Apply or rollback database migrations with auto-detection of the migration tool.

## Target

$ARGUMENTS

## Step 1 — Detect Migration Tool

Scan the project for migration tool markers:

| Marker | Tool | Apply Command | Rollback Command |
|--------|------|--------------|-----------------|
| `Makefile` with `migrate-up` | Make | `make migrate-up` | `make migrate-down` |
| `Makefile` with `migrate` | Make | `make migrate` | `make migrate-rollback` |
| `golang-migrate` or numbered `.sql` pairs | golang-migrate | `migrate -path <dir> -database $DB up` | `migrate ... down 1` |
| `dbmate` in deps or PATH | dbmate | `dbmate up` | `dbmate down` |
| `alembic.ini` or `alembic/` | Alembic | `alembic upgrade head` | `alembic downgrade -1` |
| `prisma/` + `package.json` | Prisma | `npx prisma migrate deploy` | `npx prisma migrate reset` |
| `db/migrate/` + `Rakefile` | Rails | `rails db:migrate` | `rails db:rollback` |
| `drizzle.config.ts` | Drizzle | `npx drizzle-kit push` | (manual) |
| `knexfile.js` / `knexfile.ts` | Knex | `npx knex migrate:latest` | `npx knex migrate:rollback` |

If a `Makefile` target exists for migrations, prefer it — it may include environment setup.

## Step 2 — Execute Command

Based on `$ARGUMENTS`:

### up (default if no argument)
Apply all pending migrations:
```bash
<detected_apply_command>
```

### down
Rollback the last migration:
```bash
<detected_rollback_command>
```

### down N (e.g., "down 3")
Rollback N migrations:
- **golang-migrate**: `migrate ... down N`
- **Alembic**: `alembic downgrade -N`
- **Rails**: `rails db:rollback STEP=N`
- **Knex**: `npx knex migrate:rollback --all` (then migrate to target, or rollback N times in loop)

### status
Show migration status:
- **golang-migrate**: `migrate ... version`
- **Alembic**: `alembic current` + `alembic history`
- **Prisma**: `npx prisma migrate status`
- **Rails**: `rails db:migrate:status`
- **dbmate**: `dbmate status`

## Step 3 — Report

Report the result:
```
## Migration Result

- Tool: [detected tool]
- Action: [up/down/status]
- Command: `[exact command run]`
- Result: [success/failure details]
- Current version: [if available]
```

## Notes

- Migrations require a running database — ensure Docker/infrastructure is up first
- `down` is destructive — it may drop tables or columns. Double-check before running.
- For `down N`, confirm with the user if N > 1 (safety measure)
- If the project uses environment variables for DB connection, ensure they are loaded
- Migration format: check existing files for the naming convention before creating new ones
