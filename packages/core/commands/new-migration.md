---
description: Scaffold a new database migration file pair (up + down) with auto-detection of migration tool and numbering
argument-hint: <migration-description>
allowed-tools: Bash, Read, Write, Glob
---

# New Migration

Create a new database migration file pair following the project's conventions.

## Context from User

$ARGUMENTS

## Step 1 — Detect Migration System

Scan the project for migration directories and tools:

| Marker | Tool | Directory Pattern | Naming Pattern |
|--------|------|-------------------|----------------|
| `backend/migrations/*.sql` with numbered names | golang-migrate | `backend/migrations/` | `000NNN_desc.{up,down}.sql` |
| `migrations/*.sql` with numbered names | golang-migrate | `migrations/` | `000NNN_desc.{up,down}.sql` |
| `db/migrations/*.sql` | golang-migrate / dbmate | `db/migrations/` | `NNNNNN_desc.{up,down}.sql` |
| `db/migrate/*.rb` | Rails | `db/migrate/` | `YYYYMMDDHHMMSS_desc.rb` |
| `alembic/versions/*.py` | Alembic | `alembic/versions/` | `rev_desc.py` |
| `prisma/migrations/` | Prisma | `prisma/migrations/` | `YYYYMMDDHHMMSS_desc/` |
| `drizzle/` + `drizzle.config.ts` | Drizzle | `drizzle/` | `NNNN_desc.sql` |

## Step 2 — Find Next Number

```bash
# List existing migrations, find the latest number
ls <migrations_dir>/ | sort | tail -2
```

Increment the number by 1, keeping the project's zero-padding format.

## Step 3 — Convert Description to Filename

Convert the user's `$ARGUMENTS` to `snake_case` for the filename:
- "add user preferences" → `add_user_preferences`
- "Create events table" → `create_events_table`

## Step 4 — Create Migration Files

Create the migration pair in the detected directory:

### For SQL migrations (golang-migrate, dbmate):

**Up migration** (`000NNN_description.up.sql`):
```sql
-- 000NNN_description.up.sql
-- Description: [user's description]

-- TODO: Add your migration SQL here

-- Conventions:
--   IF NOT EXISTS / IF EXISTS for safety
--   TIMESTAMPTZ for timestamps (not TIMESTAMP)
--   BIGSERIAL or UUID for primary keys
--   JSONB for flexible metadata
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now() on new tables
--   ON DELETE CASCADE or SET NULL for foreign keys
--   CREATE INDEX for frequently queried columns
```

**Down migration** (`000NNN_description.down.sql`):
```sql
-- 000NNN_description.down.sql
-- Rollback: [reverse of up migration]

-- TODO: Add exact reverse of up migration
```

### For Alembic (Python):
Use `alembic revision --autogenerate -m "description"` if autogenerate is configured, otherwise create manually.

### For Prisma:
Edit `prisma/schema.prisma` then run `npx prisma migrate dev --name description`.

## Step 5 — Report

```
Created migration files:
- <path_to_up_migration>
- <path_to_down_migration>

Next step: Edit the migration files with your SQL, then run:
  <apply_command>
```

## Migration Conventions

- Use `IF NOT EXISTS` / `IF EXISTS` where appropriate
- Include `CREATE INDEX` for frequently queried columns
- Use `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- Use `BIGSERIAL` or `UUID` for primary keys (match existing table conventions)
- Use `JSONB` for flexible metadata columns
- Add `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` on new tables
- Foreign keys with `ON DELETE CASCADE` or `SET NULL` as appropriate
- Down migration must be the exact reverse of up
- Never use destructive operations (DROP COLUMN, DROP TABLE) without `IF EXISTS`
