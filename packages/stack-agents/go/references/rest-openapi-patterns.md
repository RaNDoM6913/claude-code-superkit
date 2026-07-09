# REST / OpenAPI Patterns (swaggo + oapi-codegen)

> Reference document for go-reviewer. Loaded on demand via Read tool.
> Upstream: https://github.com/swaggo/swag · https://github.com/oapi-codegen/oapi-codegen

REST is the dominant Go API surface. There are two honest ways to keep the code
and the OpenAPI spec in sync, and they pull in opposite directions — pick by who
owns the contract.

## Two paths — pick by who owns the contract

**Code-first (swaggo/swag)** — annotations on handlers *generate* the spec. The
Go code is the source of truth; the spec is a build artifact. Fastest for a team
that owns both ends and iterates quickly. This is the **primary path** here.

- Lead with **swag v1** (stable, OpenAPI 2.0 / Swagger). It is what almost every
  gin/echo/fiber integration targets today.
- swag **v2 (currently RC)** adds OpenAPI 3.x — treat it as preview, switch when
  it goes GA. Don't put an RC on the critical path of a shipping service.

**Spec-first (oapi-codegen)** — hand-write the OpenAPI 3.x document, then
*generate* server interfaces, request/response types, and clients from it. The
spec is the source of truth; the code conforms to it. Prefer this when the
contract is the deliverable — versioned in review, published to other teams, or
consumed by clients you don't control — because the compiler then enforces that
handlers match the contract instead of the contract trailing the code.

```bash
# spec-first: generate a chi/echo/gin server + models from openapi.yaml
go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen \
    -generate types,chi-server -package api openapi.yaml > api/gen.go
```

You implement the generated `ServerInterface`; a missing or mis-typed handler is
a compile error, not a silent drift. The rest of this doc covers the code-first
swag path, since that is where the review footguns cluster.

## swag annotation cheatsheet

Annotations sit in a `//` comment block directly above the handler. Run
`swag init` to parse them into `docs/`.

| Annotation | Syntax | Gotcha |
|------------|--------|--------|
| `@Summary` | `@Summary Create a user` | One line; shows as the operation title. |
| `@Description` | `@Description Longer prose, may span lines` | Free text; no markup guarantees. |
| `@Tags` | `@Tags users` | Groups routes in the UI; keep names stable. |
| `@Param` | `@Param body body CreateUserReq true "payload"` | A **body** param must name a **struct** — a primitive (`string`, `int`) in body silently emits a broken/empty schema. |
| `@Param` (query/path) | `@Param id path string true "user id"` | `path`/`query`/`header`/`formData` take primitives fine. |
| `@Success` | `@Success 200 {object} UserResp` | `{object}` / `{array}` must reference a real Go type, not a shape. |
| `@Failure` | `@Failure 404 {object} ErrResp` | Document the error envelope too, or consumers guess it. |
| `@Router` | `@Router /users/{id} [get]` | Path + method in brackets; must match the actual route. |
| `@Security` | `@Security BearerAuth` | Names a scheme from `@securityDefinitions`; see below. |

Three traps that produce a spec which *looks* fine but lies:

1. **Named body struct.** `@Param body body string true "..."` compiles and runs;
   the generated schema is broken. Body params must reference a named struct.
2. **The blank-import trap.** `swag init` writes a `docs` package, but nothing
   imports it — so you must add `import _ "yourmodule/docs"` (usually in `main.go`)
   or the UI serves an *empty* spec with no error.
3. **Stale `docs/`.** Annotations are not checked against `docs/` at build time.
   Re-run `swag init` on **every** annotation change or the published contract
   drifts from the code. Enforce it in CI:

```bash
swag fmt                                   # normalize annotation formatting
swag init                                  # regenerate docs/
git diff --exit-code docs/                 # fail the build if docs/ is stale
```

## UI wiring — one line per router

Each framework has a thin adapter that mounts Swagger UI at a route. Import the
generated `docs` package (blank import) first, then:

- **gin** — `r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))` (`swaggo/gin-swagger`)
- **echo** — `e.GET("/swagger/*", echoSwagger.WrapHandler)` (`swaggo/echo-swagger`)
- **fiber** — `app.Get("/swagger/*", fiberSwagger.WrapHandler)` (`swaggo/fiber-swagger`)
- **chi** — `r.Get("/swagger/*", httpSwagger.WrapHandler)` (`swaggo/http-swagger`)
- **net/http** — `mux.Handle("/swagger/", httpSwagger.WrapHandler)` (`swaggo/http-swagger`)

Whichever you use: **gate the route** behind auth middleware in production, or
compile it out of prod builds. An open `/swagger` endpoint hands attackers a
complete map of your API surface.

## Security schemes

Declare schemes once, in the package-level general API comment (usually above
`main`), then reference them per route with `@Security`:

```go
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 "Bearer {token}"
//
// @securityDefinitions.oauth2.accessCode  OAuth2
// @tokenUrl                                https://auth.example.com/token
// @authorizationUrl                        https://auth.example.com/authorize
//
// @securityDefinitions.apikey  ApiKeyAuth   // @in header, @name X-API-Key
// @securityDefinitions.basic   BasicAuth
```

swag supports `apikey` (used for Bearer/JWT via the `Authorization` header),
`oauth2` (its `implicit`/`accessCode`/`password`/`application` flows), and
`basic`. Then, on **every** protected handler:

```go
// @Security BearerAuth
// @Router   /users/{id} [get]
```

A missing `@Security` understates auth in the public contract: the route renders
with no lock icon and consumers reasonably assume it is open. This is a contract
bug even when the middleware is correctly enforcing auth at runtime.

## Struct tags that shape the schema

The generated schema reads Go struct tags. Get these right or the spec misleads —
or leaks:

```go
type User struct {
    ID        string `json:"id"        example:"u_123"`
    Email     string `json:"email"     format:"email" example:"a@b.com"`
    CreatedAt string `json:"createdAt" format:"date-time"`
    Password  string `json:"-"         swaggerignore:"true"` // never in the spec
    internalR string `swaggerignore:"true"`                  // internal-only field
}
```

- `json:"..."` sets the property name (and `json:"-"` drops it from JSON).
- `example:"..."` / `format:"..."` populate the schema's example and `format`.
- **`swaggerignore:"true"`** keeps a field out of the generated spec entirely.
  Put it on every secret or internal field — a password, token, or internal flag
  that isn't ignored leaks straight into the public documentation. `json:"-"`
  hides it from the JSON wire, but swag may still emit it in the schema unless
  `swaggerignore` is also set.

## Review Checklist (go-reviewer)

- **CRITICAL** — Swagger UI exposed ungated in production (gate it behind auth
  middleware, or disable/compile-out the route in prod builds).
- **CRITICAL** — Secret or internal field not `swaggerignore:"true"` (leaks into
  the public spec).
- **WARNING** — Protected route missing `@Security` (contract understates auth;
  no lock icon, consumers assume open).
- **WARNING** — Stale `docs/` vs annotations (contract drift; add a CI freshness
  gate: `swag init` + `git diff --exit-code docs/`).
- **WARNING** — Primitive `@Param` body instead of a named struct (silently
  produces a broken spec).

## Further Reading

- swaggo/swag: https://github.com/swaggo/swag
- swag annotation reference: https://github.com/swaggo/swag#declarative-comments-format
- oapi-codegen: https://github.com/oapi-codegen/oapi-codegen
- OpenAPI Specification: https://spec.openapis.org/
