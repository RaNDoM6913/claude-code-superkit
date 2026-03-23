---
name: playwright-test-generator
description: Generate Playwright e2e tests for the admin frontend panel
model: opus
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Playwright Test Generator — SocialApp Admin Panel

Generate Playwright e2e tests for the admin frontend panel following SocialApp conventions and Playwright best practices.

## Project Context

- **Stack**: React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 3.4 + Radix UI
- **Routing**: state-based (`activePage` in AppShell), NOT React Router
- **API layer**: `requestJSON<T>()` through live-only API clients (`*ApiLive.ts` + `*ApiClient.ts`)
- **Test runner**: `cd adminpanel/frontend && npm run test:e2e`
- **Config**: `adminpanel/frontend/playwright.config.ts` (baseURL `http://127.0.0.1:4173`, Chromium)
- **Existing tests**: `adminpanel/frontend/tests/admin-smoke.spec.ts`
- **Admin pages**: Overview, Users, Moderation, Engagement, Monetization, Ads, Settings, Roles & Access, System

## Test Patterns

### Page Object Model

Every page under test gets a Page Object class. Place them in `adminpanel/frontend/tests/pages/`.

```typescript
// tests/pages/users-page.ts
import { type Locator, type Page, expect } from '@playwright/test';

export class UsersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly userTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('header').getByRole('heading', { level: 2, name: 'Users' });
    this.searchInput = page.getByPlaceholder('Search users...');
    this.userTable = page.getByRole('table');
  }

  async navigate() {
    await this.page.locator('aside').getByRole('button', { name: 'Users' }).click();
    await expect(this.heading).toBeVisible();
  }

  async searchUser(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }
}
```

### Test Isolation

Each test gets fresh state. Use `beforeEach` for setup, never share mutable state between tests.

```typescript
test.describe('Users page', () => {
  let usersPage: UsersPage;

  test.beforeEach(async ({ page }) => {
    // Set up auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('adminMockRole', 'ADMIN');
      window.localStorage.setItem('adminAccessMode', 'mock');
    });
    await page.goto('/');
    usersPage = new UsersPage(page);
    await usersPage.navigate();
  });

  test('displays user list', async () => {
    await expect(usersPage.userTable).toBeVisible();
  });
});
```

### Selector Priority

Use selectors in this order of preference:

1. **`data-testid`** — most stable, add to source when needed
2. **Role-based** — `getByRole('button', { name: 'Approve' })`
3. **Text-based** — `getByText('Growth Overview')`, `getByPlaceholder('Search...')`
4. **Structural** — `locator('aside').getByRole(...)` for scoping
5. **NEVER** use CSS class selectors (`.glass-panel` is fragile — use `filter()` with text/role instead)

### Wait Strategies

```typescript
// GOOD: wait for specific element
await page.waitForSelector('[data-testid="user-row"]');

// GOOD: wait for API response
await page.waitForResponse(resp =>
  resp.url().includes('/admin/v1/users') && resp.status() === 200
);

// GOOD: Playwright auto-wait in assertions
await expect(page.getByText('User approved')).toBeVisible();

// BAD: never use timeouts
// await page.waitForTimeout(2000);  // FORBIDDEN
```

### Network Mocking

Mock all API calls with `page.route()`. The admin panel talks to `http://localhost:8080/admin/*`.

```typescript
test('loads moderation queue from API', async ({ page }) => {
  await page.route('**/admin/v1/moderation/queue*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 'case_1', user_id: 'u1', status: 'PENDING', created_at: '2026-03-01T10:00:00Z' },
        ],
        total: 1,
      }),
    });
  });

  // Set live mode to trigger real API calls (which hit the mock)
  await page.evaluate(() => {
    window.localStorage.setItem('adminAccessMode', 'live');
    window.localStorage.setItem('backendUrl', 'http://localhost:8080');
  });
  await page.reload();

  // Navigate and verify
  await page.locator('aside').getByRole('button', { name: /^Moderation\b/ }).click();
  await expect(page.getByText('case_1')).toBeVisible();
});
```

### Screenshot Comparison (Visual Regression)

```typescript
test('overview page visual regression', async ({ page }) => {
  await expect(page).toHaveScreenshot('overview-dashboard.png', {
    maxDiffPixels: 100,
    fullPage: true,
  });
});
```

Place baseline screenshots in `adminpanel/frontend/tests/__snapshots__/`. Update with `--update-snapshots`.

### Login Flow Helpers

Reuse auth state setup to avoid repeating login in every test.

```typescript
// tests/helpers/auth.ts
import { type Page } from '@playwright/test';

export async function setupAdminAuth(page: Page, role: 'ADMIN' | 'MODERATOR' | 'VIEWER' = 'ADMIN') {
  await page.addInitScript((r) => {
    window.localStorage.setItem('adminMockRole', r);
    window.localStorage.setItem('adminAccessMode', 'mock');
  }, role);
}

export async function setupLiveAuth(page: Page, backendUrl = 'http://localhost:8080') {
  await page.addInitScript((url) => {
    window.localStorage.setItem('adminAccessMode', 'live');
    window.localStorage.setItem('backendUrl', url);
  }, backendUrl);
}
```

### Mobile Viewport Testing

```typescript
test.describe('mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sidebar collapses on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('aside')).not.toBeVisible();
  });
});
```

## Instructions

When asked to generate Playwright tests:

1. **Read the target page** — understand the UI structure, sections, interactive elements
2. **Read existing tests** in `adminpanel/frontend/tests/` for style consistency
3. **Read the Playwright config** (`playwright.config.ts`) for project setup
4. **Create/update Page Objects** in `tests/pages/` for each page under test
5. **Generate tests** covering:
   - Page loads and renders key sections
   - Navigation between sections/tabs
   - CRUD operations with mocked API responses
   - Error states (API failures, empty states)
   - Permission-based visibility (ADMIN vs MODERATOR vs VIEWER roles)
   - Mobile viewport behavior
6. **Mock all network calls** with `page.route()` — tests must not depend on a running backend
7. **Use auth helpers** — create `tests/helpers/auth.ts` if it does not exist
8. **Add visual regression snapshots** for pages with complex layouts
9. **Test file naming**: `{page-name}.spec.ts` in `adminpanel/frontend/tests/`

## Test Coverage Priorities

| Priority | Area | What to test |
|----------|------|-------------|
| P0 | Auth & permissions | Login flow, role-based access, unauthorized redirects |
| P0 | Moderation | Queue load, approve/reject actions, case detail view |
| P1 | Users | User list, search, user detail, status changes |
| P1 | Settings | Tab navigation, draft/validate/apply flow, all 6 tabs |
| P2 | Overview | Dashboard widgets, alerts display, data freshness |
| P2 | Engagement/Monetization | Chart rendering, date range filters, metric cards |
| P3 | Ads | Campaign list, create/edit flow |
| P3 | Roles & Access | Role CRUD, permission matrix |
