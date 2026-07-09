# Testing Patterns

> Reference document for test-generator. Loaded on demand via Read tool.

## Table-Driven Tests

The standard Go pattern for testing multiple cases with shared setup.

```go
func TestParseStatus(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    Status
        wantErr error
    }{
        {
            name:  "valid active",
            input: "active",
            want:  StatusActive,
        },
        {
            name:  "valid inactive",
            input: "inactive",
            want:  StatusInactive,
        },
        {
            name:    "empty string",
            input:   "",
            wantErr: ErrInvalidStatus,
        },
        {
            name:    "unknown value",
            input:   "deleted",
            wantErr: ErrInvalidStatus,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseStatus(tt.input)

            if tt.wantErr != nil {
                if !errors.Is(err, tt.wantErr) {
                    t.Errorf("ParseStatus(%q) error = %v, wantErr = %v", tt.input, err, tt.wantErr)
                }
                return
            }

            if err != nil {
                t.Fatalf("ParseStatus(%q) unexpected error: %v", tt.input, err)
            }
            if got != tt.want {
                t.Errorf("ParseStatus(%q) = %v, want %v", tt.input, got, tt.want)
            }
        })
    }
}
```

## Subtests

Group related tests and provide isolation. Each subtest can be run independently.

```go
func TestUserService(t *testing.T) {
    svc := setupTestService(t)

    t.Run("Create", func(t *testing.T) {
        t.Run("valid user", func(t *testing.T) {
            user, err := svc.Create(ctx, validUser)
            require.NoError(t, err)
            assert.NotZero(t, user.ID)
        })

        t.Run("duplicate email", func(t *testing.T) {
            _, _ = svc.Create(ctx, validUser)
            _, err := svc.Create(ctx, validUser)
            assert.ErrorIs(t, err, domain.ErrAlreadyExists)
        })
    })

    t.Run("FindByID", func(t *testing.T) {
        t.Run("existing user", func(t *testing.T) {
            created, _ := svc.Create(ctx, validUser)
            found, err := svc.FindByID(ctx, created.ID)
            require.NoError(t, err)
            assert.Equal(t, created.ID, found.ID)
        })

        t.Run("non-existent user", func(t *testing.T) {
            _, err := svc.FindByID(ctx, 99999)
            assert.ErrorIs(t, err, domain.ErrNotFound)
        })
    })
}

// Run specific subtest:
// go test -run TestUserService/Create/valid_user
```

## t.Parallel

Marks a subtest for parallel execution. Critical rule: **don't share mutable state between parallel tests.**

```go
func TestProcess(t *testing.T) {
    tests := []struct {
        name  string
        input string
        want  string
    }{
        {"lowercase", "hello", "HELLO"},
        {"uppercase", "WORLD", "WORLD"},
        {"mixed", "GoLang", "GOLANG"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // runs concurrently with other parallel subtests

            got := Process(tt.input)
            if got != tt.want {
                t.Errorf("Process(%q) = %q, want %q", tt.input, got, tt.want)
            }
        })
    }
}
```

**Parallel test rules:**
- Never access shared mutable state (test fixtures, external resources)
- Each parallel test should be fully independent
- The parent test waits for all parallel children before returning
- Use `t.Cleanup` for per-test teardown

## Fuzzing (Go 1.18+)

Automatically generate inputs to find edge cases and panics.

```go
func FuzzParseJSON(f *testing.F) {
    // Seed corpus — known-good inputs
    f.Add([]byte(`{"name":"alice","age":30}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(`null`))
    f.Add([]byte(`[]`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var user User
        err := json.Unmarshal(data, &user)
        if err != nil {
            return // invalid JSON is expected
        }

        // Re-marshal and verify roundtrip
        encoded, err := json.Marshal(user)
        if err != nil {
            t.Fatalf("Marshal after successful Unmarshal failed: %v", err)
        }

        var user2 User
        if err := json.Unmarshal(encoded, &user2); err != nil {
            t.Fatalf("Roundtrip failed: %v", err)
        }
    })
}

// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s
// Corpus stored in: testdata/fuzz/FuzzParseJSON/
```

## goleak Integration

Detect goroutine leaks in tests using go.uber.org/goleak.

```go
// Option 1: Package-level — catches leaks from any test
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}

// Option 2: Per-test — granular control
func TestWorker(t *testing.T) {
    defer goleak.VerifyNone(t)

    w := NewWorker()
    w.Start()
    w.Stop() // must stop cleanly, no leaked goroutines
}
```

## synctest (Go 1.24 experimental / Go 1.25+ stable)

Deterministic goroutine scheduling for testing concurrent code. Eliminates flaky timing-dependent tests.

Use synctest.Test in Go 1.25+; synctest.Run was the Go 1.24 experimental API (behind GOEXPERIMENT=synctest).

```go
import "testing/synctest"

func TestDebouncer(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        var count atomic.Int32
        debounce := NewDebouncer(100*time.Millisecond, func() {
            count.Add(1)
        })

        debounce.Trigger()
        debounce.Trigger()
        debounce.Trigger()

        // Advance virtual time — no real sleeping
        synctest.Wait() // wait for all goroutines to block
        time.Sleep(100 * time.Millisecond) // virtual sleep, instant in real time

        synctest.Wait()
        if got := count.Load(); got != 1 {
            t.Errorf("expected 1 call, got %d", got)
        }
    })
}
```

## httptest

### Unit Tests — ResponseRecorder

```go
func TestHealthHandler(t *testing.T) {
    req := httptest.NewRequest("GET", "/health", nil)
    w := httptest.NewRecorder()

    HealthHandler(w, req)

    resp := w.Result()
    assert.Equal(t, http.StatusOK, resp.StatusCode)

    body, _ := io.ReadAll(resp.Body)
    assert.JSONEq(t, `{"status":"ok"}`, string(body))
}
```

### Integration Tests — Test Server

```go
func TestAPIIntegration(t *testing.T) {
    handler := setupRouter() // your actual router
    srv := httptest.NewServer(handler)
    defer srv.Close()

    client := &http.Client{Timeout: 5 * time.Second}

    resp, err := client.Get(srv.URL + "/api/users")
    require.NoError(t, err)
    defer resp.Body.Close()

    assert.Equal(t, http.StatusOK, resp.StatusCode)

    var users []User
    require.NoError(t, json.NewDecoder(resp.Body).Decode(&users))
    assert.NotEmpty(t, users)
}
```

## Build Tags

Separate slow integration tests from fast unit tests.

```go
//go:build integration

package user_test

import (
    "testing"
)

func TestDatabaseIntegration(t *testing.T) {
    pool := setupTestDB(t)
    defer pool.Close()
    // ...
}
```

```bash
# Canonical local/CI invocation — race detector + test-order shuffle
go test -race -shuffle=on ./...

# Run only unit tests (default, no tags)
go test ./...

# Run integration tests
go test -tags=integration ./...

# Run all tests
go test -tags=integration ./...
```

`go test -race -shuffle=on ./...` is the canonical local/CI invocation: `-race` surfaces data races and `-shuffle=on` surfaces hidden inter-test ordering dependencies. Reserve `-race` for correctness/CI runs, not every incremental save — it costs a 2–3× slowdown.

## testcontainers

Docker-based dependencies for integration tests.

```go
//go:build integration

func setupPostgres(t *testing.T) *pgxpool.Pool {
    t.Helper()

    ctx := context.Background()
    container, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second),
        ),
    )
    require.NoError(t, err)

    t.Cleanup(func() {
        require.NoError(t, container.Terminate(ctx))
    })

    connStr, err := container.ConnectionString(ctx, "sslmode=disable")
    require.NoError(t, err)

    pool, err := pgxpool.New(ctx, connStr)
    require.NoError(t, err)

    t.Cleanup(func() { pool.Close() })

    // Run migrations
    runMigrations(t, connStr)

    return pool
}
```

## Golden Files

Compare output against known-good "golden" files. Update with `-update` flag.

```go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    tests := []struct {
        name   string
        input  Input
        golden string
    }{
        {"basic", basicInput, "testdata/basic.golden"},
        {"complex", complexInput, "testdata/complex.golden"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Render(tt.input)

            if *update {
                os.WriteFile(tt.golden, []byte(got), 0644)
                return
            }

            want, err := os.ReadFile(tt.golden)
            require.NoError(t, err)

            if diff := cmp.Diff(string(want), got); diff != "" {
                t.Errorf("Render mismatch (-want +got):\n%s", diff)
            }
        })
    }
}

// Update golden files: go test -run TestRender -update
// Verify: go test -run TestRender
```

## Coverage-Adaptive Refactoring Safety Net

Before you refactor (see `refactoring-mechanics.md`), measure the test coverage
of the *exact code you are about to move* and let that number set your caution.
Coverage is a floor for safety, not a target — the point is to know whether a
transform is guarded before you make it.

**Diagnostic — measure the blast radius's own coverage:**

```bash
go test -covermode=atomic -coverpkg=./... -coverprofile=cover.out ./...
go tool cover -func=cover.out   # per-function %, find the code you'll touch
go tool cover -html=cover.out   # line-level view of what's exercised
```

Read the **per-function** column, not the package total — a package at 75% can
hide a 0%-covered function you are about to rewrite.

**Tier your transforms by that function's coverage:**

| Coverage of the target | Posture | Allowed transforms |
|-----------------------|---------|--------------------|
| **≥ 80%** | Guarded | Aggressive transforms OK — any ladder rung, including hand-written `dst` surgery. Tests will catch a regression. |
| **40–80%** | Harden first | Add tests over the untested branches, *then* transform. Prefer construction-guaranteed rungs (`gofmt -r`, `eg`, gopls, `//go:fix`). |
| **< 40%** | Feathers mode | Write characterization tests and install seams *before any transform*; restrict to construction-guaranteed tools only. No freehand edits. |

### Characterization tests (distinct from Golden Files)

A **characterization test** pins the code's *current* behavior — bugs and all —
so a refactor can prove it changed nothing. You are not asserting what the code
*should* do; you are recording what it *does* today, so any drift fails loudly.
Feed representative inputs, run the code, and assert on whatever it returns
right now (even if that value is wrong — a `// KNOWN BUG: preserved` comment
belongs there, and the fix is a *separate, behavioral* commit).

This is a different intent from the **Golden Files** section above. Golden files
are one *implementation technique* — a good way to store a large characterization
expectation on disk — but characterization is the *purpose*: locking behavior
before a structural change. A `cmp.Diff` against an inline `want` is equally a
characterization test when its job is to pin legacy behavior.

### Object seams for untested code

Legacy code is often untestable because it reaches out to a concrete dependency
(a `*sql.DB`, a clock, an HTTP client) it constructs itself. Introduce an
**object seam**: extract the *smallest* interface the code actually uses, at the
*consumer* side, and inject it — now the untested unit is exercisable with a
fake.

```go
// Seam: the consumer declares only what it needs (design-patterns.md §5).
type rowQuerier interface {
    QueryContext(ctx context.Context, q string, args ...any) (*sql.Rows, error)
}

func loadUsers(ctx context.Context, db rowQuerier) ([]User, error) { /* ... */ }
// Prod passes *sql.DB; the characterization test passes a fake rowQuerier.
```

The seam is itself a refactor — introduce it *before* the transform you actually
want, in its own commit, guarded by the characterization tests it enables.

### Caveats

- **Statement coverage ≠ branch coverage.** `go test` reports statements
  executed, not branch/condition combinations. An 85% function can still have an
  untested error path — read `-html` output, don't trust the number alone.
- **`go test ./...` silently omits packages with no `_test.go` file.** They do
  not appear as 0% — they simply vanish from the report. Only `-coverpkg=./...`
  forces every package into the profile, revealing the truly-zero ones.
- **Run `deadcode -test ./...` first.** Do not spend characterization effort on
  code that nothing reaches; prune it (see `refactoring-mechanics.md`) instead.

## Test Helpers

```go
// t.Helper marks function as test helper — errors report caller's line
func createTestUser(t *testing.T, svc *UserService) *User {
    t.Helper()
    user, err := svc.Create(context.Background(), &User{
        Name:  "test-" + t.Name(),
        Email: fmt.Sprintf("test-%s@example.com", t.Name()),
    })
    require.NoError(t, err)

    t.Cleanup(func() {
        svc.Delete(context.Background(), user.ID)
    })

    return user
}
```

## When to Use

Apply when generating or reviewing tests. Flag violations as:
- **CRITICAL**: No error path testing, shared mutable state in parallel tests, missing `rows.Close()` in test
- **WARNING**: Missing subtests for grouped scenarios, no fuzz tests for parsers, integration tests without build tags
- **SUGGESTION**: Could use table-driven pattern, goleak for goroutine tests, testcontainers for DB tests
