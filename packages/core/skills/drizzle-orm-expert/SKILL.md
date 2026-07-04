---
name: drizzle-orm-expert
description: Expert in Drizzle ORM for TypeScript — schema design, relational queries, migrations, serverless DB integration. Use when building type-safe database layers with Drizzle, migrating from Prisma, or optimizing edge runtime DB access
tokens: 1960
user-invocable: false
---

# Drizzle ORM Expert

TypeScript-first ORM that compiles to raw SQL with zero runtime overhead. Ideal for edge runtimes and serverless. Two complementary APIs: SQL-like query builder and Prisma-style relational queries.

## Use this skill when

- Setting up Drizzle ORM in a new or existing project
- Designing database schemas with Drizzle's TypeScript-first approach
- Writing complex relational queries (joins, subqueries, aggregations)
- Setting up or troubleshooting Drizzle Kit migrations
- Integrating Drizzle with Next.js App Router, tRPC, or Hono
- Optimizing performance (prepared statements, batching, pooling)
- Migrating from Prisma, TypeORM, or Knex

## Do not use this skill when

- The DB layer uses Prisma, TypeORM, or raw SQL exclusively
- You need a database-agnostic ORM guide
- The task is about DB server configuration (use `postgresql-optimization`)

## Hard Rules

- NEVER run `drizzle-kit push` in production — it can drop columns and lose data. Use `generate` → review SQL → `migrate`.
- ALWAYS pass `{ schema }` to `drizzle()` — without it `db.query.*` is `undefined`.
- ALWAYS define and export `relations()` before using `db.query.*` with `with`.
- ALWAYS use connection pooling (pgBouncer, Neon serverless, or node-pg `Pool`).
- Use the query builder rather than raw SQL whenever it supports the operation.
- MySQL has no `.returning()` — read `insertId` from the result instead.

## Workflow

1. Identify the DB driver (PostgreSQL, SQLite, MySQL) and pick the adapter (see Adapters table).
2. Define schema in `db/schema.ts` (or domain-split `db/schema/users.ts`).
3. Define `relations()` separately and export them so `db.query.*` with `with` resolves.
4. Initialize the client with `{ schema }`.
5. Derive row types with `InferSelectModel` / `InferInsertModel` — never hand-write interfaces.
6. For production schema changes: `drizzle-kit generate` → review the SQL → `drizzle-kit migrate` (never `push`).

## Core Architecture

No runtime query-engine binary (unlike Prisma), so Drizzle runs on edge runtimes — Cloudflare Workers, Vercel Edge Functions, Deno Deploy. The two APIs:

- **SQL-like builder**: `db.select().from().where().join().orderBy()` — close to SQL semantics
- **Relational query API**: `db.query.users.findMany({ with: { posts: true } })` — Prisma-style nested fetching

## Schema Design

```typescript
import { pgTable, uuid, text, boolean, timestamp, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user', 'guest']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  role: roleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  createdIdx: index('users_created_idx').on(table.createdAt),
}));

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  published: boolean('published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Every column the query examples below read (`posts.published`, `posts.createdAt`) is defined here.

## Relations API

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.userId], references: [users.id] }),
}));

// Initialize client WITH schema so db.query.* works:
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

Many-to-many requires an explicit junction table — Drizzle has no implicit join tables.

## Queries

### SQL-like builder
```typescript
import { eq, and, desc } from 'drizzle-orm';

const recent = await db
  .select({ id: posts.id, title: posts.title, author: users.email })
  .from(posts)
  .innerJoin(users, eq(users.id, posts.userId))
  .where(and(eq(users.role, 'user'), eq(posts.published, true)))
  .orderBy(desc(posts.createdAt))
  .limit(20);
```

### Relational

Prefer the callback form `(table, { eq }) => ...` — it avoids importing and shadowing the schema's table symbols:

```typescript
const activeUsers = await db.query.users.findMany({
  where: (user, { eq }) => eq(user.role, 'user'),
  orderBy: (user, { desc }) => desc(user.createdAt),
  with: {
    posts: {
      where: (post, { eq }) => eq(post.published, true),
      limit: 5,
    },
  },
  limit: 20,
});
```

## Mutations

```typescript
// Insert + returning (Postgres only)
const [inserted] = await db.insert(users).values({ email: 'a@b.c' }).returning();

// Batch
await db.insert(users).values([{ email: 'x@x' }, { email: 'y@y' }]);

// Update
await db.update(users).set({ role: 'admin' }).where(eq(users.id, id));

// Delete
await db.delete(posts).where(eq(posts.userId, id));

// Upsert
await db.insert(users)
  .values({ id, email })
  .onConflictDoUpdate({ target: users.id, set: { email } });
```

## Transactions

```typescript
import { sql } from 'drizzle-orm';

await db.transaction(async (tx) => {
  const [author] = await tx.insert(users).values({ email: 'A@B.C' }).returning();
  await tx.update(users)
    .set({ email: sql`lower(${users.email})` })   // sql`` escape hatch, columns interpolate safely
    .where(eq(users.id, author.id));
  // any throw → rollback
});
```

## Drizzle Kit

```bash
drizzle-kit generate    # write SQL migration files (review them)
drizzle-kit migrate     # apply pending migrations — production
drizzle-kit push        # sync schema directly — DEV ONLY, NEVER prod
drizzle-kit studio      # GUI database browser
```

`drizzle.config.ts`:
```typescript
import type { Config } from 'drizzle-kit';
export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

## Adapters

| DB | Adapter |
|---|---|
| Postgres (Neon) | `drizzle-orm/neon-http` |
| Postgres (node-pg) | `drizzle-orm/node-postgres` |
| Postgres (postgres.js) | `drizzle-orm/postgres-js` |
| SQLite (Turso) | `drizzle-orm/libsql` |
| SQLite (local) | `drizzle-orm/better-sqlite3` |
| MySQL (PlanetScale) | `drizzle-orm/planetscale-serverless` |
| MySQL (mysql2) | `drizzle-orm/mysql2` |

## Type Inference

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;
```

Never write manual TS interfaces for DB rows — schema is the source of truth.

## Performance

- **Prepared statements** for hot paths: `.prepare('getUser')` once, execute many times
- **Partial select**: choose only needed columns
- **Batch**: `db.batch([...])` for many independent queries in one round-trip (libsql / d1 only)
- **Indexes**: declare `index()` / `uniqueIndex()` inside the table builder

## Next.js Integration

```typescript
// app/dashboard/page.tsx — Server Component
import { db } from '@/db';

export default async function Dashboard() {
  const allUsers = await db.query.users.findMany({ limit: 20 });
  return <UsersList users={allUsers} />;
}
```

```typescript
// Server Action
'use server';
import { db } from '@/db';
import { users } from '@/db/schema';
export async function createUser(formData: FormData) {
  await db.insert(users).values({ email: formData.get('email') as string });
}
```

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `db.query.users` is undefined | `{ schema }` not passed to `drizzle()` | Pass schema |
| Migration conflict | Out-of-sync DB state | `generate` new migration, review SQL, `migrate` |
| Type error on `relations` | Forgot to `export const usersRelations = relations(...)` | Add export |
| Slow query in Edge runtime | New connection per request | Use a serverless adapter (Neon, PlanetScale) or HTTP-based driver |

## Recap — non-negotiables

- Never `drizzle-kit push` in production; `generate` → review SQL → `migrate`.
- Pass `{ schema }` to `drizzle()` and export `relations()`, or `db.query.*` breaks.
- Always pool connections; prefer the query builder over raw SQL.
- MySQL has no `.returning()` — read `insertId` instead.

Adapted from VKirill/codex-starter-kit (Apache 2.0 community skill).
