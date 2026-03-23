---
description: Create a new database migration file pair (up + down)
argument-hint: <migration-description>
allowed-tools: Bash, Read, Write, Glob
---

# New Migration

Create a new SQL migration file pair following the project convention.

## Context from User

$ARGUMENTS

## Steps

1. Find the next migration number:
```bash
ls /path/to/your-project/backend/migrations/ | sort | tail -2
```

2. Increment the number by 1, keeping the 6-digit zero-padded format.

3. Convert the user's description to snake_case for the filename.

4. Create two files:
   - `backend/migrations/000NNN_description.up.sql` — the forward migration
   - `backend/migrations/000NNN_description.down.sql` — the rollback

## Migration Conventions

- Use `IF NOT EXISTS` / `IF EXISTS` where appropriate
- Include `CREATE INDEX` for frequently queried columns
- Use `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- Use `UUID` or `BIGSERIAL` for primary keys (check existing table conventions)
- Use `JSONB` for flexible metadata columns
- Add `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` on new tables
- Foreign keys with `ON DELETE CASCADE` or `SET NULL` as appropriate
- Down migration should be the exact reverse of up

## Example

```sql
-- 000049_add_user_preferences.up.sql
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload   JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 000049_add_user_preferences.down.sql
DROP TABLE IF EXISTS user_preferences;
```
