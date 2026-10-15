---
name: new-migration
description: Scaffold database migration files using the project's detected tool, dialect, and ordering conventions
user-invocable: true
tokens: 1190
---

# New Migration

Create migration files following the project's actual conventions. Scaffolding authorizes file creation within the requested scope; it does not authorize applying migrations, resetting a database, starting services, or installing tools.

## Context from User

Parse the user's request for the description and SQL/schema requirements. Read applicable `AGENTS.md` instructions and discover available file/command tools. Resolve the intended component and migration directory before writing. Preserve existing migrations and unrelated schema edits.

## Step 1 — Detect Migration System

Inspect configured dependencies, scripts, migration configuration and representative existing migrations. Directory names are hints, not sufficient proof of the tool or format:

| Evidence | Tool | Typical format |
|----------|------|----------------|
| Configured migrate command and `.up.sql` / `.down.sql` pairs | golang-migrate | Sequential or timestamped file pair |
| dbmate configuration and `-- migrate:up` / `-- migrate:down` sections | dbmate | One timestamped SQL file with both sections |
| `db/migrate/*.rb` and Rails configuration | Rails | Timestamped Ruby migration |
| `alembic.ini` and revision scripts | Alembic | Python revision linked to `down_revision` |
| Prisma dependency/schema and migration history | Prisma | Tool-generated migration directory and metadata |
| Drizzle config and migration journal | Drizzle | Tool-generated SQL plus journal/snapshot metadata |

Confirm the database dialect and installed tool version. Use local installed binaries or existing package-manager scripts; do not let a launcher download a missing tool. If multiple migration systems exist, select the one owning the requested schema or clarify.

## Step 2 — Choose the Identifier

For a sequential SQL-pair convention, parse existing identifiers numerically, retain padding, and select the next unused number. For timestamps use the project's format and check collisions. For revision graphs or metadata-managed tools, use the verified generator and its supported ordering; do not impose a numeric sequence or invent a revision parent. Check branch heads where relevant. Never overwrite an existing identifier/file.

## Step 3 — Convert Description to Filename

Use the project's naming convention, commonly `snake_case`:
- "add user preferences" -> `add_user_preferences`
- "Create events table" -> `create_events_table`

Treat the description as data. Validate the resulting basename and keep paths inside the selected migration directory; do not interpolate raw request text into shell commands.

## Step 4 — Create Migration Files

For golang-migrate, create the configured up/down pair. For dbmate, create one file with the existing `-- migrate:up` and `-- migrate:down` section format. Follow the actual dialect for types, constraints, indexes and transaction handling. For a scaffold-only request, mark incomplete SQL explicitly; for requested implementation, provide the actual SQL and disclose any irreversible/data-loss steps.

For framework tools, inspect the generator's behavior before running it. Prefer a supported file-only generator. Alembic autogeneration may connect to a database and its generated diff requires review. Prisma `migrate dev` applies migrations; even `--create-only` can require a shadow database and prompt for reset. Do not use these as an implicit file-only action. If generation needs database access or writes, require a verified disposable target and existing authority for those exact effects; otherwise report the dependency and prepare only safe file edits. Do not fake tool-managed metadata to claim a completed scaffold.

## Step 5 — Report

Report the tool/version, dialect, created/changed paths, generation command and exit (if used), identifier/parent, scaffold versus implemented status, and validation actually performed. Show the next apply command only as a proposed command with an unresolved target/authority clearly marked; do not execute it here. Read the installed `migrate` skill directly when application is separately requested.

## Migration Conventions

- Follow existing schema types and referential actions; do not impose PostgreSQL-only types or cascading deletes on every database.
- Conditional DDL (`IF EXISTS` / `IF NOT EXISTS`) does not make destructive changes safe or verify schema equivalence.
- Review generated SQL, locks, transaction boundaries and data impact before application.
- Write a valid reverse only where the tool/project supports one. Dropped data cannot be recreated by a schema-only down migration; state irreversible effects and the required recovery plan honestly.
- Files created or statically reviewed are not proof of a successful database migration.
