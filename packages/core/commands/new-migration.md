---
description: Scaffold a new database migration file pair (up + down) with auto-detection of migration tool and numbering
argument-hint: <migration-description>
allowed-tools: Bash, Read, Write, Glob
---

# New Migration

## Role

Scaffold a database migration that matches the project's existing migration tool, directory, numbering scheme, and SQL dialect.

Migration description: $ARGUMENTS

## Hard Rules

1. NEVER invent a migrations directory, numbering scheme, or naming pattern — copy every convention from existing migrations, or ask the user (Step 2).
2. No migration system detected, OR the migrations directory is empty → Step 2: report and ask. Create zero files on that branch.
3. Match the project's SQL dialect (Step 3). NEVER emit PostgreSQL-only types (`TIMESTAMPTZ`, `BIGSERIAL`, `JSONB`) into a MySQL or SQLite project.
4. SQL-file tools always get BOTH files: `.up.sql` and `.down.sql`. Down is the exact reverse of up.
5. Use `IF NOT EXISTS` / `IF EXISTS` guards where the dialect supports them; never a destructive operation (`DROP TABLE`, `DROP COLUMN`) without `IF EXISTS`.
6. Report only after verifying the created files exist on disk (`ls` or Read).

## Step 1 — Detect Migration System

Check each marker with Glob. A row matches only if the directory contains at least one existing migration file:

| Marker | Tool | Directory | Naming Pattern |
|--------|------|-----------|----------------|
| `backend/migrations/*.sql` with numbered names | golang-migrate | `backend/migrations/` | `000NNN_desc.{up,down}.sql` |
| `migrations/*.sql` with numbered names | golang-migrate | `migrations/` | `000NNN_desc.{up,down}.sql` |
| `db/migrations/*.sql` | golang-migrate / dbmate | `db/migrations/` | `NNNNNN_desc.{up,down}.sql` |
| `db/migrate/*.rb` | Rails | `db/migrate/` | `YYYYMMDDHHMMSS_desc.rb` |
| `alembic/versions/*.py` | Alembic | `alembic/versions/` | `rev_desc.py` |
| `prisma/migrations/` | Prisma | `prisma/migrations/` | `YYYYMMDDHHMMSS_desc/` |
| `drizzle/` + `drizzle.config.ts` | Drizzle | `drizzle/` | `NNNN_desc.sql` |

Branches — exactly one applies:
- Exactly one row matches → Step 3.
- Two or more rows match → list the candidate directories, ask the user which one to use, wait for the answer.
- No row matches, or a directory exists but holds no migration files → Step 2.

Done when: you have one confirmed tool + directory containing existing migrations, or you branched to Step 2.

## Step 2 — No Migration System Detected (ask, never invent)

Runs only when Step 1 found no system or an empty migrations directory. Do NOT create files or pick a numbering scheme yourself.

1. Report which locations you searched (the Directory column of the Step 1 table, plus any project-specific paths you globbed).
2. List tool options that match the detected stack:
   - `go.mod` present → golang-migrate or dbmate
   - `package.json` present → Prisma, Drizzle, or dbmate
   - `pyproject.toml` / `requirements.txt` present → Alembic
   - `Gemfile` present → Rails built-in migrations
3. Ask the user which tool and directory to use. If a tool config exists but its directory is empty, also ask which numbering scheme to start with (sequential `000001` vs timestamp). Then STOP — proceed only after they answer.

Done when: the report + question are posted and zero files were created.

## Step 3 — Detect SQL Dialect

Applies to raw-SQL tools (golang-migrate, dbmate). For Rails / Alembic / Prisma / Drizzle set dialect = `n/a` (the tool or schema owns the SQL) and go to Step 4.

Check in priority order; first signal wins:
1. **Existing migration SQL** (Grep the migrations directory): `TIMESTAMPTZ` / `JSONB` / `BIGSERIAL` → PostgreSQL · `AUTO_INCREMENT` / `ENGINE=` → MySQL · `AUTOINCREMENT` → SQLite.
2. **Database driver in dependencies**: `go.mod`: `jackc/pgx` or `lib/pq` → PostgreSQL, `go-sql-driver/mysql` → MySQL, `mattn/go-sqlite3` or `modernc.org/sqlite` → SQLite · `package.json`: `pg` or `postgres` → PostgreSQL, `mysql2` → MySQL, `better-sqlite3` → SQLite · Python deps: `psycopg`/`asyncpg` → PostgreSQL, `pymysql`/`mysqlclient` → MySQL.
3. **Connection string scheme** in `.env*` or config files: `postgres://`/`postgresql://` → PostgreSQL · `mysql://` → MySQL · `sqlite:` → SQLite.

No signal, or signals conflict → dialect = `unknown`: write `dialect: unknown — match existing schema` in the template comment and in the report. Do not guess types.

Done when: dialect is set to exactly one of `postgresql` / `mysql` / `sqlite` / `n/a` / `unknown`.

## Step 4 — Compute the Next Number

Sequential-numbered tools (golang-migrate, dbmate, Drizzle SQL files) only. Timestamp- or hash-named tools (Rails, Prisma, Alembic) get their identifier from the generator in Step 6 — skip this step. An empty directory cannot reach this step (Step 1 routes it to Step 2).

```bash
# Highest existing numeric prefix. Numeric sort — plain lexicographic sort mis-orders mixed zero-padding.
ls <migrations_dir> | grep -oE '^[0-9]+' | sort -n | tail -1
```

Next number = highest + 1, zero-padded to the same width as the prefix of the newest existing migration (latest is `000042_...` → next is `000043`, width 6).

Done when: next identifier computed and its padding width equals the newest existing migration's prefix width.

## Step 5 — Build the Filename

Convert the migration description to `snake_case`: lowercase, spaces and hyphens become underscores, drop other punctuation.
- "add user preferences" → `add_user_preferences`
- "Create events table" → `create_events_table`

Done when: filename slug produced.

## Step 6 — Create the Migration

### golang-migrate / dbmate — Write both files in the detected directory

**Up** (`<NNN>_<slug>.up.sql`):
```sql
-- <NNN>_<slug>.up.sql
-- Description: <migration description>
-- Follow "Migration Conventions" below (dialect: <detected dialect>)

-- TODO: migration SQL
```

**Down** (`<NNN>_<slug>.down.sql`):
```sql
-- <NNN>_<slug>.down.sql
-- Rollback: exact reverse of the up migration, statements in reverse order

-- TODO: reverse every statement from the up file
```

### Rails
Run `bin/rails generate migration <SlugInCamelCase>` — the generator assigns the timestamp.

### Alembic
`alembic revision --autogenerate -m "<slug>"` if autogenerate is configured; otherwise `alembic revision -m "<slug>"`.

### Prisma
Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <slug>`.

### Drizzle
Edit the schema file, then run the project's drizzle-kit generate script — check `package.json` scripts for its exact name.

Done when: SQL tools — both files exist on disk (verified with `ls`); generator tools — the command ran and printed the created file path.

## Step 7 — Report

Verify the created paths exist, then fill this template exactly:

```
## Migration Scaffolded

Tool: <tool> · Directory: <dir> · Dialect: <postgresql|mysql|sqlite|n/a|unknown>

Created:
- <path to up file>
- <path to down file>   (SQL tools; generator tools: path(s) from the tool's output)

Next steps:
1. Edit the file(s): replace the TODO with your SQL / schema change.
2. Apply: <apply command>
3. Confirm the down migration rolls back cleanly before committing.
```

Apply command: prefer the project's documented one (Makefile target, `package.json` script, README). If none is documented, use the tool default: `migrate -path <dir> -database "$DATABASE_URL" up` · `dbmate up` · `alembic upgrade head` · `bin/rails db:migrate` · `npx prisma migrate dev`.

## Migration Conventions

Existing tables win: when this table conflicts with what existing migrations already do, copy the existing migrations.

| Need | PostgreSQL | MySQL | SQLite |
|------|------------|-------|--------|
| Timestamps | `TIMESTAMPTZ` | `DATETIME(6)` | `TEXT` (ISO 8601) |
| Auto-increment PK | `BIGSERIAL` (or `UUID`) | `BIGINT AUTO_INCREMENT` | `INTEGER PRIMARY KEY` |
| Flexible metadata | `JSONB` | `JSON` | `TEXT` (JSON string) |

Dialect-neutral rules:
- `IF NOT EXISTS` / `IF EXISTS` on every CREATE/DROP the dialect supports.
- New tables get `created_at` (timestamp type from the table above) `NOT NULL` with a current-timestamp default.
- `CREATE INDEX` for columns that will be filtered or joined on.
- Foreign keys: `ON DELETE CASCADE` when child rows are meaningless without the parent; `ON DELETE SET NULL` when they must outlive it.
- Down migration is the exact reverse of up, statements in reverse order.
- Destructive operations (`DROP TABLE`, `DROP COLUMN`) only with `IF EXISTS`.

## Done ONLY when

- [ ] Scaffold branch: created file(s) exist on disk — verified with `ls`/Read, not from memory; SQL tools have BOTH `.up.sql` and `.down.sql`.
- [ ] The down file mirrors the up file (exact reverse).
- [ ] Report emitted with exact paths, dialect, and apply command.
- [ ] Ask branch (Step 2) instead: searched locations reported, stack-matched options listed, question asked, zero files created.

Not all applicable boxes checked → say what is missing; do not claim completion.

## Recap — non-negotiables

- Conventions come from existing migrations or the user — never invented; no system or empty directory → Step 2 ask.
- Dialect-gate all SQL: PostgreSQL types only on PostgreSQL (see Migration Conventions).
- SQL tools: always an up + down pair; down reverses up exactly.
- `IF NOT EXISTS` / `IF EXISTS` guards; no destructive operation without `IF EXISTS`.
- Verify files on disk before reporting.
