---
name: commit-helper
description: Conventional commit helper — analyze changes, detect secrets, create well-formatted commit
user-invocable: true
tokens: 1174
---

# Conventional Commit Helper

Create a well-formatted commit following conventional commit conventions.

Parse the user's request for commit scope and message. A request to create a commit authorizes that scoped local commit; a request only to draft a message does not. Read applicable `AGENTS.md` instructions, discover available command tools, and honor required project checks. This workflow does not authorize pushing, amending, bypassing hooks or changing Git configuration.

## Steps

### 1. Analyze Changes

```bash
git status
git diff --stat
git diff --cached --stat
git log --oneline -5
```

### 2. Stage Files (if needed)

Inspect the actual staged and unstaged diffs, not only their statistics. Identify the selected files/hunks and any pre-existing staged changes. Stage only authorized scope with explicit paths/hunks; never use `git add .` or `git add -A` by default. If unrelated changes are already staged, preserve the index and resolve commit scope before committing; do not silently include or unstage someone else's work. Re-read the final staged diff before commit. **Never** stage:
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
```

Co-authorship trailers are optional; do not add one unless the project explicitly requires it.

**Skip trailers for:** typo fixes, docs-only changes, config changes, single-file edits < 20 lines.

### 4. Check for Secrets

Scan staged files for potential secrets:
- API keys: long alphanumeric strings (32+ chars) in string literals
- Passwords: `password`, `secret`, `token`, `api_key` assignments with literal values
- Private keys: `-----BEGIN` patterns
- Connection strings with embedded credentials
- Bot tokens: `[0-9]+:[A-Za-z0-9_-]{35}` (Telegram format)
- AWS keys: `AKIA[A-Z0-9]{16}`

If found, report only file/line and secret type, never the value or matching source line. Exclude/remediate actual secrets within authority before committing; an ambiguous candidate needs resolution, not a blanket permission to commit credentials. A heuristic scan is not proof that the tree is secret-free.

### 5. Create Commit

Run required checks for the staged change, retaining their actual results. Verify the staged scope still matches the reviewed diff. Write the exact message to a temporary file outside the repository using a safe file-writing tool, then pass that path to `git commit --file <message-file>`. Treat message text as data, not shell syntax. Use normal hooks; if a hook fails, report its result and make only authorized corrections before a deliberate retry. Do not retry automatically with `--no-verify`.

### 6. Verify

```bash
git log --oneline -1
git status
```

Verify the commit command succeeded and inspect the new commit's actual diff/file list against the selected scope; a pre-existing `HEAD` is not proof of a new commit. Report the created hash, checks, and remaining staged/unstaged/untracked changes without exposing secrets.
