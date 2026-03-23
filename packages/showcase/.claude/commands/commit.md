---
description: Create a well-formatted conventional commit from staged/unstaged changes
argument-hint: "[optional commit message override]"
allowed-tools: Bash, Read, Grep, Glob
---

# Conventional Commit Helper

Create a well-formatted commit following SocialApp conventions.

## Steps

### 1. Analyze Changes

```bash
git status
git diff --stat
git diff --cached --stat
git log --oneline -5
```

### 2. Stage Files (if needed)

If there are unstaged changes, stage relevant files. Never stage:
- `.env` files (secrets)
- `credentials.json`, `*.key`, `*.pem`
- Large binary files

### 3. Draft Commit Message

Analyze the diff to determine:
- **Type**: feat, fix, docs, refactor, chore, test, perf
- **Scope**: backend, frontend, admin, bot, claude
- **Description**: concise "why" (not "what")

Format: `type(scope): description`

If `$ARGUMENTS` is provided, use it as the commit message instead of auto-generating.

### 4. Check for Secrets

Scan staged files for potential secrets:
- API keys: long alphanumeric strings in quotes
- Passwords: `password`, `secret`, `token` assignments
- Private keys: `-----BEGIN`

If found, WARN and ask for confirmation before committing.

### 5. Create Commit

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### 6. Verify

```bash
git log --oneline -1
git status
```

$ARGUMENTS
