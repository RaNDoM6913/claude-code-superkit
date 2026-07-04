---
alwaysApply: false
applyWhenPaths:
  - "**/*.go"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.rb"
  - "**/*.sql"
  - ".github/workflows/**"
  - "Dockerfile*"
  - "docker-compose*"
tokens: 152
---

# Security

- SQL: parameterized queries ($1 for pgx, ? for MySQL; Python: %s placeholders passed as driver params — `execute(sql, params)` — never f-strings, .format(), or % interpolation)
- XSS: no dangerouslySetInnerHTML without DOMPurify
- Secrets: no hardcoded tokens/passwords/keys — use env vars
- Auth: all API endpoints require auth middleware, except an enumerated public allowlist (health checks, auth entry points, signature-verified webhooks)
- Input: validate at system boundaries
- Files: validate MIME type and size server-side
- CORS: explicit origin allowlist, no wildcards in production
