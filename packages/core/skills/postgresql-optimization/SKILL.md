---
name: postgresql-optimization
description: PostgreSQL optimization — query tuning, indexing strategies, EXPLAIN analysis, configuration, maintenance, and monitoring. Use when slow queries, missing indexes, vacuum lag, or performance bottlenecks are suspected
tokens: 1670
user-invocable: false
---

# PostgreSQL Optimization

Workflow for diagnosing and fixing PostgreSQL performance — query tuning, indexes, EXPLAIN analysis, server configuration, and maintenance.

## Use this skill when

- Optimizing slow PostgreSQL queries
- Designing or reviewing indexing strategies
- Analyzing performance and identifying bottlenecks
- Tuning server configuration
- Managing production maintenance (VACUUM, ANALYZE, bloat)
- Setting up monitoring and alerting

## Do not use this skill when

- You need schema design guidance (use `postgresql` or general DB skill)
- The bottleneck is at the application layer, not the database
- You need a DB-agnostic optimization guide

## Workflow

1. **Identify** the performance problem: slow query, missing index, config, or maintenance
2. **Measure** current state with `EXPLAIN ANALYZE` before any change
3. **Apply** targeted fix at the right layer (index, query, config, maintenance)
4. **Verify** improvement with a second `EXPLAIN ANALYZE`
5. **Monitor** over time to confirm the fix holds under load

## Phase 1: Performance Assessment

- Check PostgreSQL version and available features
- Review config: `shared_buffers`, `work_mem`, `effective_cache_size`, `autovacuum`
- Identify slow queries via `pg_stat_statements` or slow query log
- Analyze CPU, memory, disk I/O
- Map bottleneck category: scan type, join strategy, I/O, locking, vacuum lag

## Phase 2: Query Analysis (EXPLAIN)

- Read node types: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Hash Join`, `Nested Loop`, `Merge Join`
- Compare `estimated vs actual` row counts — large mismatch = stale statistics (run `ANALYZE`)
- Find expensive operations: high cost nodes, high actual rows, large loops
- Identify opportunities: missing index, suboptimal join order, unnecessary sorts

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

## Phase 3: Indexing Strategy

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

## Phase 4: Query Optimization

- Rewrite subqueries as JOINs where the planner struggles
- Use CTEs (`WITH ...`) for readability and sequential execution control
- Cursor-based pagination for large feeds (offset is O(n))
- Use `LIMIT` in subqueries to bound work
- Avoid functions on indexed columns in `WHERE` — prevents index use
- Avoid implicit type casts (`WHERE id = '123'` when id is integer)

## Phase 5: Configuration Tuning

| Setting | Default | Recommendation |
|---------|---------|----------------|
| `shared_buffers` | 128MB | 25% of RAM (dedicated DB server) |
| `work_mem` | 4MB | 16-64MB per connection; multiply by max_connections for peak |
| `effective_cache_size` | 4GB | 50-75% of RAM |
| `checkpoint_completion_target` | 0.9 | Keep 0.9 to spread checkpoint I/O |
| `max_wal_size` | 1GB | Increase if checkpoint frequency too high |
| `autovacuum_vacuum_scale_factor` | 0.2 | 0.01-0.05 for large tables |

## Phase 6: Maintenance

- Regular `VACUUM` reclaims dead tuples from updates/deletes
- `VACUUM ANALYZE` after large data changes updates planner stats
- Monitor bloat: `pg_stat_user_tables`, `pg_total_relation_size`, `pgstattuple`
- Check `pg_stat_user_tables.last_autovacuum`, `n_dead_tup`
- `REINDEX CONCURRENTLY` for bloated indexes (no table lock)

## Phase 7: Monitoring

| Tool | Purpose |
|------|---------|
| `pg_stat_statements` | Most time-consuming queries |
| `pg_stat_user_tables` | Table access patterns, dead tuples, vacuum timing |
| `pg_stat_user_indexes` | Index usage; identify unused indexes |
| `pg_locks` | Lock contention slowing queries |
| `pg_stat_activity` | Currently running queries, idle-in-transaction sessions |
| `postgres_exporter` + Grafana | Ongoing visibility |

## EXPLAIN Output Interpretation

| Output sign | Meaning |
|-------------|---------|
| Seq Scan on large table | Missing or unused index |
| Index Scan but slow | Index not selective; high row count returned |
| Nested Loop with large outer | Consider Hash Join (`enable_nestloop=off` for testing) |
| Hash Join with disk batches | `work_mem` too low |
| Sort with `external merge Disk` | `work_mem` too low for this sort |
| Estimated 1, actual 1M | Stale statistics → `ANALYZE table` |
| Estimated 1M, actual 1 | Histogram bucket too small → increase `ALTER TABLE ... ALTER COLUMN ... SET STATISTICS 1000` |

## Common Anti-Patterns

- `WHERE LOWER(email) = ?` without expression index
- Implicit type cast: `WHERE id = '123'` when id is integer
- `SELECT *` on wide tables (prevents index-only scans)
- `OFFSET 1000000 LIMIT 10` — scans all preceding rows
- `IN (...)` with hundreds of values — consider `ANY(ARRAY[...])` or temp table
- Unnecessary `ORDER BY` in subqueries
- Correlated subqueries executing once per outer row

## Behavioral Traits

- Always measures with `EXPLAIN ANALYZE` before and after
- Distinguishes Seq Scan on small table (fine) from large table (problem)
- Checks `pg_stat_statements` before hypothesizing about slow queries
- Uses `CREATE INDEX CONCURRENTLY` to avoid locking production writes
- Validates autovacuum is running before recommending manual VACUUM
- Checks for stale statistics before rewriting queries
- Treats config changes as hypotheses — verifies with monitoring

## Constraints

- **NEVER** disable autovacuum in production
- **NEVER** run `VACUUM FULL` during business hours (locks the entire table)
- **NEVER** create indexes without `CONCURRENTLY` on live tables
- **NEVER** tune configuration without baseline measurement
- **NEVER** REINDEX without `CONCURRENTLY` on production
- **ALWAYS** test config changes on staging first

Adapted from VKirill/codex-starter-kit (personal skill, MIT).
