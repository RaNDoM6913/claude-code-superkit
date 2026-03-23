# API Reference

> Maintain this file when handlers or routes change. This is the source of truth for all endpoints.

## Authentication

<!-- Auth mechanism: JWT, API key, OAuth, session cookies?
     Where is the token sent? (Authorization header, cookie, query param?) -->

TODO: Describe auth mechanism.

## Base URL

TODO: e.g., `http://localhost:8080/api/v1`

## Endpoints

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| TODO | TODO | TODO |

### Protected (auth required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| TODO | TODO | TODO | TODO |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| TODO | TODO | TODO | TODO |

## Error Response Format

<!-- Standard error shape returned by all endpoints -->

```json
TODO: { "error": { "code": "...", "message": "..." } }
```

## Pagination

<!-- How are list endpoints paginated? Cursor-based? Offset? -->

TODO: Describe pagination pattern.
