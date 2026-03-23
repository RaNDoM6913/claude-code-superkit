---
name: pagination-and-filtering
description: SocialApp pagination and filtering patterns — cursor-based SQL pagination, LIMIT+1 hasMore, TanStack infinite queries, admin table pagination, debounced search
user-invocable: false
---

# Pagination & Filtering Patterns

## Backend SQL Patterns

### Cursor-Based Pagination (Feeds & Lists)

SocialApp uses **cursor-based** pagination for all user-facing lists (feed, likes, notifications, matches). Never use OFFSET-based pagination for these — it's slow on large tables and produces inconsistent results when rows are inserted/deleted between pages.

**Composite cursor pattern** — use `(created_at, id)` tuple for stable ordering:

```go
func (r *LikeRepo) ListIncomingProfilesCursor(
    ctx context.Context,
    userID int64,
    limit int,
    cursorCreatedAt *time.Time,
    cursorID *int64,
) ([]IncomingLikeRecord, error) {
    hasCursor := cursorCreatedAt != nil && cursorID != nil

    query := `
SELECT l.id, l.from_user_id, p.display_name, l.created_at
FROM likes l
JOIN profiles p ON p.user_id = l.from_user_id
WHERE l.to_user_id = $1`

    var args []any
    args = append(args, userID)

    if hasCursor {
        // Composite cursor: skip rows at or before the cursor position
        query += `
    AND (l.created_at, l.id) < ($2, $3)`
        args = append(args, *cursorCreatedAt, *cursorID)
    }

    query += `
ORDER BY l.created_at DESC, l.id DESC
LIMIT $` + fmt.Sprintf("%d", len(args)+1)
    args = append(args, limit)

    rows, err := r.pool.Query(ctx, query, args...)
    // ...
}
```

Rules:
- **Always** use `(timestamp, id)` composite for cursor — timestamp alone is not unique
- Order and cursor comparison must match: `ORDER BY created_at DESC, id DESC` with `(created_at, id) < ($2, $3)`
- Cursor fields come from the **last item** of the previous page
- Parameter numbers are dynamic (`$N`) — build with `fmt.Sprintf("%d", len(args)+1)`
- Default limit: 20, max limit: 100 — enforce in repo:
  ```go
  if limit <= 0 { limit = 20 }
  if limit > 100 { limit = 100 }
  ```

### LIMIT + 1 Pattern for hasMore Detection

Request one extra row to know if more pages exist — avoids a separate COUNT query:

```go
// Service layer
func (s *Service) ListLikes(ctx context.Context, userID int64, limit int, cursor *Cursor) (*Page, error) {
    // Fetch limit+1 rows
    items, err := s.repo.ListIncoming(ctx, userID, limit+1, cursor)
    if err != nil {
        return nil, fmt.Errorf("ListLikes: %w", err)
    }

    hasMore := len(items) > limit
    if hasMore {
        items = items[:limit] // trim the extra row
    }

    var nextCursor *Cursor
    if hasMore && len(items) > 0 {
        last := items[len(items)-1]
        nextCursor = &Cursor{CreatedAt: last.CreatedAt, ID: last.ID}
    }

    return &Page{Items: items, HasMore: hasMore, NextCursor: nextCursor}, nil
}
```

Handler returns cursor as an opaque string (base64-encoded JSON or simple `created_at:id` format):

```go
type PageResponse struct {
    Items   []ItemDTO `json:"items"`
    Cursor  string    `json:"cursor,omitempty"`  // empty = last page
}
```

### Parameterized ORDER BY

**Never** interpolate user input into ORDER BY clauses. Use a whitelist:

```go
var allowedSortColumns = map[string]string{
    "created_at": "created_at",
    "name":       "display_name",
    "age":        "birthdate",  // sort by birthdate DESC = sort by age ASC
}

func buildOrderBy(sortParam string) string {
    col, ok := allowedSortColumns[sortParam]
    if !ok {
        col = "created_at" // safe default
    }
    return "ORDER BY " + col + " DESC"
}
```

For admin tables where sort direction is user-controlled:

```go
func buildOrderClause(sortBy, sortDir string) string {
    col := allowedSortColumns[sortBy]
    if col == "" { col = "created_at" }
    dir := "DESC"
    if sortDir == "asc" { dir = "ASC" }
    return "ORDER BY " + col + " " + dir
}
```

### Composite Indexes for Filtered Queries

Every cursor-paginated query needs a matching composite index:

```sql
-- Likes: incoming likes for a user, ordered by time
CREATE INDEX idx_likes_to_user_created
    ON likes(to_user_id, created_at DESC, id DESC);

-- Notifications: user's notifications, ordered by time
CREATE INDEX idx_notifications_user_created
    ON notifications(user_id, created_at DESC, id DESC);

-- Feed: candidates filtered by city + created_at cursor
CREATE INDEX idx_profiles_city_created
    ON profiles(city_id, created_at DESC, user_id DESC)
    WHERE approved = TRUE;
```

Index design rules:
- Equality filters first (`user_id =`), then range/cursor columns (`created_at DESC`)
- Include `id DESC` for cursor tiebreaking
- Use partial indexes (`WHERE approved = TRUE`) when queries always filter on a fixed condition
- Verify with `EXPLAIN ANALYZE` — look for Index Scan (not Seq Scan)

### Filtered Count Queries

When a page needs total count alongside results (admin tables), run count in parallel:

```go
func (r *Repo) ListWithCount(ctx context.Context, q Query) ([]Item, int, error) {
    // Count query — same WHERE clause, no ORDER/LIMIT
    var total int
    err := r.pool.QueryRow(ctx, `
        SELECT COUNT(*) FROM items WHERE status = $1
    `, q.Status).Scan(&total)
    if err != nil {
        return nil, 0, fmt.Errorf("count: %w", err)
    }

    // Data query
    rows, err := r.pool.Query(ctx, `
        SELECT id, name, created_at FROM items
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `, q.Status, q.Limit, q.Offset)
    // ...
    return items, total, nil
}
```

Note: OFFSET-based pagination is acceptable for **admin tables** (small result sets, exact page numbers needed). Use cursor-based for user-facing feeds.

## Frontend Patterns

### TanStack Query Infinite Queries (Feeds)

For cursor-paginated API responses, use `useInfiniteQuery`:

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { getFeed } from "@/api/feed";

function useFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: ({ pageParam }) => getFeed(pageParam),
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
    initialPageParam: undefined as string | undefined,
  });
}

// In component:
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
const allCards = data?.pages.flatMap((p) => p.items) ?? [];
```

Rules:
- `getNextPageParam` returns `undefined` to signal "no more pages"
- `pageParam` is the cursor string from the previous response
- Flatten pages with `.flatMap()` for rendering
- Use `hasNextPage` for "load more" button / infinite scroll trigger
- `isFetchingNextPage` for loading spinner at list bottom

### Admin Table Pagination (Page Numbers)

Admin pages use OFFSET-based pagination with explicit page numbers:

```typescript
interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

function UsersPage({ accessToken }: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1, perPage: 25, total: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", pagination.page, pagination.perPage, filters],
    queryFn: () => client.fetchUsers({
      page: pagination.page,
      per_page: pagination.perPage,
      ...filters,
    }),
  });

  // Update total when data arrives
  useEffect(() => {
    if (data?.total !== undefined) {
      setPagination((p) => ({ ...p, total: data.total }));
    }
  }, [data?.total]);

  const totalPages = Math.ceil(pagination.total / pagination.perPage);

  return (
    <>
      <Table data={data?.data ?? []} />
      <PaginationControls
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={(p) => setPagination((s) => ({ ...s, page: p }))}
      />
    </>
  );
}
```

### Filter State: URL Params vs Local State

| Storage | When to use |
|---------|-------------|
| **Local state** (`useState`) | User frontend (no URL bar visible in TG mini app) |
| **localStorage** | Admin filters that should persist across page switches |
| **URL params** | Admin pages where users share links (future consideration) |

Current SocialApp pattern — admin filters persist in localStorage:

```typescript
const [filters, setFilters] = useState(() => {
  const saved = localStorage.getItem("admin.users.filters");
  return saved ? JSON.parse(saved) : defaultFilters;
});

useEffect(() => {
  localStorage.setItem("admin.users.filters", JSON.stringify(filters));
}, [filters]);
```

### Debounced Search Inputs

For search fields that trigger API requests, debounce to avoid request flood:

```typescript
import { useRef, useState, useCallback } from "react";

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [value, delayMs]);

  return debounced;
}

// Usage:
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const { data } = useQuery({
  queryKey: ["admin", "users", debouncedSearch],
  queryFn: () => client.fetchUsers({ search: debouncedSearch }),
  enabled: debouncedSearch.length === 0 || debouncedSearch.length >= 2,
});
```

Rules:
- 300ms debounce for search inputs
- `enabled: false` when search string is 1 character (too broad)
- Show loading indicator tied to query's `isLoading`, not input change

## Key Files

| File | Purpose |
|------|---------|
| `backend/internal/repo/postgres/feed_repo.go` | Feed cursor pagination (composite cursor with priority + created_at + user_id) |
| `backend/internal/repo/postgres/like_repo.go` | Likes cursor pagination (`ListIncomingProfilesCursor`) |
| `backend/internal/repo/postgres/notification_repo.go` | Notifications cursor pagination (`ListByUserCursor`) |
| `frontend/src/api/feed.ts` | Feed API with cursor param |
| `frontend/src/api/likes.ts` | Likes API with cursor param |
| `frontend/src/api/query-keys.ts` | Query key factory for cache management |
