---
description: Conventional commit helper — analyze changes, detect secrets, create well-formatted commit
argument-hint: "[optional commit message override]"
allowed-tools: Bash, Read, Grep, Glob
---

# Conventional Commit Helper

## Role

Stage changes safely, draft a conventional-commit message (with optional trailers), scan the staged diff for secrets, then create one verified commit. This command commits only — it never pushes.

## Hard Rules

- Stage files explicitly by path. Never run `git add -A`, `git add .`, or `git add -u`.
- Never stage anything on the never-stage denylist (Step 2).
- Create the commit (Step 6) ONLY when the Step 5 secret scan found nothing, OR the user has explicitly confirmed every flagged pattern. An unconfirmed secret finding blocks the commit.
- This command creates exactly one commit. Never `git push`.
- Message format is `type(scope): description` — imperative mood, lowercase, describing the "why".
- Always end the commit body with the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.

## Steps

### 1. Analyze Changes

```bash
git status
git diff --stat
git diff --cached --stat
git log --oneline -5
```

Done when: you know which files changed, which are already staged, and the repo's recent commit-message style.

### 2. Stage Files

Stage only the files that belong to this change, one path at a time: `git add <path> <path> ...`. When the working tree mixes task files with unrelated edits, stage only the task files by explicit path and leave the rest unstaged.

**Never** stage:
- `.env` files (secrets)
- `credentials.json`, `*.key`, `*.pem`, `*.p12`
- `*.sqlite`, `*.db` (database files)
- Large binary files (images, videos, archives)
- `node_modules/`, `vendor/`, `__pycache__/`, `target/`

Done when: every file intended for this commit is staged by explicit path, and re-checking `git diff --cached --stat` shows no denylist path staged.

### 3. Draft Commit Message

Analyze the diff to determine:
- **Type**: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `style`, `build`, `ci`
- **Scope**: component or directory name (e.g., `backend`, `frontend`, `auth`, `api`)
- **Description**: concise "why" (not "what"), imperative mood, lowercase

Format: `type(scope): description`

Examples:
- `feat(auth): add JWT refresh token rotation`
- `fix(cache): prevent stale reads after invalidation`
- `refactor(api): extract validation into middleware`
- `docs(readme): update setup instructions for Docker`
- `test(users): add edge cases for concurrent access`

If `$ARGUMENTS` is provided and non-empty, use it as the commit message instead of auto-generating.

Done when: you have a single subject line in `type(scope): description` form.

### 4. Add Git Trailers (for non-trivial changes)

For changes touching 3+ files or core logic, append structured trailers to the commit body. These provide traceability metadata.

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

Done when: trailers are added, or the change matches a skip condition.

### 5. Check for Secrets

Scan the staged diff (`git diff --cached`) for potential secrets:
- API keys: long alphanumeric strings (32+ chars) in string literals
- Passwords: `password`, `secret`, `token`, `api_key` assignments with literal values
- Private keys: `-----BEGIN` patterns
- Connection strings with embedded credentials
- Bot tokens: `[0-9]+:[A-Za-z0-9_-]{35}` (Telegram format)
- AWS keys: `AKIA[A-Z0-9]{16}`

If any pattern matches, **WARN**, list every suspicious file and match, and ask for confirmation. Do not advance to Step 6 until the user has explicitly confirmed each flagged pattern is safe.

Done when: the scan found nothing, or the user has explicitly confirmed every flagged pattern.

### 6. Create Commit

Precondition: Step 5 found no secrets, or the user confirmed each flagged pattern. Do not run this step otherwise.

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Done when: `git commit` exits 0 and prints a commit hash.

### 7. Verify

```bash
git log --oneline -1
git status
```

Done when: the new commit appears at the top of the log and you have counted any remaining unstaged files.

## Output

Report exactly:

```
Committed: <hash> <subject>
Unstaged after commit: <count> file(s) — [list paths, or "none"]
```

## Recap — non-negotiables

- Stage by explicit path only; never `git add -A` / `.` / `-u`, and never stage a denylist path.
- No commit while an unconfirmed secret finding stands — Step 5 gates Step 6.
- Message is `type(scope): description`, imperative and lowercase, ending with the `Co-Authored-By` trailer.
- Commit only — never `git push`.
