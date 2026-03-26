---
name: commit-helper
description: Conventional commit helper — analyze changes, detect secrets, create well-formatted commit
user-invocable: true
---

# Conventional Commit Helper

Create a well-formatted commit following conventional commit conventions.

## Steps

### 1. Analyze Changes

```bash
git status
git diff --stat
git diff --cached --stat
git log --oneline -5
```

### 2. Stage Files (if needed)

If there are unstaged changes, stage relevant files. **Never** stage:
- `.env` files (secrets)
- `credentials.json`, `*.key`, `*.pem`, `*.p12`
- `*.sqlite`, `*.db` (database files)
- Large binary files (images, videos, archives)
- `node_modules/`, `vendor/`, `__pycache__/`, `target/`

### 3. Draft Commit Message

Analyze the diff to determine:
- **Type**: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `style`, `build`, `ci`
- **Scope**: component or directory name (e.g., `backend`, `frontend`, `auth`, `api`)
- **Description**: concise "why" (not "what"), imperative mood, lowercase

Format: `type(scope): description`

Examples:
- `feat(auth): add JWT refresh token rotation`
- `fix(feed): prevent duplicate swipes on same candidate`
- `refactor(api): extract validation into middleware`
- `docs(readme): update setup instructions for Docker`
- `test(users): add edge cases for concurrent access`

If the user provides a specific commit message, use it instead of auto-generating.

### 3.5 Add Git Trailers (for non-trivial changes)

For changes touching 3+ files or core logic, append structured trailers to the commit message. These provide traceability metadata.

| Trailer | Values | When to use |
|---------|--------|-------------|
| `Confidence` | `HIGH` / `MEDIUM` / `LOW` | Always. How confident are you this change is correct? |
| `Scope-risk` | `LOW` / `MEDIUM` / `HIGH` | When touching shared code. How likely to affect other components? |
| `Not-tested` | free text | When something is NOT covered by tests. List what's untested. |

Example commit with trailers:
```
feat(auth): add JWT refresh token rotation

Implement automatic token refresh when access token expires.
Refresh tokens are single-use with 7-day TTL.

Confidence: HIGH
Scope-risk: MEDIUM — touches auth middleware used by all endpoints
Not-tested: concurrent refresh requests from multiple devices

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Skip trailers for:** typo fixes, docs-only changes, config changes, single-file edits < 20 lines.

### 4. Check for Secrets

Scan staged files for potential secrets:
- API keys: long alphanumeric strings (32+ chars) in string literals
- Passwords: `password`, `secret`, `token`, `api_key` assignments with literal values
- Private keys: `-----BEGIN` patterns
- Connection strings with embedded credentials
- Bot tokens: `[0-9]+:[A-Za-z0-9_-]{35}` (Telegram format)
- AWS keys: `AKIA[A-Z0-9]{16}`

If found, **WARN** and list the suspicious patterns. Ask for confirmation before committing.

### 5. Create Commit

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 6. Verify

```bash
git log --oneline -1
git status
```

Report the created commit hash and remaining unstaged changes (if any).

Parse the user's request to determine scope and parameters.
