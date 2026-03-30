# Naming Conventions

> Reference document for go-reviewer. Loaded on demand via Read tool.

## MixedCaps Rules

Go uses MixedCaps (exported) and mixedCaps (unexported). Never use snake_case or SCREAMING_SNAKE_CASE for any identifier.

```go
// CORRECT
type UserService struct{}
func (s *UserService) FindByID(id int64) (*User, error)
var maxRetryCount = 3

// WRONG
type user_service struct{}    // snake_case
func find_by_id()             // snake_case
var MAX_RETRY_COUNT = 3       // screaming snake
```

## Package Naming

| Rule | Good | Bad | Why |
|------|------|-----|-----|
| Lowercase, single word | `user`, `auth`, `store` | `userStore`, `user_store` | Go convention |
| No util/common/base/misc | `strings`, `bytes` | `util`, `common`, `helpers` | Names should describe what, not how |
| No plural unless collection | `user` (package) | `users` (package) | Package name joins with exported names |
| Short, concise | `io`, `os`, `fmt` | `inputoutput`, `operatingsystem` | Brevity is a Go value |
| No stuttering with exports | `http.Client` | `http.HTTPClient` | Package name is already context |

```go
// CORRECT — package name provides context
package user
type Service struct{}    // used as user.Service
type Repository struct{} // used as user.Repository

// WRONG — stuttering
package user
type UserService struct{}    // user.UserService stutters
type UserRepository struct{} // user.UserRepository stutters
```

## Interface Naming

Interfaces follow the **-er** suffix convention and should be **small** (1-3 methods). Define interfaces on the **consumer side**, not the provider side.

```go
// CORRECT — small, -er suffix, consumer-defined
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}

type UserFinder interface {
    FindByID(ctx context.Context, id int64) (*User, error)
}

// WRONG — too large, provider-side, no -er suffix
type UserOperations interface {
    Create(ctx context.Context, u *User) error
    Update(ctx context.Context, u *User) error
    Delete(ctx context.Context, id int64) error
    FindByID(ctx context.Context, id int64) (*User, error)
    FindAll(ctx context.Context) ([]*User, error)
    Search(ctx context.Context, q string) ([]*User, error)
}
```

**Decision table — interface size:**

| Methods | Pattern | Example |
|---------|---------|---------|
| 1 | `-er` suffix | `Reader`, `Writer`, `Closer` |
| 2-3 | Compound `-er` or descriptive | `ReadWriter`, `UserFinder` |
| 4+ | Split into smaller interfaces | Compose via embedding |

## Error Variable Naming

```go
// Sentinel errors: Err + condition
var ErrNotFound = errors.New("not found")
var ErrAlreadyExists = errors.New("already exists")
var ErrInvalidInput = errors.New("invalid input")

// Error types: suffix with Error
type ValidationError struct {
    Field   string
    Message string
}

type NotFoundError struct {
    Entity string
    ID     int64
}
```

## Receiver Naming

Receivers use **1-2 character** abbreviations derived from the type name. Never use `this` or `self`.

```go
// CORRECT
func (s *UserService) FindByID(id int64) (*User, error)
func (r *Repository) Save(u *User) error
func (c *Client) Do(req *Request) (*Response, error)
func (b *Builder) WithTimeout(d time.Duration) *Builder

// WRONG
func (self *UserService) FindByID(id int64) (*User, error)
func (this *Repository) Save(u *User) error
func (userService *UserService) FindByID(id int64) (*User, error)
```

**Receiver abbreviation rules:**
- First letter of type: `s` for `Service`, `r` for `Repository`
- Two letters if ambiguous: `us` for `UserService` if `s` is taken
- Consistent across all methods of the same type

## Acronym Rules

Acronyms are **all caps** regardless of position. Never mix case within an acronym.

| Acronym | Exported | Unexported | Wrong |
|---------|----------|------------|-------|
| ID | `UserID` | `userID` | `UserId`, `userId` |
| URL | `ServerURL` | `serverURL` | `ServerUrl`, `serverUrl` |
| HTTP | `HTTPClient` | `httpClient` | `HttpClient`, `httpClient` (when exported) |
| API | `APIServer` | `apiServer` | `ApiServer` |
| SQL | `SQLQuery` | `sqlQuery` | `SqlQuery` |
| JSON | `JSONEncoder` | `jsonEncoder` | `JsonEncoder` |
| XML | `XMLParser` | `xmlParser` | `XmlParser` |
| TCP | `TCPConn` | `tcpConn` | `TcpConn` |

```go
// CORRECT
func ParseURL(rawURL string) (*URL, error)
func (c *Client) SetHTTPTimeout(d time.Duration)
type JSONResponse struct {
    UserID int64  `json:"user_id"`
    APIURL string `json:"api_url"`
}

// WRONG
func ParseUrl(rawUrl string) (*Url, error)
func (c *Client) SetHttpTimeout(d time.Duration)
```

## Stuttering Avoidance

The package name is part of every qualified reference. Never repeat it in exported names.

```go
// Package http
http.Client          // not http.HTTPClient
http.Server          // not http.HTTPServer
http.Request         // not http.HTTPRequest

// Package user
user.Service         // not user.UserService
user.Repository      // not user.UserRepository
user.NotFoundError   // not user.UserNotFoundError

// Package config
config.Load()        // not config.LoadConfig()
config.Default()     // not config.DefaultConfig()
```

## When to Use

Apply these rules when reviewing any Go code for naming issues. Flag violations as:
- **CRITICAL**: Stuttering in public API, snake_case in exported names
- **WARNING**: Wrong acronym casing, receiver named `self`/`this`, large interfaces
- **SUGGESTION**: Verbose package names, receiver names longer than 2 chars
