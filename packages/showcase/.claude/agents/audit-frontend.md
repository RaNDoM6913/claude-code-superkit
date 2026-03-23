---
name: audit-frontend
description: Audit user and admin frontends for hardcoded values, mock data, code quality, and pattern violations
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Frontend Audit — TGApp

Audit `frontend/src/` (user app) and `adminpanel/frontend/src/` (admin panel) for code quality issues.

## Checks

### 1. Hardcoded Russian Names as Defaults
Grep `useState.*"Анастасия"|"Анна"|"Мария"|"Елена"` in both frontends.
FAIL if used as initial state (not as UI labels/options).

### 2. Hardcoded Personal Data
Grep for useState initializers with hardcoded height, birthday, language, gender.
FAIL if found — should come from API/props.

### 3. Placeholder Image URLs
Grep `unsplash\.com|picsum\.photos|pravatar\.cc|placeholder\.com|placehold\.co`.
FAIL if used as default without API fallback.

### 4. Mock Data in Production Code
Grep `MOCK_|mockNotifications|mock://|const mock` in page/component files (NOT in `*Mock*.ts`).
FAIL for mock arrays in page components.

### 5. Hardcoded Fake IDs
Grep `ob_001|rp_001|sp_001|alert-1|notif-1|user_123` (excluding test files).
WARN if found — leftover test stubs.

### 6. console.log/debug/info
Grep `console\.(log|debug|info)` in both frontends. Exclude `console.error`.
WARN with file count.

### 7. TypeScript Compilation
Run `npx tsc --noEmit` in `frontend/` and `adminpanel/frontend/`.
FAIL for any errors.

### 8. Imports from Deleted Files
Grep `mock-moderation|mockData|adminUsersApiMock|adminModerationApiMock|overviewMocks`.
FAIL if importing deleted files.

### 9. framer-motion vs motion/react
Grep `from ['"]framer-motion['"]` in `frontend/src/`. Project uses `motion/react` v12.
FAIL if framer-motion import found.

### 10. Zustand useShallow Violations
Grep destructured multi-field usage of `useNavigationStore` without `useShallow`:
- Pattern: `const { field1, field2 } = useNavigationStore()` — WARN (should use useShallow)
- OK: `const field = useNavigationStore(s => s.field)` — single selector is fine

### 11. Inline Query Keys
Grep `useQuery.*queryKey:\s*\[['"]` in `frontend/src/` — inline string array keys.
WARN if not using `queryKeys.*` factory from `src/api/query-keys.ts`.

### 12. Hardcoded localhost URLs
Grep `localhost` in frontend/admin source (not in config/env files).
WARN for hardcoded localhost without runtime config override.

### 13. Empty Catch Blocks
Grep `catch\s*\{` patterns with empty bodies in TypeScript.
WARN with count.

### 14. Dev-only Components in Bundle
Check if `PhotoQaLab`, `photo_lab` query param handler ships in main bundle.
WARN if dev QA tools imported without lazy/feature-flag guard.

### 15. TODO/FIXME/HACK Comments
Grep `TODO|FIXME|HACK|XXX` in `.ts`, `.tsx` files.
WARN with count and locations.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
