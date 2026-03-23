---
name: e2e-test-generator
description: Generate Playwright e2e tests — Page Object Model, data-testid selectors, network mocking, viewport testing
model: opus
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# E2E Test Generator (Playwright)

Generate Playwright end-to-end tests following best practices: Page Object Model, stable selectors, network mocking, and multi-viewport testing.

## Detection Strategy

Before generating tests:
1. **Read `playwright.config.ts`** (or `.js`) for project setup (baseURL, browsers, viewport)
2. **Read existing tests** in the test directory for style consistency
3. **Read existing Page Objects** if any (in `tests/pages/` or similar)
4. **Identify the frontend stack** (React, Vue, Svelte) and routing approach

## Test Patterns

### Page Object Model

Every page under test gets a Page Object class. Place them alongside test files or in a dedicated `pages/` directory.

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

Use selectors in this order of preference:
1. **`data-testid`** — most stable, add to source when needed
2. **Role-based** — `getByRole('button', { name: 'Submit' })`
3. **Text-based** — `getByText('Welcome')`, `getByPlaceholder('Search...')`
4. **Label-based** — `getByLabel('Email address')`
5. **Structural** — `locator('aside').getByRole(...)` for scoping
6. **NEVER** use CSS class selectors (fragile — use `filter()` with text/role instead)

### Test Isolation

Each test gets fresh state. Use `beforeEach` for setup, never share mutable state between tests.

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
// GOOD: wait for specific element
await page.waitForSelector('[data-testid="item-row"]');

// GOOD: wait for API response
await page.waitForResponse(resp =>
  resp.url().includes('/api/items') && resp.status() === 200
);

// GOOD: Playwright auto-wait in assertions
await expect(page.getByText('Item created')).toBeVisible();

// BAD: never use arbitrary timeouts
// await page.waitForTimeout(2000);  // FORBIDDEN
```

### Network Mocking

Mock all API calls with `page.route()` so tests do not depend on a running backend.

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

## Instructions

When asked to generate Playwright tests:

1. **Read the target page/component** — understand UI structure, interactive elements
2. **Read existing tests** for style consistency
3. **Read Playwright config** for project setup
4. **Create/update Page Objects** for each page under test
5. **Generate tests** covering:
   - Page loads and renders key sections
   - Navigation between sections/tabs
   - CRUD operations with mocked API responses
   - Error states (API failures, empty states)
   - Permission/role-based visibility (if applicable)
   - Mobile viewport behavior
6. **Mock all network calls** — tests must not depend on a running backend
7. **Add visual regression snapshots** for pages with complex layouts
8. **Test file naming**: `{page-name}.spec.ts`

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
