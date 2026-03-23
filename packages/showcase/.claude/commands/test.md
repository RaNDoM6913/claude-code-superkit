---
description: Run tests for backend (Go) or admin frontend (Playwright e2e)
argument-hint: [backend|frontend|all]
allowed-tools: Bash
---

# Run Tests

Run project tests. Specify which part to test.

## Steps

Determine what to test based on `$ARGUMENTS`:

### backend (default if no argument)
```bash
cd /path/to/your-project/backend && make test
```

### frontend
```bash
cd /path/to/your-project/adminpanel/frontend && npm run test:e2e
```

### all
Run both sequentially. Report results for each.

## Notes

- Backend: `go test ./...` — unit tests
- Frontend: Playwright e2e tests (requires running frontend or `npx playwright install` first)
- For headed browser mode: `npm run test:e2e:headed`
- For test report: `npm run test:e2e:report`

$ARGUMENTS
