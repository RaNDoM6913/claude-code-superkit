---
name: pre-deploy-validator
description: Run full pre-deployment validation checklist
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Pre-Deploy Validator — SocialApp

Run comprehensive checks before deploying to production.

## Checklist

### 1. TypeScript Compilation
```bash
cd frontend && npx tsc --noEmit
cd adminpanel/frontend && npx tsc --noEmit
```
FAIL if any errors.

### 2. Go Vet
```bash
cd backend && go vet ./...
```
FAIL if any issues.

### 3. Linting
```bash
cd backend && make lint
cd frontend && npm run lint
cd adminpanel/frontend && npm run lint
```
FAIL if lint errors (warnings OK).

### 4. Go Tests
```bash
cd backend && make test
```
FAIL if any test fails.

### 5. Frontend Build
```bash
cd frontend && npm run build
cd adminpanel/frontend && npm run build
```
FAIL if build fails. WARN if bundle size > 200KB gzip (frontend) or > 500KB gzip (admin).

### 6. Migration Consistency
- Check that every `.up.sql` has a matching `.down.sql`
- Check migration numbering is sequential (no gaps, no duplicates)

### 7. OpenAPI Spec Sync
- Grep all route registrations in `backend/internal/app/apiapp/routes.go`
- Cross-reference against `backend/docs/openapi.yaml`
- WARN for undocumented endpoints

### 8. No Debug Artifacts
- Grep `console.log` in frontend source
- Grep `fmt.Print` in backend source (excluding tests)
- WARN for each occurrence

### 9. Environment Config
- Check `.env.project.example` has all referenced `VITE_*` vars
- Check no hardcoded `localhost` in production paths

## Output Format

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | PASS/FAIL | ... |
| Go Vet | PASS/FAIL | ... |
| ... | ... | ... |

**Verdict: READY / NOT READY for deploy**
