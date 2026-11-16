# Testing Patterns

> Background for test-generator (writing Go tests) and go-reviewer (reviewing them), loaded on demand. The consuming agent's rules win over this file. Each recipe carries a **test-generator:** tag:
> **use** — fits its rules as shown · **use if go.mod has it** — only when the module already depends on that library (never add one) · **write, NOT RUN** — written in the project's existing style but needs a service or container the agent never starts, so it is reported NOT RUN · **humans only** — contradicts test-generator's Rules 1, 3–4 or Command Policy; for a person or a refactoring workflow, never the agent.
> Examples use testify (`require`/`assert`) where shown; without `github.com/stretchr/testify` in go.mod, use `t.Fatalf`/`t.Errorf`.

## Table-Driven Tests

**test-generator:** use.

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

**test-generator:** use.

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

**test-generator:** use (independent fixtures only; `t.Setenv` cannot run in parallel tests).

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

**test-generator:** use for the target and its seed corpus, run as an ordinary test: without `-fuzz`, `go test -run '^FuzzParseJSON$'` calls the target with the seed corpus only (`f.Add` values plus files in `testdata/fuzz/FuzzParseJSON/`), deterministically. `-fuzz=` exploration is **humans only**: it is non-deterministic and writes any failing input to `testdata/fuzz/<Name>/`.

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

**test-generator:** use if go.mod has it (`go.uber.org/goleak`).

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

**test-generator:** use when the `go` directive is 1.25+; on 1.24 only if the project already sets `GOEXPERIMENT=synctest`.

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

**test-generator:** use; a test server whose router needs a real database or service → write, NOT RUN.

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

**test-generator:** use the project's existing tag for integration tests. The `./...` commands below are project/CI invocations; the agent runs its own scoped command, and tagged tests that need a service are reported NOT RUN.

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

**test-generator:** write, NOT RUN — only when the project already uses testcontainers; the agent never starts containers, so it names the `go test -tags=integration …` command for a person or CI to run.

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

**test-generator:** humans only — its Rule 4 forbids adding a golden or snapshot assertion and running `-update` (a missing golden written by the code under test passes whatever it returns). It may run an existing golden test in verify mode as part of its scoped command.

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

**test-generator:** humans only — the profile run covers the whole module and writes `cover.out` into the working tree; the agent runs only scoped test commands.

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

**test-generator:** only on an explicit caller request, under its Characterization exception — code unchanged since HEAD, current output as the oracle, expected values inline (never golden files), reported in Scope as `ASSUMED: characterization — <targets>`. Otherwise humans only: the agent's oracle is the spec, never the code.

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

**test-generator:** humans only — a seam is a production-code change; the agent edits test files only.

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

**test-generator:** use.

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

## Review Signals (go-reviewer)

Worth checking when reviewing Go test code. Severity comes from the reviewing agent's own rubric and Evidence Gate, never from this list; test-generator reports defects in the code under test, not these.
- Error paths untested; shared mutable state in parallel tests; `rows.Close()` missing in a test helper
- Grouped scenarios without subtests; parsers without fuzz targets; integration tests without a build tag
- Repetition a table would remove; goroutine tests without goleak (when go.mod has it); storage tested only through mocks (testcontainers, when the project uses it)
