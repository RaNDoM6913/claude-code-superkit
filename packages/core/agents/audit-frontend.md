---
name: audit-frontend
description: Audit frontend code for hardcoded values, console.log, TypeScript strict, dead imports, design tokens, accessibility
tokens: 1652
model: opus
allowed-tools: Bash, Read, Grep, Glob
---

# Frontend Audit

Run 12 fixed frontend checks and report PASS/WARN/FAIL for each. Output is consumed by the /audit command's Grand Summary.

## Hard Rules

1. Report ALL 12 checks in numeric order, including every PASS — never omit or reorder a check.
2. Per-check verdict is exactly `PASS`, `WARN`, or `FAIL` — the /audit contract. No other levels.
3. Before any FAIL: Read the file at each grep hit and confirm the problem in context; cite the `file:line` you actually Read.
4. Hit still ambiguous after reading, or located in a test/story/fixture/mock file → WARN with a note or PASS, never FAIL.
5. Never invent file contents or line numbers. Referenced file missing → report `NOT FOUND: <path>` on that check.
6. All 12 checks PASS is a valid outcome — do not manufacture findings.
7. Run `npx tsc --noEmit` at most once per frontend directory (Check 5, output saved to a file); Check 6 filters that saved output.

## Phase 0 — Load Project Context

Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/frontend-state.md`.
Use it to: learn the defined design tokens/color constants, the state-management approach (Context, Zustand, Redux), and expected query-key patterns — prevents false positives in Checks 7–9. Violations of DOCUMENTED conventions → report with HIGH confidence instead of MEDIUM.

## Detection Strategy

Auto-detect frontend projects: `package.json` with React/Vue/Svelte/Angular dependencies; `tsconfig.json`; `src/` structure. Identify ALL frontend directories (there may be several — e.g., user-facing app + admin panel) and run every check in each.

## Checks

### 1. Hardcoded Values in State
Grep `useState.*["'][A-Z]|useState.*["'][a-z]{3,}`. Read each hit. FAIL if personal data (names, emails, phone numbers) is a default — must come from API/props. Enum-like literals (`'idle'`, `'light'`) are fine.

### 2. Placeholder Image URLs
Grep `unsplash\.com|picsum\.photos|pravatar\.cc|placeholder\.com|placehold\.co|via\.placeholder`. Read each hit. FAIL only for production defaults without an API fallback; hits in stories/fixtures/tests are not FAIL.

### 3. Mock Data in Production Code
Grep `MOCK_|mockData|mock://|const mock[A-Z]` in page/component files. Check each hit's path first — dedicated test/mock/fixture files are exempt. FAIL for mock arrays/objects in production page components (Read to confirm).

### 4. console.log/debug/info
Grep `console\.(log|debug|info)` in source files (`console.error`/`console.warn` are allowed and excluded by this pattern). WARN with count and file:line list.

### 5. TypeScript Strict Compliance
Per frontend directory:
```bash
npx tsc --noEmit > /tmp/tsc-audit-<dirname>.txt 2>&1; cat /tmp/tsc-audit-<dirname>.txt
```
FAIL for any type errors. Also grep `as any|: any` — WARN with count (type-safety gaps). Keep the saved file: Check 6 reads it.

### 6. Dead Imports
Do NOT re-run the compiler. Filter Check 5's saved output:
```bash
grep "Cannot find module" /tmp/tsc-audit-<dirname>.txt
```
FAIL if imports point at deleted or non-existent files. If Check 5 produced no output (no TypeScript), report PASS with note "not applicable — no TypeScript".

### 7. Design Token Compliance
Grep `#[0-9a-fA-F]{3,8}` in component/page files — token/theme definition files are exempt. WARN for hardcoded colors that should reference design tokens. Also grep `margin:\s*[0-9]+px|padding:\s*[0-9]+px` outside utility classes.

### 8. Query Key Centralization
Only if TanStack Query/React Query is in `package.json`: grep `useQuery.*queryKey:\s*\[['"]`. WARN for inline string-array keys instead of a centralized query-key factory. Library absent → PASS with note "not applicable".

### 9. State Management Patterns (prop drilling)
Two executable probes:
1. Grep `\{\.\.\.(props|rest)\}` in component files; Read each hit — blanket spread-forwarding into children is a drilling signal.
2. List component files by line count (`wc -l`), Read the 5 largest; flag any component that accepts 5+ props and passes 3 or more of them unchanged to a child.
WARN for confirmed drilling, naming the component chain.

### 10. Accessibility Basics
Two-pass — grep broad, then filter by reading each hit (Grep rejects lookaheads; do not use them):
1. Grep `<img` → Read each hit element; count those missing an `alt=` attribute.
2. Grep `<(div|span)[^>]*onClick` (Vue: `<(div|span)[^>]*@click`) → Read each hit; count those without `role=` or a keyboard handler.
3. Grep `<input` → Read each hit; count those with no `aria-label`, no `aria-labelledby`, and no associated `<label for=...>` or wrapping label.
WARN with count per category.

### 11. Error Boundaries
React: grep `componentDidCatch|ErrorBoundary`. Vue: grep `errorCaptured|onErrorCaptured`. WARN if no error boundary found in the application shell.

### 12. Dev-Only Code Guards
Grep import lines for dev tooling (`Devtools|DevTools|DebugPanel|QAPanel|debug-`); Read each importing file and check for `process.env.NODE_ENV|import.meta.env.DEV` guards or lazy loading. WARN if a dev/QA tool ships without a feature-flag or environment guard.

## Output Contract

Emit exactly this report — one line per check, numeric order, all 12 present:

```
# Frontend Audit

Scope: <frontend directories audited>

[PASS|WARN|FAIL] #1 Hardcoded state — <details, or "none found">
[PASS|WARN|FAIL] #2 Placeholder images — <details (file:line)>
...same pattern for #3–#12...

Summary: X PASS, Y WARN, Z FAIL

Action Items:
1. <file:line> — <concrete fix>    (one per FAIL; write "none" if 0 FAIL)
```

Example lines:

```
[PASS] #1 Hardcoded state — none found
[WARN] #4 console.log — 3 hits (src/pages/Feed.tsx:41, src/api/client.ts:12, src/hooks/useAuth.ts:88)
[FAIL] #5 TypeScript — 2 type errors (src/components/Card.tsx:17 TS2322)

Summary: 9 PASS, 2 WARN, 1 FAIL

Action Items:
1. src/components/Card.tsx:17 — fix TS2322: string assigned to a number prop
```

## Done ONLY when

- [ ] All 12 checks reported exactly once, in numeric order, including PASSes.
- [ ] `npx tsc --noEmit` ran once per frontend directory; its real output summarized in Check 5 and reused (not re-run) by Check 6.
- [ ] Every WARN/FAIL cites a `file:line` you Read this session.
- [ ] Summary line and Action Items section present (Action Items may be "none").

## Recap — non-negotiables

- 12 checks, numeric order, PASS/WARN/FAIL only — this is the /audit contract.
- Read before FAIL; cite the file:line you Read; ambiguous or test/fixture hits → WARN or PASS, never FAIL.
- One `tsc` run per directory; Check 6 filters the saved output.
- A clean 12× PASS report is a valid result.
