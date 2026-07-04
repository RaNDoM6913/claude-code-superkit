---
alwaysApply: true
tokens: 131
---

# Git Workflow

- **Commits**: conventional format `type(scope): description`
  - Types: feat, fix, docs, refactor, chore, test, perf. Anything else → chore
  - Scope: the top-level module/package the change touches — derive it from this repo's structure (e.g. backend, frontend, cli)
- **No --no-verify**: Fix pre-commit hook issues, don't skip them
- **No force push to main**: Use PRs
- **No git reset --hard**: Use stash or soft reset
- **Branch naming**: `feature/description`, `fix/description`, `chore/description`
