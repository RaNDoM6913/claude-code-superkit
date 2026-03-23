---
alwaysApply: true
---

# Security

- SQL: parameterized queries ($1 for pgx, ? for MySQL, %s for Python)
- XSS: no dangerouslySetInnerHTML without DOMPurify
- Secrets: no hardcoded tokens/passwords/keys — use env vars
- Auth: all API endpoints require auth middleware
- Input: validate at system boundaries
- Files: validate MIME type and size server-side
- CORS: explicit origin allowlist, no wildcards in production
