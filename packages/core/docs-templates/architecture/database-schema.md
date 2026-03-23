# Database Schema

> Update when migrations add/change tables, columns, indexes, or constraints.

## Database

- **Engine:** TODO (PostgreSQL 16, MySQL 8, SQLite, etc.)
- **Driver:** TODO (pgx, prisma, sqlalchemy, diesel, etc.)
- **ORM:** TODO (none/raw SQL, Prisma, GORM, SQLAlchemy, Diesel)

## Tables

<!-- List key tables with their purpose. Don't duplicate the migration files —
     focus on relationships, constraints, and design decisions. -->

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| TODO | TODO | TODO |

## Relationships

<!-- Describe key FK relationships and ON DELETE behavior -->

TODO: e.g., `orders.user_id → users.id ON DELETE CASCADE`

## Indexes

<!-- List important indexes and why they exist -->

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| TODO | TODO | TODO | TODO |

## Migrations

- **Format:** TODO (e.g., `000NNN_description.up.sql` / `.down.sql`)
- **Tool:** TODO (golang-migrate, dbmate, alembic, prisma, knex)
- **Directory:** TODO (e.g., `backend/migrations/`)
- **Current range:** TODO (e.g., 000001..000048)

## Views

<!-- SQL views used for reporting, dashboards, aggregations -->

TODO: List views if any.

## Conventions

- TODO: Timestamps use TIMESTAMPTZ (not TIMESTAMP)
- TODO: All tables have `created_at`, `updated_at`
- TODO: Soft delete via `deleted_at` column (or hard delete)
