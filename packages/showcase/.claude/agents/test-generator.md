---
name: test-generator
description: Generate Go table-driven tests following SocialApp patterns
model: opus
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Test Generator — SocialApp

Generate Go tests following SocialApp conventions and patterns.

## Phase 0: Load Project Context

Read if exists:
1. `CLAUDE.md` or `AGENTS.md` — project conventions
2. `docs/architecture/` — relevant architecture docs for the task at hand

**Use this context to:**
- Know project-specific conventions and patterns
- Identify documented rules to check with HIGH confidence
- Understand the tech stack and framework in use

## Test Naming Convention

Table-driven test names follow **"should [expected behavior] when [condition]"** format:

```go
tests := []struct {
    name string
    // ...
}{
    {name: "should return 200 when valid input"},
    {name: "should return 400 when body is malformed JSON"},
    {name: "should return 404 when user does not exist"},
    {name: "should return 409 when like already exists"},
    {name: "should reset quota when local midnight crosses"},
    {name: "should reject when age is under 18"},
    {name: "should fallback to DB when API returns 5xx in dual mode"},
}
```

## Test Patterns

### Handler Tests

```go
func TestXxxHandler_MethodName(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        path       string
        body       string
        wantStatus int
        wantBody   string
    }{
        {
            name:       "should return 200 when valid input",
            method:     http.MethodPost,
            path:       "/v1/resource",
            body:       `{"field": "value"}`,
            wantStatus: http.StatusOK,
        },
        {
            name:       "should return 400 when body is malformed JSON",
            method:     http.MethodPost,
            path:       "/v1/resource",
            body:       `{invalid}`,
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
            req.Header.Set("Content-Type", "application/json")
            rec := httptest.NewRecorder()

            handler := NewXxxHandler(mockService)
            handler.MethodName(rec, req)

            if rec.Code != tt.wantStatus {
                t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
            }
        })
    }
}
```

### Service Tests

```go
func TestService_MethodName(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        setup   func(*MockRepo)
        want    OutputType
        wantErr error
    }{
        {
            name:  "should return profile when user exists",
            input: InputType{UserID: 42},
            setup: func(r *MockRepo) {
                r.getByID = func(ctx context.Context, id int64) (*domain.User, error) {
                    return &domain.User{ID: id, Name: "Alice"}, nil
                }
            },
            want: OutputType{Name: "Alice"},
        },
        {
            name:    "should return ErrNotFound when user does not exist",
            input:   InputType{UserID: 999},
            setup:   func(r *MockRepo) { r.getByID = returnNilUser },
            wantErr: domain.ErrNotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := &MockRepo{}
            if tt.setup != nil {
                tt.setup(repo)
            }
            svc := NewService(repo)
            got, err := svc.MethodName(context.Background(), tt.input)
            if !errors.Is(err, tt.wantErr) {
                t.Fatalf("err = %v, want %v", err, tt.wantErr)
            }
            if tt.wantErr == nil && got != tt.want {
                t.Fatalf("got = %+v, want %+v", got, tt.want)
            }
        })
    }
}
```

### Bot Handler Tests

Bot handlers use `httptest.NewServer` to mock the backend API, then verify callback query handling and chat state transitions:

```go
func TestBotHandler_CallbackQuery(t *testing.T) {
    t.Parallel()

    // 1. Mock backend API
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        switch r.URL.Path {
        case "/admin/bot/mod/queue/acquire":
            w.Header().Set("Content-Type", "application/json")
            _, _ = w.Write([]byte(`{
                "moderation_item": {"id": 91, "user_id": 501, "status": "PENDING"},
                "profile": {"user_id": 501, "display_name": "John"},
                "media": {"photos": ["photo1.jpg"]}
            }`))
        case "/admin/bot/mod/decide":
            if r.Method != http.MethodPost {
                t.Fatalf("unexpected method: %s", r.Method)
            }
            w.WriteHeader(http.StatusOK)
            _, _ = w.Write([]byte(`{"ok": true}`))
        default:
            t.Fatalf("unexpected path: %s", r.URL.Path)
        }
    }))
    defer server.Close()

    // 2. Create client pointing to mock server
    client, err := adminhttp.NewClient(server.URL, "bot-token", 2*time.Second)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    // 3. Verify behavior
    repo := adminhttp.NewModerationRepo(client, nil, false)
    ctx := adminhttp.WithActorTGID(context.Background(), 700001)

    item, err := repo.AcquireNextPending(ctx, 700001, 10*time.Minute)
    if err != nil {
        t.Fatalf("acquire: %v", err)
    }
    if item.ID != 91 || item.UserID != 501 {
        t.Fatalf("unexpected item: %+v", item)
    }
}
```

Key patterns for bot tests:
- Use `httptest.NewServer` to mock admin API responses
- Set `X-Actor-Tg-Id` header for actor identification
- Verify callback data parsing (e.g. `approve:91`, `reject:91`)
- Test state transitions: idle -> acquired -> approved/rejected
- Test cached profile/media access after acquire

### Chat State Verification (Bot)

For bots with conversational state, verify state transitions:

```go
func TestBotStateMachine(t *testing.T) {
    tests := []struct {
        name         string
        initialState ChatState
        callbackData string
        wantState    ChatState
        wantMessage  string
    }{
        {
            name:         "should transition to reviewing when acquire succeeds",
            initialState: StateIdle,
            callbackData: "next",
            wantState:    StateReviewing,
            wantMessage:  "Новый кейс",
        },
        {
            name:         "should return to idle when approve completes",
            initialState: StateReviewing,
            callbackData: "approve:91",
            wantState:    StateIdle,
            wantMessage:  "Одобрено",
        },
        {
            name:         "should enter reject flow when reject pressed",
            initialState: StateReviewing,
            callbackData: "reject:91",
            wantState:    StateAwaitingReason,
            wantMessage:  "Укажите причину",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            handler := newTestHandler(tt.initialState)
            result := handler.HandleCallback(tt.callbackData)
            if result.State != tt.wantState {
                t.Errorf("state = %v, want %v", result.State, tt.wantState)
            }
            if !strings.Contains(result.Message, tt.wantMessage) {
                t.Errorf("message = %q, want substring %q", result.Message, tt.wantMessage)
            }
        })
    }
}
```

### Integration Tests with pgx Mock Pools

For repository tests that need a database-like interface without a real DB:

```go
// mockPool implements the minimal pgxpool interface needed by repos
type mockPool struct {
    queryRowFn func(ctx context.Context, sql string, args ...any) pgx.Row
    queryFn    func(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
    execFn     func(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func (m *mockPool) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
    if m.queryRowFn != nil {
        return m.queryRowFn(ctx, sql, args...)
    }
    return &emptyRow{}
}
```

For true integration tests against a real database:

```go
func TestRepoIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test in short mode")
    }

    dsn := os.Getenv("TEST_DATABASE_URL")
    if dsn == "" {
        t.Skip("TEST_DATABASE_URL not set")
    }

    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        t.Fatalf("connect: %v", err)
    }
    defer pool.Close()

    // Run in a transaction that rolls back — clean state per test
    tx, err := pool.Begin(context.Background())
    if err != nil {
        t.Fatalf("begin tx: %v", err)
    }
    defer tx.Rollback(context.Background())

    repo := postgres.NewUserRepo(pool)
    // ... test repo methods against real SQL
}
```

## Edge Case Heuristics

When generating tests, **always** include edge cases from this checklist:

### Boundary Values
- Zero, one, max for numeric inputs (`limit=0`, `limit=1`, `limit=100`)
- Empty string vs nil for optional string fields
- Min/max ages (`age=18`, `age=60`) at boundaries
- Timestamps: epoch zero, far future, now
- `radius_km=1` (minimum), `radius_km=100` (maximum)

### Nil / Empty Inputs
- Nil context (should panic or return clear error)
- Nil pointer fields in structs that are declared optional
- Empty slices vs nil slices (`goals=[]` vs `goals=nil`)
- Empty JSON body (`{}`) vs missing body
- Empty string where non-empty is required (`display_name=""`)

### Concurrent Access
- Two goroutines calling `ConsumeLike` for the same user simultaneously
- Concurrent `AcquireNextPending` — only one should win the lock
- Race between `Approve` and `Reject` on the same moderation item
- Test with `t.Parallel()` on independent test cases

```go
func TestService_ConcurrentConsume(t *testing.T) {
    t.Parallel()
    svc := newTestService()
    ctx := context.Background()
    userID := int64(42)

    var wg sync.WaitGroup
    errs := make([]error, 10)
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(idx int) {
            defer wg.Done()
            _, errs[idx] = svc.ConsumeLike(ctx, userID, "")
        }(i)
    }
    wg.Wait()

    // Count successes — should not exceed daily limit
    successes := 0
    for _, err := range errs {
        if err == nil {
            successes++
        }
    }
    if successes > svc.config.FreeLikesPerDay {
        t.Fatalf("exceeded daily limit: %d successes", successes)
    }
}
```

### Expired Locks / Timeouts
- Moderation lock expired — next acquire should succeed
- JWT token expired — handler should return 401
- Redis session expired — should force re-auth
- Boost timer expired — should deactivate boost

```go
{
    name: "should allow re-acquire when previous lock expired",
    setup: func(r *MockRepo) {
        r.lockedAt = time.Now().Add(-15 * time.Minute) // lock expired (10min TTL)
    },
    wantErr: nil,
},
{
    name: "should reject acquire when lock is still active",
    setup: func(r *MockRepo) {
        r.lockedAt = time.Now().Add(-5 * time.Minute) // lock still valid
    },
    wantErr: ErrAlreadyLocked,
},
```

### State Transitions
- Approve an already-approved item (idempotent or error?)
- Reject a PENDING_UPDATE item (should revert to last approved)
- Delete a user with active boost/subscriptions
- Swipe on a user who was just deleted (soft delete)

### SQL-Specific
- NULL values in COALESCE chains
- Empty result set (no rows) — return `[]` not `nil`
- Duplicate key on INSERT (ON CONFLICT behavior)
- Foreign key violation (referenced user deleted)

## Instructions

When asked to generate tests:
1. Read the target file to understand the function signatures
2. Read existing tests in the same package for style consistency
3. Generate table-driven tests with **"should [behavior] when [condition]"** naming
4. Cover these categories:
   - Happy path (valid input, expected output)
   - Validation errors (bad input, malformed JSON, missing required fields)
   - Not found (missing resource)
   - Conflict (duplicate, already exists)
   - Boundary values (min, max, zero, empty)
   - Nil/empty inputs (nil pointers, empty strings, empty slices)
   - Expired state (locks, tokens, timers)
   - Concurrent access (where applicable)
5. Use `httptest` for handler tests, `httptest.NewServer` for bot API mocks
6. Mock interfaces, not concrete types
7. Test file: same package, `_test.go` suffix
8. Use `t.Parallel()` on independent test cases
9. Use `t.Fatalf` for setup failures, `t.Errorf` for assertion failures
10. For bot handlers: mock admin API with `httptest.NewServer`, verify callback data parsing, test state transitions
