---
alwaysApply: true
---

# Git Workflow — SocialApp

- **Commits**: conventional format `type(scope): description`
  - Types: feat, fix, docs, refactor, chore, test, perf
  - Scope: backend, frontend, admin, bot, claude
- **No --no-verify**: Fix pre-commit hook issues, don't skip them
- **No force push to main**: Use PRs
- **No git reset --hard**: Use stash or soft reset
- **Branch naming**: `feature/description`, `fix/description`, `chore/description`
