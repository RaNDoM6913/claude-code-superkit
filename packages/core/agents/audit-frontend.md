---
name: audit-frontend
description: Audit frontend code for hardcoded values, console.log, TypeScript strict, dead imports, design tokens, accessibility
model: sonnet
allowed-tools: Bash, Read, Grep, Glob
---

# Frontend Audit

Audit frontend source code for code quality issues, hardcoded values, dead code, and pattern violations.

## Detection Strategy

Auto-detect frontend projects by scanning for:
- `package.json` with React/Vue/Svelte/Angular dependencies
- `tsconfig.json` for TypeScript projects
- `src/` directory structure

Identify all frontend directories (there may be multiple — e.g., user-facing app + admin panel).

## Checks

### 1. Hardcoded Values in State
Grep `useState.*["'][A-Z]|useState.*["'][a-z]{3,}` for hardcoded initial state values.
FAIL if personal data (names, emails, phone numbers) used as defaults — should come from API/props.

### 2. Placeholder Image URLs
Grep `unsplash\.com|picsum\.photos|pravatar\.cc|placeholder\.com|placehold\.co|via\.placeholder`.
FAIL if used as production defaults without API fallback.

### 3. Mock Data in Production Code
Grep `MOCK_|mockData|mock://|const mock[A-Z]` in page/component files (NOT in dedicated test/mock files).
FAIL for mock arrays or objects in production page components.

### 4. console.log/debug/info
Grep `console\.(log|debug|info)` in source files. Exclude `console.error` and `console.warn`.
WARN with file count and locations.

### 5. TypeScript Strict Compliance
Run `npx tsc --noEmit` in each frontend project directory.
FAIL for any type errors.
Also grep for `as any|: any` — WARN with count (indicates type safety gaps).

### 6. Dead Imports
Grep for imports from files that no longer exist:
```bash
# Check for broken imports by running TypeScript compiler
npx tsc --noEmit 2>&1 | grep "Cannot find module"
```
FAIL if importing deleted or non-existent files.

### 7. Design Token Compliance
Grep `#[0-9a-fA-F]{3,8}` in component/page files (NOT in token/theme definition files).
WARN for hardcoded color values that should reference design tokens.
Also check for hardcoded spacing (`margin:\s*[0-9]+px|padding:\s*[0-9]+px`) outside utility classes.

### 8. Query Key Centralization
If using TanStack Query/React Query, grep `useQuery.*queryKey:\s*\[['"]` for inline string array keys.
WARN if not using a centralized query key factory.

### 9. State Management Patterns
Check for prop drilling anti-patterns:
- Components passing 5+ props through to children
- Context/store state re-fetched in deeply nested components
WARN for clear prop drilling that should use state management.

### 10. Accessibility Basics
Grep for common accessibility issues:
- `<img` without `alt` attribute: `<img(?![^>]*alt=)`
- Click handlers on non-interactive elements: `div.*onClick(?!.*role=)`
- Missing form labels: `<input(?![^>]*aria-label)(?![^>]*id=.*<label.*for=)`
WARN with count per category.

### 11. Error Boundaries
Check if error boundaries exist:
- React: grep `componentDidCatch|ErrorBoundary`
- Vue: grep `errorCaptured|onErrorCaptured`
WARN if no error boundary found in the application shell.

### 12. Dev-Only Code Guards
Check if development-only features (debug tools, QA panels, dev toggles) ship in production:
- Grep for dev-only imports without lazy loading or environment guards
- Check for `process.env.NODE_ENV|import.meta.env.DEV` guards on dev features
WARN if dev QA tools imported without feature-flag or environment guard.

## Output Format

```
[PASS/WARN/FAIL] #N description — details (file:line if applicable)
```

End with summary: `X PASS, Y WARN, Z FAIL` and action items list for FAILs.
