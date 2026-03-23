---
name: frontend-patterns
description: TGApp admin frontend patterns — mock/live API layer, page structure, components, types, hooks
user-invocable: false
---

# Admin Frontend Patterns

## Mock/Live API Architecture

Each API domain has 3 files:

### 1. Live API (`src/lib/{domain}ApiLive.ts`)
```typescript
export async function fetchUsers(
  accessToken: string,
  query: AdminUsersQuery
): Promise<AdminUsersResponse> {
  return requestJSON<AdminUsersResponse>(
    `${BACKEND_URL}/admin/users?${buildQuery(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
```

### 2. Mock API (`src/lib/{domain}ApiMock.ts`)
```typescript
export function mockFetchUsers(query: AdminUsersQuery): AdminUsersResponse {
  // Deterministic mock data from src/data/mockData.ts
  return { data: mockUsers.slice(offset, offset + limit), total: mockUsers.length };
}
```

### 3. Client Wrapper (`src/lib/{domain}ApiClient.ts`)
```typescript
export function createAdminUsersApiClient(accessToken?: string) {
  const mode = resolveMode('VITE_ADMIN_USERS_MODE', 'adminUsersMode');

  return {
    fetchUsers: withReadFallback(
      (q) => fetchUsersLive(accessToken!, q),
      (q) => mockFetchUsers(q),
      mode
    ),
  };
}
```

**Mode resolution order:**
1. `VITE_{DOMAIN}_MODE` env var
2. `localStorage['{domain}Mode']`
3. Auth/access mode fallback
4. Default: `'live'`

**Fallback strategy:**
- `withReadFallback`: try live → fall back to mock on error
- `withWriteFallback`: try live → throw on error (no mock writes)

## Page Component Pattern

```typescript
// src/pages/MyPage.tsx
export function MyPage({ accessToken }: { accessToken?: string }) {
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => {
    // Restore from localStorage if needed
  });

  useEffect(() => {
    const controller = new AbortController();
    const client = createMyApiClient(accessToken);
    client.fetchData(filters)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [accessToken, filters]);

  return (/* JSX */);
}

// Optional: TopBar actions for this page
export function MyPageTopBarActions({ ... }) {
  return (/* filter controls, export buttons */);
}
```

## TypeScript Types Pattern

Location: `src/types/{domain}Api.ts`

```typescript
// Enums as type unions
export type UserStatus = 'pending' | 'approved' | 'banned' | 'deleted';

// Base query with common fields
export interface AdminBaseQuery {
  from?: string;
  to?: string;
  preset?: '1d' | '7d' | '1m' | '3m' | '12m' | 'custom';
  tz?: string;
}

// Domain query extending base
export interface AdminUsersQuery extends AdminBaseQuery {
  page?: number;
  per_page?: number;
  search?: string;
  status?: UserStatus;
}

// Response DTO
export interface AdminUsersResponse {
  data: AdminUserDto[];
  total: number;
  page: number;
  per_page: number;
}

// Request (for mutations)
export interface AdminBanUserRequest {
  user_id: string;
  reason: string;
}
```

Naming: `Admin{Feature}{Action}Request`, `Admin{Feature}Response`, `Admin{Feature}Dto`

## Routing (State-Based)

No React Router. Navigation via state in `App.tsx`:

```typescript
// src/App.tsx
const [activePage, setActivePage] = useState('overview');

function renderPage() {
  switch (activePage) {
    case 'overview': return <ProtectedRoute perm="view_metrics"><OverviewPage /></ProtectedRoute>;
    case 'users': return <ProtectedRoute perm="manage_users"><UsersPage /></ProtectedRoute>;
    // ...
  }
}
```

## Component Library

- **UI primitives**: Radix UI (via Shadcn) in `src/components/ui/`
- **Styling**: Tailwind CSS, `cn()` utility for conditional classes
- **Icons**: Lucide React
- **Charts**: Recharts (`LineChartCard`, `BarChartCard`, etc.)
- **Forms**: React Hook Form + Zod validation
- **Toasts**: Sonner
- **Command palette**: cmdk

## Context Hook Pattern

```typescript
const MyContext = createContext<MyValue | undefined>(undefined);

export function MyProvider({ accessToken, children }: Props) {
  const [state, setState] = useState(/* initial */);
  // Business logic...
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

export function useMyContext() {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error('useMyContext must be inside MyProvider');
  return ctx;
}
```

## HTTP Client

Location: `src/lib/httpApi.ts`

```typescript
export async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new ApiRequestError(res.status, code, message);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Full page components (one per admin section) |
| `src/lib/` | API clients, HTTP utils, auth helpers |
| `src/types/` | TypeScript API type definitions |
| `src/components/ui/` | Shadcn/Radix UI components (60+) |
| `src/components/layout/` | Sidebar, TopBar |
| `src/components/admin/` | ProtectedRoute, ExportShell |
| `src/data/` | Mock data (mockData.ts) |
| `src/admin/` | Auth context, permissions, inbox |
| `src/hooks/` | Custom React hooks |
