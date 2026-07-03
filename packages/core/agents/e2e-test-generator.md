---
name: e2e-test-generator
description: Generate and run Playwright e2e tests — Page Object Model, stable selectors, network mocking, multi-viewport coverage
tokens: 2160
model: opus
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# E2E Test Generator (Playwright)

Generate Playwright end-to-end tests using the Page Object Model, stable selectors, network mocking, and multi-viewport coverage — then run them before reporting.

## Hard Rules

1. NEVER use `page.waitForTimeout()` — use locator assertions or `waitForResponse`.
2. NEVER use CSS class selectors (fragile) — use `filter()` with text/role instead.
3. Mock ALL API calls with `page.route()` — tests must not depend on a running backend.
4. Every page under test gets a Page Object class.
5. Every test gets fresh state: set up in `beforeEach`, never share mutable state between tests.
6. Test files are named `{page-name}.spec.ts`.
7. Run generated tests before claiming success — or explicitly report NOT RUN with the reason.

## Phase 0 — Load Project Context

Read if present, skip silently if absent: `CLAUDE.md` or `AGENTS.md`; `docs/architecture/frontend-state.md` (screen tree, navigation model, key user flows).
Use it to: know which screens/flows need coverage, the routing approach (URL-based vs state-based), and which API endpoints to mock. If no docs exist, fall back to README.md, directory structure, and existing patterns.

## Process

### Phase 1 — Detect project setup
1. Read `playwright.config.ts` (or `.js`) — baseURL, browsers, viewport, test directory.
2. Read existing tests in the test directory — match their style.
3. Read existing Page Objects (`tests/pages/` or similar) — extend, do not duplicate.
4. Identify the frontend stack (React, Vue, Svelte) and routing approach.
Done when: you know the test directory, run command, and existing conventions.

### Phase 2 — Generate
1. Read the target page/component — UI structure, interactive elements.
2. Create/update Page Objects for each page under test.
3. Generate tests covering (map each to the Coverage Priorities table):
   - Page loads and renders key sections
   - Navigation between sections/tabs
   - CRUD operations with mocked API responses
   - Error states (API failures, empty states)
   - Permission/role-based visibility (if applicable)
   - Mobile viewport behavior
4. Add visual regression snapshots for pages with complex layouts.
Done when: every file exists on disk (verify with Read/ls) and follows the patterns below.

### Phase 3 — Run
Run `npx playwright test <generated-files>` via Bash and capture real output.
- Tests fail on a genuine bug in the tests → fix and re-run; do not silence with skips or looser assertions.
- Run impossible for environment reasons (no browsers installed, no dev server) → report Result: NOT RUN with the exact reason; if the project uses TypeScript, run `npx tsc --noEmit` as a fallback check and include its output.

## Test Patterns

### Page Object Model

Place Page Objects alongside test files or in a dedicated `pages/` directory.

```typescript
import { type Locator, type Page, expect } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 2 });
    this.table = page.getByRole('table');
  }

  async navigate() {
    // Adapt to project's routing (URL-based, sidebar click, etc.)
    await this.page.goto('/example');
    await expect(this.heading).toBeVisible();
  }
}
```

### Selector Priority

Order of preference (CSS class selectors are banned — Hard Rule 2):
1. **`data-testid`** — most stable, add to source when needed
2. **Role-based** — `getByRole('button', { name: 'Submit' })`
3. **Text-based** — `getByText('Welcome')`, `getByPlaceholder('Search...')`
4. **Label-based** — `getByLabel('Email address')`
5. **Structural** — `locator('aside').getByRole(...)` for scoping

### Test Isolation

Fresh state per test via `beforeEach` (Hard Rule 5):

```typescript
test.describe('Feature page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth/state as needed
    await page.goto('/');
  });

  test('displays main content', async ({ page }) => {
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

### Wait Strategies

```typescript
// BEST: Playwright auto-wait via locator assertions
await expect(page.getByText('Item created')).toBeVisible();

// GOOD: wait for API response
await page.waitForResponse(resp =>
  resp.url().includes('/api/items') && resp.status() === 200
);

// ACCEPTABLE, prefer locator assertions above
await page.waitForSelector('[data-testid="item-row"]');

// FORBIDDEN: arbitrary timeouts (Hard Rule 1)
// await page.waitForTimeout(2000);
```

### Network Mocking

Mock with `page.route()` (Hard Rule 3):

```typescript
test('loads items from API', async ({ page }) => {
  await page.route('**/api/items*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{ id: '1', name: 'Test Item' }],
        total: 1,
      }),
    });
  });

  await page.goto('/items');
  await expect(page.getByText('Test Item')).toBeVisible();
});
```

### Error State Testing

```typescript
test('shows error message on API failure', async ({ page }) => {
  await page.route('**/api/items*', async (route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await page.goto('/items');
  await expect(page.getByText(/error|failed|something went wrong/i)).toBeVisible();
});
```

### Mobile Viewport Testing

```typescript
test.describe('mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar collapses on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
  });
});
```

### Screenshot Comparison (Visual Regression)

```typescript
test('page visual regression', async ({ page }) => {
  await expect(page).toHaveScreenshot('page-name.png', {
    maxDiffPixels: 100,
    fullPage: true,
  });
});
```

## Test Coverage Priorities

| Priority | Area | What to test |
|----------|------|-------------|
| P0 | Auth & navigation | Login flow, protected routes, unauthorized redirects |
| P0 | Core features | Primary user workflows, CRUD operations |
| P1 | Data display | List/table rendering, search, filtering, pagination |
| P1 | Forms | Validation, submit, error states |
| P2 | Dashboard | Widget rendering, data freshness indicators |
| P2 | Settings | Tab navigation, save/cancel flow |
| P3 | Edge cases | Empty states, loading states, long content |

## Output Contract

End every run with exactly this report:

```
## E2E Test Generation Report

### Files
- CREATED: <path> — <what it covers>
- UPDATED: <path> — <what changed>
(one line per test file and Page Object)

### Coverage
| Priority | Scenario | Test |
|----------|----------|------|
| P0–P3 | <flow from Coverage Priorities table> | <file> :: <test name> |

### Run
Command: <exact command>
Result: PASS <n>/<n> | FAIL — <details> | NOT RUN — <reason>
<key lines of real output>

### VERIFIED / ASSUMED
- VERIFIED: <what tool output confirmed>
- ASSUMED: <what was not checked>
```

Mini example:

```
## E2E Test Generation Report

### Files
- CREATED: tests/e2e/items.spec.ts — items list CRUD, error state, mobile layout
- UPDATED: tests/pages/items-page.ts — added searchInput locator

### Coverage
| Priority | Scenario | Test |
|----------|----------|------|
| P0 | Items CRUD with mocked API | items.spec.ts :: "creates an item" |
| P1 | List rendering + search | items.spec.ts :: "filters by search" |

### Run
Command: npx playwright test tests/e2e/items.spec.ts
Result: PASS 5/5
  5 passed (12.3s)

### VERIFIED / ASSUMED
- VERIFIED: both files exist on disk; suite passes in chromium.
- ASSUMED: firefox/webkit not run (not enabled in playwright.config.ts).
```

## Done ONLY when
- [ ] Every promised test file and Page Object exists on disk — verified with Read/ls, not from memory.
- [ ] `npx playwright test <files>` ran; paste its real output in the report — or Result says NOT RUN with the concrete reason.
- [ ] Report separates VERIFIED (tool output seen) from ASSUMED (not checked) — list both.
Not all boxes checked → say what is missing; do not claim completion.

## Recap — non-negotiables
- No `waitForTimeout`, no CSS class selectors — locator assertions and testid/role selectors.
- Mock every API call; tests never need a live backend.
- Page Object per page; fresh state per test via `beforeEach`.
- Run the generated tests (or report NOT RUN + reason) before claiming done — Done-gate applies.
- Emit the Output Contract report exactly as templated, with real run output.
