---
name: api-conventions
description: SocialApp API design conventions — REST patterns, error format, naming, middleware, request/response contracts
user-invocable: false
---

# API Conventions

## Current State
- User-facing handlers: !`ls backend/internal/transport/http/handlers/*_handler.go 2>/dev/null | wc -l | tr -d ' '`
- Active routes: !`grep -c 'r\.\(Get\|Post\|Put\|Delete\|Patch\)(' backend/internal/app/apiapp/routes.go 2>/dev/null || echo 0`
- Recent handler changes: !`git log --oneline -3 -- backend/internal/transport/http/handlers/`

## REST Patterns

- Base URL: `http://localhost:8080`
- User API: `/v1/*`
- Admin API: `/admin/*`
- Bot API: `/admin/bot/*`
- Content-Type: `application/json`
- Auth: `Authorization: Bearer <jwt>`

## Error Response Format

```json
{
  "code": "not_found",
  "message": "User not found"
}
```

Standard error codes:
- `validation_error` — 400
- `unauthorized` — 401
- `forbidden` — 403
- `not_found` — 404
- `conflict` — 409
- `rate_limited` — 429 (with `retry_after_sec`, `cooldown_until`)
- `internal_error` — 500

## Handler Pattern

```go
func (h *MyHandler) GetItem(w http.ResponseWriter, r *http.Request) {
    // 1. Extract auth
    identity, ok := authsvc.IdentityFromContext(r.Context())
    if !ok {
        httperrors.Write(w, http.StatusUnauthorized, httperrors.APIError{
            Code: "unauthorized", Message: "no identity",
        })
        return
    }

    // 2. Extract params
    id := chi.URLParam(r, "id")

    // 3. Call service
    item, err := h.service.GetItem(r.Context(), id)
    if err != nil {
        switch {
        case errors.Is(err, svc.ErrNotFound):
            httperrors.Write(w, http.StatusNotFound, httperrors.APIError{
                Code: "not_found", Message: "item not found",
            })
        case errors.Is(err, svc.ErrValidation):
            httperrors.Write(w, http.StatusBadRequest, httperrors.APIError{
                Code: "validation_error", Message: err.Error(),
            })
        default:
            h.log.Error("GetItem", zap.Error(err))
            httperrors.Write(w, http.StatusInternalServerError, httperrors.APIError{
                Code: "internal_error", Message: "internal error",
            })
        }
        return
    }

    // 4. Respond
    httperrors.Write(w, http.StatusOK, item)
}
```

## Naming Conventions

### Go Backend
- Handlers: `Admin{Domain}Handler` (e.g., `AdminAccessHandler`)
- Services: `{domain}svc` package (e.g., `adminaclsvc`)
- Repos: `{Domain}Repo` struct (e.g., `AdminSettingsRepo`)
- Routes: kebab-case URLs (`/admin/metrics/match-rate`)
- Errors: `Err{Name}` variables (`ErrNotFound`, `ErrValidation`)

### TypeScript Frontend
- Types: `Admin{Feature}{Action}Request/Response`
- API files: `{domain}ApiLive.ts`, `{domain}ApiMock.ts`, `{domain}ApiClient.ts`
- Hooks: `use{Feature}` (e.g., `useAdminInbox`)
- Pages: `{Name}Page.tsx` (e.g., `OverviewPage.tsx`)

## Middleware Chain (Admin Routes)

```
Request
  → CORS
  → Logger (zap)
  → Recovery
  → AdminWebAuthMiddleware (JWT + session validation)
  → RequireAdminRoleOrPermission (RBAC check)
  → Handler
```

## Query Patterns

### Period Filters (Metrics)
```
GET /admin/metrics/engagement/match-rate?from=2024-01-01&to=2024-01-31&tz=Europe/Minsk
GET /admin/metrics/engagement/match-rate?preset=7d&tz=Europe/Minsk
```

Presets: `1d`, `7d`, `1m`, `3m`, `12m`, `custom`

### Pagination
```
GET /admin/access/users?page=1&per_page=20&search=john
```

### CSV Export
Many endpoints support `Accept: text/csv` header or `?format=csv` query param.

## Response Contracts

### Success with data
```json
{ "data": [...], "total": 42, "page": 1, "per_page": 20 }
```

### Success with single item
```json
{ "id": "uuid", "name": "...", "created_at": "2024-01-01T00:00:00Z" }
```

### No data available
```json
{ "no_data": true, "reason": "insufficient_data" }
```
