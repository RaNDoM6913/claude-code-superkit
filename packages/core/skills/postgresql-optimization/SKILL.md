---
name: postgresql-optimization
description: PostgreSQL optimization — query tuning, indexing, EXPLAIN analysis, configuration, maintenance, and monitoring. Use when slow queries, missing indexes, vacuum lag, or performance bottlenecks are suspected
tokens: 1994
user-invocable: false
---

# PostgreSQL Optimization

Diagnose and fix PostgreSQL performance: query tuning, indexing, EXPLAIN analysis, server configuration, maintenance, and monitoring. The core discipline is measure-before-and-after — one change per cycle, validated with `EXPLAIN ANALYZE`.

## Use this skill when

- Optimizing slow PostgreSQL queries
- Designing or reviewing indexing strategies
- Analyzing performance and identifying bottlenecks
- Tuning server configuration
- Managing production maintenance (VACUUM, ANALYZE, bloat)
- Setting up monitoring and alerting

## Do not use this skill when

- You need schema / data-model design — that is out of scope here; this skill tunes an existing schema. For Drizzle ORM schema and migration work, use the `drizzle-orm-expert` skill.
- The bottleneck is at the application layer, not the database.
- You need a database-agnostic optimization guide — this is PostgreSQL-specific.

## Hard Rules

- Measure with `EXPLAIN ANALYZE` BEFORE and AFTER every change — never tune from a guess.
- Change ONE layer at a time (index / query / config / maintenance), then re-measure.
- Use `CONCURRENTLY` for every `CREATE INDEX` and `REINDEX` on live tables — the plain form locks writes.
- NEVER disable autovacuum in production.
- NEVER run `VACUUM FULL` during business hours — it takes an ACCESS EXCLUSIVE lock on the whole table.
- Test config changes on staging first; treat each as a hypothesis to confirm with monitoring.

## Steps

Follow in order. Change one thing, re-measure, then move on.

1. **Identify** — Pin the specific slow query and its bottleneck category. Note the PostgreSQL version and key config (`shared_buffers`, `work_mem`, `effective_cache_size`, `autovacuum`); find the worst queries via `pg_stat_statements` or the slow-query log; check CPU / memory / disk I/O; classify the bottleneck as scan type, join strategy, I/O, locking, or vacuum lag. **Done when:** you have one target query and a suspected category.
2. **Measure the baseline** — Run `EXPLAIN (ANALYZE, BUFFERS)` on the target query before any change. Read the node types; compare estimated vs actual rows (large mismatch = stale statistics → run `ANALYZE`); locate the highest-cost node, highest actual-row node, or largest loop. Use the EXPLAIN Output Interpretation table below. **Done when:** you have a baseline plan and the specific expensive node.
3. **Apply one targeted fix** — Change exactly ONE layer, chosen from the bottleneck: missing index → Indexing Strategy; bad plan or query shape → Query Optimization; memory / checkpoint limits → Configuration Tuning; bloat or stale stats → Maintenance. Validate autovacuum is running before recommending a manual VACUUM; check for stale statistics before rewriting a query. **Done when:** exactly one change is applied.
4. **Verify** — Re-run `EXPLAIN ANALYZE`. Confirm the plan changed as intended and timing dropped. If it did not improve, revert the change and return to Step 2 with a different hypothesis. **Done when:** the second plan shows the expected improvement, or the change is reverted.
5. **Monitor** — Confirm the fix holds under real load using `pg_stat_statements`, `pg_stat_user_tables`, and `pg_stat_user_indexes` over time. Treat every config change as a hypothesis until monitoring confirms it. **Done when:** metrics are stable under production load.

## EXPLAIN Output Interpretation

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

Node types to know: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Hash Join`, `Nested Loop`, `Merge Join`. A `Seq Scan` on a small table is fine; on a large table it signals a missing or unused index.

| Output sign | Meaning |
|-------------|---------|
| Seq Scan on large table | Missing or unused index |
| Index Scan but slow | Index not selective; high row count returned |
| Nested Loop with large outer | Consider Hash Join (`enable_nestloop=off` for testing) |
| Hash Join with disk batches | `work_mem` too low |
| Sort with `external merge Disk` | `work_mem` too low for this sort |
| Estimated 1, actual 1M | Stale statistics → `ANALYZE table` |
| Estimated 1M, actual 1 | Histogram bucket too small → increase `ALTER TABLE ... ALTER COLUMN ... SET STATISTICS 1000` |

## Indexing Strategy

| Pattern | Index type |
|---------|-----------|
| Equality + range on 1 column | B-tree |
| Multi-column equality | Composite B-tree, most selective first |
| JSONB containment | GIN |
| Full-text search | GIN on `tsvector` |
| Range overlap, scheduling | GiST on range type |
| Hot subset (`WHERE status='active'`) | Partial index |
| Avoid heap reads for extra columns | Covering index with `INCLUDE` |
| Time-series, naturally ordered | BRIN |

Review `pg_stat_user_indexes` — unused indexes waste write performance and bloat.

```sql
-- Always CONCURRENTLY in production:
CREATE INDEX CONCURRENTLY idx_users_email_active
  ON users (email) WHERE active = true;

-- Covering index for index-only scans:
CREATE INDEX CONCURRENTLY idx_orders_user_created
  ON orders (user_id, created_at) INCLUDE (status, total);
```

## Query Optimization

- Rewrite subqueries as JOINs where the planner struggles
- Use CTEs (`WITH ...`) for readability; add `AS MATERIALIZED` when you need an optimization fence — PostgreSQL 12+ inlines plain CTEs
- Cursor-based pagination for large feeds (offset is O(n))
- Use `LIMIT` in subqueries to bound work
- Avoid functions on indexed columns in `WHERE` — prevents index use
- Avoid implicit type casts (`WHERE id = '123'` when id is integer)

## Configuration Tuning

| Setting | Default | Recommendation |
|---------|---------|----------------|
| `shared_buffers` | 128MB | 25% of RAM (dedicated DB server) |
| `work_mem` | 4MB | 16-64MB per connection; multiply by max_connections for peak |
| `effective_cache_size` | 4GB | 50-75% of RAM |
| `checkpoint_completion_target` | 0.9 | Keep 0.9 to spread checkpoint I/O |
| `max_wal_size` | 1GB | Increase if checkpoint frequency too high |
| `autovacuum_vacuum_scale_factor` | 0.2 | 0.01-0.05 for large tables |

## Maintenance

- Regular `VACUUM` reclaims dead tuples from updates/deletes
- `VACUUM ANALYZE` after large data changes updates planner stats
- Monitor bloat: `pg_stat_user_tables`, `pg_total_relation_size`, `pgstattuple`
- Check `pg_stat_user_tables.last_autovacuum`, `n_dead_tup`
- `REINDEX CONCURRENTLY` for bloated indexes (no table lock)

## Partitioning (very large tables)

- Declarative partitioning `PARTITION BY RANGE | LIST | HASH` splits a huge table so the planner prunes irrelevant partitions.
- Range-partition time-series data by date and pair each partition with a BRIN index; drop old partitions instead of `DELETE` to avoid bloat.

## Monitoring

| Tool | Purpose |
|------|---------|
| `pg_stat_statements` | Most time-consuming queries |
| `pg_stat_user_tables` | Table access patterns, dead tuples, vacuum timing |
| `pg_stat_user_indexes` | Index usage; identify unused indexes |
| `pg_locks` | Lock contention slowing queries |
| `pg_stat_activity` | Currently running queries, idle-in-transaction sessions |
| `postgres_exporter` + Grafana | Ongoing visibility |

## Common Anti-Patterns

- `WHERE LOWER(email) = ?` without expression index
- Implicit type cast: `WHERE id = '123'` when id is integer
- `SELECT *` on wide tables (prevents index-only scans)
- `OFFSET 1000000 LIMIT 10` — scans all preceding rows
- `IN (...)` with hundreds of values — consider `ANY(ARRAY[...])` or temp table
- Unnecessary `ORDER BY` in subqueries
- Correlated subqueries executing once per outer row

## Recap — non-negotiables

- Measure with `EXPLAIN ANALYZE` before and after; change one layer per cycle.
- Use `CONCURRENTLY` for every `CREATE INDEX` / `REINDEX` on live tables.
- Never disable autovacuum; never `VACUUM FULL` during business hours.
- Test config on staging first, then confirm with monitoring.

Adapted from VKirill/codex-starter-kit (personal skill, MIT).
