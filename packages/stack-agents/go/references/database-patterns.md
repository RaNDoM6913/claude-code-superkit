# Database Patterns

> Reference document for database-reviewer. Loaded on demand via Read tool.

## pgx Connection Pool

### Pool Configuration

```go
import (
    "github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
    cfg, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("parse db config: %w", err)
    }

    cfg.MaxConns = 20                          // max connections in pool
    cfg.MinConns = 5                           // keep-alive minimum
    cfg.MaxConnLifetime = 30 * time.Minute     // recycle after 30min
    cfg.MaxConnIdleTime = 5 * time.Minute      // close idle after 5min
    cfg.HealthCheckPeriod = 30 * time.Second   // background health check

    pool, err := pgxpool.NewWithConfig(ctx, cfg)
    if err != nil {
        return nil, fmt.Errorf("create pool: %w", err)
    }

    if err := pool.Ping(ctx); err != nil {
        pool.Close()
        return nil, fmt.Errorf("ping db: %w", err)
    }

    return pool, nil
}
```

### Pool Tuning Guidelines

| Parameter | Guideline | Why |
|-----------|-----------|-----|
| MaxConns | CPU cores * 2 + disk spindles | PostgreSQL recommendation |
| MinConns | MaxConns / 4 | Avoid cold start latency |
| MaxConnLifetime | 30 min | Rotate connections, pick up DNS changes |
| MaxConnIdleTime | 5 min | Release unused connections |
| HealthCheckPeriod | 30 sec | Detect dead connections |

## Query Patterns

### QueryRow — Single Row

```go
func (r *UserRepo) FindByID(ctx context.Context, id int64) (*User, error) {
    var u User
    err := r.db.QueryRow(ctx,
        "SELECT id, name, email, status, created_at FROM users WHERE id = $1",
        id,
    ).Scan(&u.ID, &u.Name, &u.Email, &u.Status, &u.CreatedAt)

    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("UserRepo.FindByID: %w", domain.ErrNotFound)
        }
        return nil, fmt.Errorf("UserRepo.FindByID: %w", err)
    }
    return &u, nil
}
```

### Query — Multiple Rows

```go
func (r *UserRepo) FindByStatus(ctx context.Context, status Status) ([]*User, error) {
    rows, err := r.db.Query(ctx,
        "SELECT id, name, email, status, created_at FROM users WHERE status = $1 ORDER BY id",
        status,
    )
    if err != nil {
        return nil, fmt.Errorf("UserRepo.FindByStatus: %w", err)
    }
    defer rows.Close()

    var users []*User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Status, &u.CreatedAt); err != nil {
            return nil, fmt.Errorf("UserRepo.FindByStatus: scan: %w", err)
        }
        users = append(users, &u)
    }

    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("UserRepo.FindByStatus: rows: %w", err)
    }
    return users, nil
}
```

### pgx.CollectRows (pgx v5)

```go
func (r *UserRepo) FindAll(ctx context.Context) ([]*User, error) {
    rows, err := r.db.Query(ctx,
        "SELECT id, name, email, status, created_at FROM users ORDER BY id",
    )
    if err != nil {
        return nil, fmt.Errorf("UserRepo.FindAll: %w", err)
    }

    users, err := pgx.CollectRows(rows, pgx.RowToAddrOfStructByName[User])
    if err != nil {
        return nil, fmt.Errorf("UserRepo.FindAll: collect: %w", err)
    }
    return users, nil
}
```

## Transaction Handling

### Basic Transaction with Defer

```go
func (r *UserRepo) Transfer(ctx context.Context, fromID, toID int64, amount int64) error {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("UserRepo.Transfer: begin: %w", err)
    }
    defer tx.Rollback(ctx) // no-op if committed

    // Debit
    result, err := tx.Exec(ctx,
        "UPDATE accounts SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1",
        amount, fromID)
    if err != nil {
        return fmt.Errorf("UserRepo.Transfer: debit: %w", err)
    }
    if result.RowsAffected() == 0 {
        return domain.ErrInsufficientFunds
    }

    // Credit
    _, err = tx.Exec(ctx,
        "UPDATE accounts SET balance = balance + $1 WHERE user_id = $2",
        amount, toID)
    if err != nil {
        return fmt.Errorf("UserRepo.Transfer: credit: %w", err)
    }

    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("UserRepo.Transfer: commit: %w", err)
    }
    return nil
}
```

### Transaction Helper Function

```go
func WithTx(ctx context.Context, db *pgxpool.Pool, fn func(pgx.Tx) error) error {
    tx, err := db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback(ctx)

    if err := fn(tx); err != nil {
        return err
    }

    return tx.Commit(ctx)
}

// Usage
err := WithTx(ctx, db, func(tx pgx.Tx) error {
    if err := debit(ctx, tx, fromID, amount); err != nil {
        return err
    }
    return credit(ctx, tx, toID, amount)
})
```

### Nested Transactions (Savepoints)

```go
func (r *Repo) ComplexOperation(ctx context.Context, tx pgx.Tx) error {
    // Create savepoint
    _, err := tx.Exec(ctx, "SAVEPOINT sp1")
    if err != nil {
        return err
    }

    if err := riskyOperation(ctx, tx); err != nil {
        // Rollback to savepoint (not the whole transaction)
        tx.Exec(ctx, "ROLLBACK TO SAVEPOINT sp1")
        // Continue with alternative path
        return alternativeOperation(ctx, tx)
    }

    _, err = tx.Exec(ctx, "RELEASE SAVEPOINT sp1")
    return err
}
```

## Batch Operations

### pgx.Batch

Send multiple queries in a single round-trip.

```go
func (r *UserRepo) FindMany(ctx context.Context, ids []int64) ([]*User, error) {
    batch := &pgx.Batch{}
    for _, id := range ids {
        batch.Queue("SELECT id, name, email FROM users WHERE id = $1", id)
    }

    br := r.db.SendBatch(ctx, batch)
    defer br.Close()

    users := make([]*User, 0, len(ids))
    for range ids {
        var u User
        err := br.QueryRow().Scan(&u.ID, &u.Name, &u.Email)
        if err != nil {
            if errors.Is(err, pgx.ErrNoRows) {
                continue // skip missing
            }
            return nil, fmt.Errorf("UserRepo.FindMany: %w", err)
        }
        users = append(users, &u)
    }
    return users, nil
}
```

### COPY for Bulk Insert

```go
func (r *UserRepo) BulkInsert(ctx context.Context, users []*User) (int64, error) {
    rows := make([][]any, len(users))
    for i, u := range users {
        rows[i] = []any{u.Name, u.Email, u.Status, u.CreatedAt}
    }

    count, err := r.db.CopyFrom(ctx,
        pgx.Identifier{"users"},
        []string{"name", "email", "status", "created_at"},
        pgx.CopyFromRows(rows),
    )
    if err != nil {
        return 0, fmt.Errorf("UserRepo.BulkInsert: %w", err)
    }
    return count, nil
}
```

## Prepared Statements

pgx uses implicit prepared statements by default (auto-prepares on first use). Explicit preparation is rarely needed.

```go
// Explicit preparation (when needed)
_, err := db.Prepare(ctx, "find_user", "SELECT id, name FROM users WHERE id = $1")
if err != nil {
    return err
}

// Use prepared statement by name
row := db.QueryRow(ctx, "find_user", userID)
```

## Migration Patterns

| Tool | Approach | Pros | Cons |
|------|----------|------|------|
| golang-migrate | SQL files up/down | Simple, SQL-native | Manual ordering |
| goose | SQL or Go functions | Flexible, Go migrations | Slightly complex |
| atlas | Declarative schema | Auto-diff, HCL/SQL | Learning curve |

```bash
# golang-migrate
migrate -database "postgres://..." -path migrations up

# goose
goose -dir migrations postgres "postgres://..." up

# atlas
atlas schema apply --url "postgres://..." --to "file://schema.sql"
```

### Migration File Structure

```
migrations/
  001_create_users.up.sql
  001_create_users.down.sql
  002_add_user_status.up.sql
  002_add_user_status.down.sql
  003_create_orders.up.sql
  003_create_orders.down.sql
```

## ErrNoRows Handling

Always map database "not found" to domain errors.

```go
// pgx
if errors.Is(err, pgx.ErrNoRows) {
    return nil, domain.ErrNotFound
}

// database/sql
if errors.Is(err, sql.ErrNoRows) {
    return nil, domain.ErrNotFound
}

// Helper function
func mapNotFound(err error) error {
    if errors.Is(err, pgx.ErrNoRows) {
        return domain.ErrNotFound
    }
    return err
}
```

## When to Use

Apply when reviewing database access code. Flag violations as:
- **CRITICAL**: Missing `rows.Close()`, missing `tx.Rollback()` defer, SQL injection (string concatenation), missing ErrNoRows check
- **WARNING**: No connection pool tuning, individual queries instead of batch, missing `rows.Err()` check
- **SUGGESTION**: Could use pgx.CollectRows, transaction helper function, COPY for bulk inserts
