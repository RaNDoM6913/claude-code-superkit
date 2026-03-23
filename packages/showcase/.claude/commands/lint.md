---
description: Run linting for backend (Go) and/or admin frontend (ESLint + TypeScript)
argument-hint: [backend|frontend|all]
allowed-tools: Bash
---

# Lint

Run linters. Specify which part to lint.

## Steps

Determine what to lint based on `$ARGUMENTS`:

### backend
```bash
cd /path/to/your-project/backend && make fmt && make lint
```

### frontend
```bash
cd /path/to/your-project/adminpanel/frontend && npm run lint && npx tsc -b --noEmit
```

### all (default if no argument)
Run both sequentially. Report results for each.

$ARGUMENTS
