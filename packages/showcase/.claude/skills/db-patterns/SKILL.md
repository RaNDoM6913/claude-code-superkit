---
name: db-patterns
description: SocialApp database patterns — pgx usage, migrations, repository layer, transactions, common queries
user-invocable: false
---

# Database Patterns

## Current State
- Latest migration: !`ls backend/migrations/*.up.sql | sort | tail -1 | xargs basename`
- Total migrations: !`ls backend/migrations/*.up.sql 2>/dev/null | wc -l | tr -d ' '`
- Repository count: !`ls backend/internal/repo/postgres/*_repo.go 2>/dev/null | wc -l | tr -d ' '`

## Stack
- PostgreSQL 16
- Driver: `jackc/pgx/v5` (connection pool via `pgxpool`)
- No ORM — raw SQL queries

## Repository Pattern

```go
type UserRepo struct {
    pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
    return &UserRepo{pool: pool}
}

// Nil-safety check
func (r *UserRepo) Ready() bool {
    return r != nil && r.pool != nil
}
```

## Common Query Patterns

### SELECT single row
```go
func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
    var u domain.User
    err := r.pool.QueryRow(ctx, `
        SELECT id, name, email, created_at
        FROM users
        WHERE id = $1
    `, id).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, nil // or return specific ErrNotFound
        }
        return nil, fmt.Errorf("UserRepo.GetByID: %w", err)
    }
    return &u, nil
}
```

### SELECT multiple rows
```go
func (r *UserRepo) List(ctx context.Context, limit, offset int) ([]domain.User, error) {
    rows, err := r.pool.Query(ctx, `
        SELECT id, name, email, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("UserRepo.List: %w", err)
    }
    defer rows.Close()

    var users []domain.User
    for rows.Next() {
        var u domain.User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
            return nil, fmt.Errorf("UserRepo.List scan: %w", err)
        }
        users = append(users, u)
    }
    return users, rows.Err()
}
```

### INSERT
```go
func (r *UserRepo) Create(ctx context.Context, u *domain.User) error {
    _, err := r.pool.Exec(ctx, `
        INSERT INTO users (name, email, created_at)
        VALUES ($1, $2, now())
    `, u.Name, u.Email)
    if err != nil {
        return fmt.Errorf("UserRepo.Create: %w", err)
    }
    return nil
}
```

### INSERT RETURNING
```go
err := r.pool.QueryRow(ctx, `
    INSERT INTO users (name, email) VALUES ($1, $2)
    RETURNING id, created_at
`, u.Name, u.Email).Scan(&u.ID, &u.CreatedAt)
```

### UPSERT
```go
_, err := r.pool.Exec(ctx, `
    INSERT INTO settings (key, value, updated_at)
    VALUES ($1, $2, now())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()
`, key, value)
```

### JSONB queries
```go
// Insert JSONB
_, err := r.pool.Exec(ctx, `
    INSERT INTO events (user_id, payload) VALUES ($1, $2)
`, userID, payload) // payload is []byte or map marshaled to JSON

// Query JSONB
rows, err := r.pool.Query(ctx, `
    SELECT id, payload
    FROM events
    WHERE payload->>'type' = $1
`, eventType)
```

## Error Wrapping Convention

Always wrap errors with repo + method context:
```go
return nil, fmt.Errorf("AdminSettingsRepo.GetProfile: %w", err)
```

## Migration Format

Location: `backend/migrations/`
Naming: `000NNN_snake_case_description.{up,down}.sql`

### up.sql conventions
```sql
CREATE TABLE IF NOT EXISTS my_table (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending',
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_my_table_user_id ON my_table(user_id);
CREATE INDEX IF NOT EXISTS idx_my_table_status ON my_table(status);
```

### down.sql conventions
```sql
DROP TABLE IF EXISTS my_table;
```

## Connection Pool

Initialized in `backend/internal/app/apiapp/app.go`:
```go
pool := pgrepo.NewPool(ctx, cfg.Postgres.DSN)
```

DSN format: `postgres://app:app@localhost:5432/myapp?sslmode=disable`

## Redis Patterns

Location: `backend/internal/repo/redis/`

Used for:
- Session storage (JWT session tracking)
- Rate limiting
- Risk data caching
- Anti-abuse state

```go
client := redrepo.NewClient(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB)
sessionRepo := redrepo.NewSessionRepo(client)
```
