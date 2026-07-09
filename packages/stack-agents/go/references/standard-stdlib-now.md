# Standard Library Replacements

Catalog of standard library packages that replace common third-party dependencies. Use this to keep dependency count low and code idiomatic.

## Strings and slices

| Was: | Now: |
|------|------|
| `github.com/elliotchance/orderedmap` | `slices.SortedFunc` + `maps.Keys` (1.23+) |
| `github.com/duo-labs/webauthn/protocol/util` for slice utils | `slices.Contains`, `slices.Index`, `slices.Equal` |
| Custom `Reverse(s)` | `slices.Reverse` |
| Manual `Map`/`Filter` loops | `slices.Collect`, `slices.DeleteFunc` |
| Slice prealloc patterns | `slices.Grow(s, n)` |

```go
import "slices"

s := []int{3, 1, 4, 1, 5}
slices.Sort(s)                            // sort.Ints replaced
ok := slices.Contains(s, 4)                // manual loop replaced
idx := slices.IndexFunc(s, func(x int) bool { return x > 3 })
s = slices.DeleteFunc(s, func(x int) bool { return x == 1 })
```

## Maps

| Was: | Now: |
|------|------|
| Custom `MapKeys` | `slices.Collect(maps.Keys(m))` |
| Custom `MapValues` | `slices.Collect(maps.Values(m))` |
| `reflect.DeepEqual` for maps | `maps.Equal`, `maps.EqualFunc` |
| Manual map copy | `maps.Clone` |

```go
import "maps"

a := map[string]int{"a": 1, "b": 2}
b := maps.Clone(a)
maps.Equal(a, b)  // true
```

## Iteration

| Was: | Now: |
|------|------|
| `for i := 0; i < n; i++` | `for i := range n` (1.22+) |
| Manual generator with channels | Range over functions: `for v := range gen` (1.23+) |

```go
// 1.22+
for i := range 10 {
    fmt.Println(i)
}

// 1.23+ — iterator function
func count(n int) func(yield func(int) bool) {
    return func(yield func(int) bool) {
        for i := 0; i < n; i++ { if !yield(i) { return } }
    }
}

for v := range count(5) { fmt.Println(v) }
```

## HTTP routing

Pre-1.22: required `gorilla/mux`, `chi`, `httprouter`, etc. for method-aware routing.

Post-1.22: built-in.

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // ...
})
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("DELETE /users/{id}", deleteUser)
```

For complex needs (middleware chains, route groups, sub-router composition) `chi` is still excellent.

## Random

| Was: | Now: |
|------|------|
| `math/rand` + manual seed | `math/rand/v2` (auto-seeded, faster) |

```go
import "math/rand/v2"

n := rand.IntN(100)           // [0, 100)
f := rand.Float64()           // [0, 1)
shuffled := rand.Shuffle(...) // built-in
```

## Errors

| Was: | Now: |
|------|------|
| `pkg/errors` | `errors` package + `fmt.Errorf("%w", err)` |
| `pkg/errors.Wrap(err, "msg")` | `fmt.Errorf("msg: %w", err)` |
| `pkg/errors.Cause(err)` | `errors.Unwrap` / `errors.As` |
| Type-based error checks | `errors.Is`, `errors.As` |

```go
if errors.Is(err, sql.ErrNoRows) { /* not found */ }

var pgErr *pgconn.PgError
if errors.As(err, &pgErr) {
    if pgErr.Code == "23505" { /* unique violation */ }
}
```

## Logging

| Was: | Now: |
|------|------|
| `github.com/sirupsen/logrus` (sometimes) | `log/slog` (structured) |
| `go-kit/log` | `log/slog` |
| Custom JSON logger | `slog.NewJSONHandler` |

```go
import "log/slog"

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("user signed in", "user_id", u.ID, "method", "oauth")
```

Compatible with most existing log shippers via JSON output.

## Crypto

`crypto/rand` for randomness; `crypto/subtle.ConstantTimeCompare` for secret comparison; `crypto/ed25519`, `crypto/aes`, etc. cover most needs without third-party libs.

### KDFs and hashes now in stdlib (Go 1.24)

Three `golang.org/x/crypto` packages graduated into the standard library — reach for these first:

| Was: `golang.org/x/crypto/...` | Now: stdlib |
|--------------------------------|-------------|
| `pbkdf2` | `crypto/pbkdf2` |
| `hkdf` | `crypto/hkdf` |
| `sha3` | `crypto/sha3` |

```go
import (
    "crypto/pbkdf2"
    "crypto/sha256"
)

// Go 1.24: pbkdf2.Key returns (key, error) — always check the error
dk, err := pbkdf2.Key(sha256.New, password, salt, 600_000, 32)
if err != nil {
    return err
}
```

Still on `x/crypto` (no stdlib equivalent yet): `bcrypt`, `argon2`, `scrypt` for password hashing.

## Built-ins worth using

| Built-in | What |
|---------|------|
| `min(a, b, ...)` | Generic min (1.21+) |
| `max(a, b, ...)` | Generic max (1.21+) |
| `clear(m)` | Clear a map (1.21+) — keeps capacity, removes all entries |
| `any` | Alias for `interface{}` (1.18+) |

## Cases where you SHOULD keep the third-party

- **UUIDs** — `github.com/google/uuid` is still standard
- **HTTP client retry** — stdlib has none; `hashicorp/go-retryablehttp` works
- **Validation** — `go-playground/validator` covers struct tags well
- **Migrations** — `golang-migrate` or `goose` cover what stdlib does not
- **DI** — `uber/fx`, `google/wire`, `samber/do` (see `di-frameworks.md`)

## See also

- `modernize-guide.md` — running `modernize` to find these automatically
- `stay-updated.md` — when each stdlib addition arrived
