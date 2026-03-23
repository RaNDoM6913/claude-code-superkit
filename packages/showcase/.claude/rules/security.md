---
alwaysApply: true
---

# Security — TGApp

- **SQL**: Always parameterized queries (`$1, $2`). NEVER `fmt.Sprintf` with user input in SQL.
- **XSS**: No `dangerouslySetInnerHTML`. If absolutely needed, sanitize with DOMPurify.
- **Secrets**: No hardcoded tokens, passwords, or API keys in source code. Use env vars.
- **Auth**: All `/v1/` endpoints require auth middleware. Document exceptions explicitly.
- **Input validation**: Validate at system boundaries (handlers). Trust internal code.
- **File uploads**: Validate MIME type and size server-side. Max 32 MiB.
- **CORS**: Explicit origin allowlist, no wildcards in production.
