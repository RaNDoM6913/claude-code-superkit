# GraphQL Patterns in Go

Schema-first GraphQL servers in Go. Covers `gqlgen` (de-facto standard, codegen) and `99designs/gqlgen` workflow patterns.

## Stack choice

- **`gqlgen`** — schema-first, codegen, type-safe. Use this unless you have a strong reason not to.
- `graph-gophers/graphql-go` — also good, runtime resolution, less codegen.
- `thunder` — Facebook's runtime resolver, mostly historical.

This document focuses on `gqlgen`.

## Project layout

```
graph/
├── schema.graphqls              # source of truth
├── model/
│   ├── models_gen.go            # generated from schema
│   └── custom.go                # manual model overrides
├── resolver.go                  # root resolver struct
├── schema.resolvers.go          # generated resolver stubs
└── generated/
    └── generated.go             # full generated server
gqlgen.yml                       # codegen config
```

Run `go run github.com/99designs/gqlgen generate` to regenerate after schema changes.

## gqlgen.yml essentials

```yaml
schema:
  - graph/schema.graphqls
exec:
  filename: graph/generated/generated.go
  package: generated
model:
  filename: graph/model/models_gen.go
  package: model
resolver:
  layout: follow-schema
  dir: graph
  package: graph
  filename_template: '{name}.resolvers.go'
autobind: []
models:
  ID:
    model: github.com/99designs/gqlgen/graphql.ID
  Int:
    model:
      - github.com/99designs/gqlgen/graphql.Int
      - github.com/99designs/gqlgen/graphql.Int64
```

## Schema-first design

```graphql
type User {
  id: ID!
  email: String!
  posts(first: Int = 20, after: String): PostConnection!
}

type Query {
  user(id: ID!): User
  users(first: Int = 20, after: String): UserConnection!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}

input CreatePostInput {
  title: String!
  body: String!
}

type Post {
  id: ID!
  author: User!
  title: String!
  body: String!
  createdAt: Time!
}

scalar Time
```

Run codegen → `User`, `Post`, `CreatePostInput` are now Go structs.

## Resolver — clean implementation

```go
// schema.resolvers.go
func (r *queryResolver) User(ctx context.Context, id string) (*model.User, error) {
    return r.UserSvc.GetByID(ctx, id)
}

func (r *userResolver) Posts(ctx context.Context, obj *model.User, first *int, after *string) (*model.PostConnection, error) {
    return r.PostSvc.ListByUser(ctx, obj.ID, *first, after)
}
```

Resolvers should be **thin** — delegate to a service, never put business logic in resolvers.

## N+1 prevention — DataLoader

Without DataLoader, `users { posts }` for 100 users runs 101 queries (1 for users, 100 for posts). Use `graph-gophers/dataloader` or `vektah/dataloaden`:

```go
type UserLoader struct {
    *dataloader.Loader
}

func (l *UserLoader) Load(ctx context.Context, id string) (*model.User, error) {
    res, err := l.Loader.Load(ctx, dataloader.StringKey(id))()
    if err != nil { return nil, err }
    return res.(*model.User), nil
}

// Batch function — takes a list of IDs, returns a list of results in the same order
func batchUsers(ctx context.Context, keys dataloader.Keys) []*dataloader.Result {
    ids := make([]string, len(keys))
    for i, k := range keys { ids[i] = k.String() }
    users, _ := userRepo.GetByIDs(ctx, ids)
    // ... return aligned results
}
```

Attach DataLoader to context in middleware so resolvers can access it.

## Authentication / Authorization

Pass a `User` into context via HTTP middleware, then check in resolvers:

```go
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, err := parseToken(r.Header.Get("Authorization"))
        if err == nil {
            r = r.WithContext(context.WithValue(r.Context(), userKey, user))
        }
        next.ServeHTTP(w, r)
    })
}

func (r *mutationResolver) CreatePost(ctx context.Context, input model.CreatePostInput) (*model.Post, error) {
    u, ok := ctx.Value(userKey).(*model.User)
    if !ok { return nil, fmt.Errorf("unauthorized") }
    return r.PostSvc.Create(ctx, u.ID, input)
}
```

For per-field authz, use `@auth` directive defined in schema and validated in directive resolver.

## Error handling

GraphQL has its own error envelope. Use `gqlerror` for structured errors:

```go
import "github.com/vektah/gqlparser/v2/gqlerror"

return nil, &gqlerror.Error{
    Message: "post not found",
    Extensions: map[string]interface{}{"code": "NOT_FOUND"},
}
```

Don't return raw Go errors — they leak stack traces.

## Subscriptions (WebSocket)

```graphql
type Subscription {
  postAdded(authorID: ID!): Post!
}
```

```go
func (r *subscriptionResolver) PostAdded(ctx context.Context, authorID string) (<-chan *model.Post, error) {
    ch := make(chan *model.Post, 1)
    r.PubSub.Subscribe(authorID, ch)
    go func() { <-ctx.Done(); r.PubSub.Unsubscribe(authorID, ch); close(ch) }()
    return ch, nil
}
```

Use Redis pub/sub or a queue under the hood — single-process map only works for dev.

## Pagination — Relay-style connections

Always use cursor-based `PostConnection { edges { node, cursor }, pageInfo }` for production. Offset pagination breaks on inserts/deletes during scroll.

## Testing

Use `gqlgen`'s `httptest` client:

```go
srv := handler.NewDefaultServer(generated.NewExecutableSchema(...))
c := client.New(srv)

var resp struct {
    User struct { ID string; Email string }
}
c.MustPost(`{ user(id: "1") { id email } }`, &resp)
require.Equal(t, "user@example.com", resp.User.Email)
```

## Anti-patterns

- **Business logic in resolvers** — keep resolvers thin
- **No DataLoader** — N+1 queries are silent perf killers
- **Returning raw `error`** — leaks internals; use `gqlerror` with codes
- **Offset pagination** for large lists — use cursors
- **Auth checked once, ignored after** — every protected resolver must verify

## See also

- `database-patterns.md` — repo layer that GraphQL resolvers should call
- `error-creation.md` — Go error wrapping patterns
