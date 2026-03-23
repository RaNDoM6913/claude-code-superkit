---
name: frontend-state-management
description: SocialApp user frontend state management — TanStack Query, Zustand, IndexedDB persistence, cache invalidation, multi-account isolation
user-invocable: false
---

# Frontend State Management

State management in the user frontend follows a strict split: **server state** lives in TanStack Query, **client-only state** lives in Zustand. Never mix the two.

## TanStack Query Patterns

### Query Key Factory

All query keys are centralized in `src/api/query-keys.ts`:

```typescript
export const queryKeys = {
  me: ["me"] as const,
  entitlements: ["entitlements"] as const,
  likesIncoming: ["likes", "incoming"] as const,
  matches: ["matches"] as const,
  notifications: ["notifications"] as const,
  privacySettings: ["settings", "privacy"] as const,
  notificationSettings: ["settings", "notifications"] as const,
  profile: ["profile"] as const,
  blockedUsers: ["blocked"] as const,
  blockedContacts: ["blockedContacts"] as const,
  travel: ["travel"] as const,
  feed: ["feed"] as const,
  storeCatalog: ["store", "catalog"] as const,
};
```

Rules:
- **Always** use `queryKeys.xxx` — never inline string arrays
- Keys use `as const` for type-safe matching in `invalidateQueries`
- Hierarchical keys: `["settings", "privacy"]` lets you invalidate all settings with `{ queryKey: ["settings"] }`
- Add new keys here when adding new API endpoints — keep alphabetical within groups

### Query Client Config

Location: `src/api/query-client.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s — data considered fresh
      gcTime: 24 * 60 * 60_000, // 24h — keep in memory/IDB across sessions
      retry: 1,                 // single retry on failure
      refetchOnWindowFocus: false, // TG mini app manages own lifecycle
    },
  },
});
```

### Cache Invalidation After Mutations

Pattern: API function performs mutation, then invalidates related queries.

```typescript
// src/api/profile.ts
export async function updateProfile(payload: ProfileCoreRequest): Promise<ProfileCoreResponse> {
  const result = await requestJSON<ProfileCoreResponse, ProfileCoreRequest>("/v1/profile/core", {
    method: "POST",
    body: payload,
  });
  // Invalidate stale caches — profile data changed, /me might too
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  return result;
}
```

Rules:
- Use `void` prefix — fire-and-forget invalidation (don't block the return)
- Invalidate **all related keys** — e.g. `postRevealOne` invalidates `likesIncoming` + `entitlements` + `me`
- Invalidation is always in the API function (not the component) — ensures consistency regardless of call site

### When to use `useQuery` vs manual fetch

| Use `useQuery` | Use manual `requestJSON` |
|----------------|--------------------------|
| Data displayed on screen (feed, profile, settings) | One-off mutations (swipe, reveal, delete) |
| Needs caching, refetching, loading/error states | Fire-and-forget actions |
| Multiple components share the same data | Response is only used for side-effects |
| Data should survive across navigations | Data isn't displayed (e.g., POST /v1/events) |

### Anti-Patterns

**1. Querying inside event handlers** — BAD:
```typescript
// WRONG: creates a new query on every click
const handleClick = async () => {
  const data = await queryClient.fetchQuery({ queryKey: queryKeys.profile, queryFn: fetchProfile });
};
```
Fix: use `useQuery` in the component, read from cache.

**2. Missing error boundaries** — BAD:
```typescript
// WRONG: unhandled query errors crash the app
const { data } = useQuery({ queryKey: queryKeys.feed, queryFn: getFeed });
```
Fix: always wrap query-consuming subtrees in `<ErrorBoundary>`.

**3. Stale closures in callbacks** — BAD:
```typescript
// WRONG: onClick captures stale `data` from previous render
const { data } = useQuery({ queryKey: queryKeys.me, queryFn: fetchMe });
const handleAction = () => doSomething(data); // stale if data refetched
```
Fix: read `data` from the latest render, or use `queryClient.getQueryData(queryKeys.me)`.

**4. Importing queryClient in components** — BAD:
```typescript
// WRONG: imperative cache reads scattered across components
import { queryClient } from "@/api/query-client";
const cached = queryClient.getQueryData(queryKeys.me);
```
Fix: use `useQuery` hook — it subscribes to updates. Direct `queryClient` access belongs in API functions only.

## Zustand Patterns

### Navigation Store

Single store for all client-only navigation state. Location: `src/stores/navigation.ts`.

```typescript
export const useNavigationStore = create<NavigationState>((set, get) => ({
  // State
  settingsScreen: null,
  showNotificationsInbox: false,
  selectedMatch: null,
  likesCount: 0,
  matchesCount: 0,

  // Actions — verb + noun naming
  openSettings: (screen) => set({ settingsScreen: screen }),
  closeSettings: () => set({ settingsScreen: null, storeInitialProductKey: null }),
  selectMatch: (match) => set({ selectedMatch: match }),
  clearMatch: () => set({ selectedMatch: null }),
  setLikesCounts: (likes, matches) => set({ likesCount: likes, matchesCount: matches }),

  // Computed — use `get()` for derived state
  closeTopOverlay: () => {
    const s = get();
    if (s.settingsScreen) { set({ settingsScreen: null }); return true; }
    if (s.showNotificationsInbox) { set({ showNotificationsInbox: false }); return true; }
    return false;
  },

  hasOverlay: () => {
    const s = get();
    return !!(s.settingsScreen || s.showNotificationsInbox || s.showProfileSettingsModal);
  },

  // Reset (called on user switch)
  reset: () => set({ settingsScreen: null, selectedMatch: null, likesCount: 0, matchesCount: 0 }),
}));
```

### Selector Memoization

**Always** use selectors. Never destructure the entire store.

```typescript
// GOOD: only re-renders when settingsScreen changes
const settingsScreen = useNavigationStore((s) => s.settingsScreen);
const openSettings = useNavigationStore((s) => s.openSettings);

// BAD: re-renders on ANY store change
const { settingsScreen, openSettings } = useNavigationStore();
```

For multiple selectors that should be a single subscription, use `useShallow`:
```typescript
import { useShallow } from "zustand/react/shallow";

const { likesCount, matchesCount } = useNavigationStore(
  useShallow((s) => ({ likesCount: s.likesCount, matchesCount: s.matchesCount }))
);
```

### Action Naming Convention

| Pattern | Examples |
|---------|----------|
| `open` + noun | `openSettings`, `openStore`, `openNotifications`, `openMenu` |
| `close` + noun | `closeSettings`, `closeNotifications`, `closeMenu` |
| `select` + noun | `selectMatch` |
| `clear` + noun | `clearMatch` |
| `set` + noun | `setLikesViewMode`, `setLikesCounts`, `setNotificationUnreadCount` |

### When Zustand vs When TanStack Query

| Zustand | TanStack Query |
|---------|---------------|
| Current screen / tab | User profile from API |
| UI overlay open/closed | Feed candidates from API |
| Selected match for detail view | Entitlements snapshot |
| Likes view mode (likes/matches) | Privacy settings from API |
| Badge counts (derived from API, but displayed in UI) | Notification list |
| Form draft state | Store catalog |

Rule of thumb: if the data **comes from the server**, use TanStack Query. If it's **UI-only state** that the server doesn't know about, use Zustand.

## IndexedDB Persistence

### Setup

Location: `src/api/query-persister.ts`

```typescript
import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const IDB_KEY = "app-query-cache";

export const idbPersister: Persister = {
  persistClient: async (client) => { await set(IDB_KEY, client); },
  restoreClient: async () => { return await get<PersistedClient>(IDB_KEY); },
  removeClient: async () => { await del(IDB_KEY); },
};
```

Key points:
- Uses `idb-keyval` (tiny, promise-based IndexedDB wrapper)
- ~100MB+ storage quota (vs 5MB localStorage)
- Async — doesn't block the main thread
- Single IDB key stores the entire persisted query cache
- `gcTime: 24h` keeps cached data across app restarts within a day

### Wiring in App

```typescript
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "./api/query-client";
import { idbPersister } from "./api/query-persister";

<PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister }}>
  {children}
</PersistQueryClientProvider>
```

## Multi-Account Isolation

Location: `src/api/user-guard.ts`

When a different Telegram account logs in on the same device, **all cached data must be purged** to prevent data leakage.

```typescript
export function guardUserSwitch(userId: number): void {
  const saved = localStorage.getItem("app.last_user_id");
  const savedId = saved ? parseInt(saved, 10) : null;

  if (savedId !== null && !isNaN(savedId) && savedId !== userId) {
    purgeAllUserData();
  }

  localStorage.setItem("app.last_user_id", String(userId));
}
```

Purge sequence:
1. Preserve `myapp.device_id` (per-device, not per-user)
2. Clear all `localStorage`
3. Restore `device_id`
4. Clear `sessionStorage`
5. Clear IndexedDB TanStack Query cache (`idbPersister.removeClient()`)
6. Clear in-memory TanStack Query cache (`queryClient.clear()`)
7. Reset analytics session
8. Reset Zustand navigation store (`useNavigationStore.getState().reset()`)

**Must be called BEFORE writing new auth state** — so old auth tokens are cleared.

## Optimistic Updates with Rollback

Use `useMutation` with `onMutate` / `onError` / `onSettled` for instant UI feedback on user actions (swipes, likes, blocks, settings toggles). The pattern: cancel in-flight queries, snapshot the cache, apply the optimistic update, and roll back from the snapshot on error.

### Standard Pattern

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import { hapticNotification } from "@/haptics";

const queryClient = useQueryClient();

const swipeMutation = useMutation({
  mutationFn: (action: SwipeAction) => postSwipe(action),

  onMutate: async (action) => {
    // 1. Cancel any in-flight refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: queryKeys.feed });

    // 2. Snapshot current cache for rollback
    const previousFeed = queryClient.getQueryData(queryKeys.feed);

    // 3. Optimistic update — remove swiped card from feed
    queryClient.setQueryData(queryKeys.feed, (old: FeedResponse | undefined) => {
      if (!old) return old;
      return { ...old, candidates: old.candidates.filter((c) => c.id !== action.candidateId) };
    });

    // 4. Return snapshot as context for onError rollback
    return { previousFeed };
  },

  onError: (_err, _action, context) => {
    // Rollback to snapshot
    if (context?.previousFeed) {
      queryClient.setQueryData(queryKeys.feed, context.previousFeed);
    }
    // Haptic error feedback — user feels the rollback
    hapticNotification("error");
  },

  onSettled: () => {
    // Always refetch to ensure server truth, whether success or error
    void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
  },
});
```

### Rules

- **Always cancel queries first** (`cancelQueries`) — prevents race conditions where a refetch overwrites the optimistic state
- **Snapshot before mutating** — store `getQueryData` result in `onMutate` return value
- **Rollback on error** — restore from context, never leave stale optimistic data
- **Haptic feedback on error** — `hapticNotification("error")` so the user knows the action failed
- **Invalidate on settled** — regardless of success/failure, re-sync with server truth
- **Keep optimistic updates simple** — only modify the minimum cache keys needed; do not reconstruct complex derived state

### When to Use Optimistic Updates

| Use optimistic | Use await-then-update |
|---|---|
| Swipe like/nope/superlike (instant feel) | Profile core update (complex validation) |
| Block/unblock user (toggle) | Photo upload (needs server processing) |
| Mark notification read (toggle) | Store purchase (payment confirmation needed) |
| Settings toggle (boolean flip) | Account deletion (irreversible) |

### Anti-Pattern: Optimistic Without Rollback

```typescript
// WRONG: no rollback path — on error, UI shows stale optimistic state forever
onMutate: async () => {
  queryClient.setQueryData(queryKeys.feed, (old) => /* mutate */);
  // missing: no snapshot returned, no onError handler
},
```

## Offline Mutation Queue

For resilient mutations when network is unreliable (common in TG WebApp on mobile):

### networkMode Configuration

```typescript
// Per-mutation: queue mutations when offline, execute when back online
const likeMutation = useMutation({
  mutationFn: postLike,
  networkMode: "offlineFirst",  // queue if offline, retry when online
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // exponential: 1s, 2s, 4s... max 30s
});
```

### Connectivity Detection

**Do NOT rely on `navigator.onLine`** — it is unreliable in Telegram WebView (reports `true` even when the mini app has no actual connectivity).

Use a heartbeat check instead:

```typescript
const HEARTBEAT_URL = "/healthz"; // lightweight backend endpoint
const HEARTBEAT_INTERVAL = 15_000; // 15s

let isOnline = true;

async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(HEARTBEAT_URL, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    isOnline = res.ok;
  } catch {
    isOnline = false;
  }
  return isOnline;
}

// Poll on interval — use sparingly, only when offline mutations matter
setInterval(checkConnectivity, HEARTBEAT_INTERVAL);
```

### Rules

- `networkMode: "offlineFirst"` — mutations are queued in memory when offline, auto-retried when connectivity returns
- Exponential backoff with ceiling: `Math.min(1000 * 2 ** attempt, 30_000)`
- **Never use `navigator.onLine`** for connectivity checks in TG WebView
- Heartbeat to `/healthz` (HEAD, no-store, 5s timeout) for real connectivity signal
- Queued mutations are lost on page close — acceptable for non-critical actions (swipes, reads); critical actions (purchases) should show explicit retry UI

## refetchOnWindowFocus Strategy

### Global Default: Disabled

```typescript
// src/api/query-client.ts
defaultOptions: {
  queries: {
    refetchOnWindowFocus: false, // TG mini app focus events are noisy
  },
},
```

**Why**: Telegram WebApp fires `visibilitychange` and `focus` events frequently (keyboard open/close, notification panel, app switcher). Refetching on every focus event causes unnecessary network traffic and UI flicker.

### Exception: Notifications

Notifications need fresh data when the user returns to the app:

```typescript
// In the notifications query
useQuery({
  queryKey: queryKeys.notifications,
  queryFn: fetchNotifications,
  refetchOnWindowFocus: true,  // override global default
  staleTime: 10_000,           // shorter stale time (10s) for notifications
});
```

### When to Override

| Override to `true` | Keep `false` (default) |
|---|---|
| Notifications (user expects fresh count) | Feed (pre-fetched, user-paced) |
| Entitlements after purchase flow return | Profile (user-initiated edits only) |
| | Settings (rarely changed externally) |
| | Likes/matches (push-driven, not poll-driven) |

## Tiered Photo Prefetching

Feed performance depends on having the next cards ready before the user swipes. Use a 3-tier prefetching strategy with decreasing priority.

### Tier 1: Next 3 Card Data via `prefetchQuery`

Prefetch full card data (profile, photos array, thumbhashes) for the next 3 candidates in the feed queue. This runs as a TanStack Query prefetch — cached and deduplicated automatically.

```typescript
// Called after feed data loads or after each swipe
function prefetchNextCards(candidates: MatchCard[], currentIndex: number): void {
  const next3 = candidates.slice(currentIndex + 1, currentIndex + 4);

  for (const card of next3) {
    queryClient.prefetchQuery({
      queryKey: ["candidate", card.id],
      queryFn: () => fetchCandidate(card.id),
      staleTime: 5 * 60_000, // 5min — candidate data rarely changes
    });
  }
}
```

### Tier 2: Next Card Primary Photo via `new Image()`

After Tier 1 data is cached, preload the **primary photo** (index 0) of the next card into the browser image cache. This ensures the first visible photo renders instantly on swipe.

```typescript
function preloadNextCardPhoto(candidates: MatchCard[], currentIndex: number): void {
  const nextCard = candidates[currentIndex + 1];
  if (!nextCard?.photos?.[0]?.url) return;

  const img = new Image();
  img.src = nextCard.photos[0].url;
  // No need to append to DOM — browser caches the decoded image
}
```

### Tier 3: Next+1 Photo via `requestIdleCallback`

When the browser is idle, preload the primary photo of the card after next (currentIndex + 2). Uses `requestIdleCallback` to avoid competing with swipe animations and main-thread work.

```typescript
function preloadNextPlusOnePhoto(candidates: MatchCard[], currentIndex: number): void {
  const card = candidates[currentIndex + 2];
  if (!card?.photos?.[0]?.url) return;

  const preload = () => {
    const img = new Image();
    img.src = card.photos[0].url;
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(preload, { timeout: 3000 }); // 3s max wait
  } else {
    setTimeout(preload, 200); // fallback for environments without rIC
  }
}
```

### Orchestration

Call all three tiers after each swipe and on initial feed load:

```typescript
function onFeedUpdate(candidates: MatchCard[], currentIndex: number): void {
  // Tier 1: data prefetch (highest priority — TanStack Query handles dedup)
  prefetchNextCards(candidates, currentIndex);

  // Tier 2: next card primary photo (high priority — user will see this next)
  preloadNextCardPhoto(candidates, currentIndex);

  // Tier 3: next+1 photo (low priority — idle time only)
  preloadNextPlusOnePhoto(candidates, currentIndex);
}
```

### Rules

- **Tier 1** runs on every swipe and initial load — TanStack Query deduplicates automatically
- **Tier 2** uses `new Image()` — browser-native, no library needed, cached by URL
- **Tier 3** uses `requestIdleCallback` with a 3s timeout fallback — never blocks swipe animations
- **ThumbHash first**: while photos load, ThumbHash placeholders (`ThumbHashImage` component) provide instant LQIP
- **Presigned URLs**: all photo URLs are presigned S3 URLs with TTL — prefetched images remain valid for the session but may expire across sessions
- **Cleanup**: no explicit cleanup needed — browser image cache and TanStack Query gcTime handle eviction

### Anti-Pattern: Eager Full Prefetch

```typescript
// WRONG: prefetching ALL photos for ALL remaining candidates
// This wastes bandwidth and competes with the current card's rendering
for (const card of candidates) {
  for (const photo of card.photos) {
    new Image().src = photo.url; // floods the network queue
  }
}
```

Fix: only prefetch the primary photo (index 0) for the next 1-2 cards. Secondary photos load on-demand when the user opens the detail view.

## gcTime / maxAge / buster Alignment

**Rule**: Persister `maxAge` MUST be >= QueryClient `gcTime`. Otherwise IndexedDB drops data before QueryClient expects, causing empty/inconsistent state on restore.

```typescript
// query-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s
      gcTime: 24 * 60 * 60_000,   // 24h
    },
  },
});

// query-persister.ts — maxAge >= gcTime
const persister = createIDBPersister({
  maxAge: 24 * 60 * 60_000,       // 24h — matches gcTime
  buster: 'v1',                    // bump on breaking API changes to force cache reset
});
```

**`buster`**: a version string. When you change it (e.g., `v1` → `v2`), all cached data is invalidated. Use after:
- Breaking API response format changes
- Major schema migrations
- Removing/renaming query keys

## Zustand useShallow Standard

**Rule**: Always use `useShallow` when selecting multiple fields from a Zustand store. Without it, the component re-renders on ANY store change, even to fields it doesn't use.

```typescript
// CORRECT — only re-renders when selected fields change
import { useShallow } from 'zustand/shallow';

const { currentScreen, likesCount } = useNavigationStore(
  useShallow((s) => ({
    currentScreen: s.currentScreen,
    likesCount: s.likesCount,
  }))
);

// WRONG — re-renders on every store update (matchesCount, overlays, etc.)
const { currentScreen, likesCount } = useNavigationStore();

// EXCEPTION — single field selection is fine without useShallow
const currentScreen = useNavigationStore((s) => s.currentScreen);
```

**When useShallow is NOT needed**:
- Selecting a single primitive field via selector
- Selecting a single action (functions are referentially stable)

## Key Files

| File | Purpose |
|------|---------|
| `src/api/query-keys.ts` | Centralized query key factory |
| `src/api/query-client.ts` | TanStack Query client config (staleTime, gcTime, retry) |
| `src/api/query-persister.ts` | IndexedDB persister via idb-keyval |
| `src/api/user-guard.ts` | Multi-account isolation (purge on user switch) |
| `src/stores/navigation.ts` | Zustand navigation store (screens, overlays, badges) |
| `src/api/http.ts` | Base HTTP client (`requestJSON`) |
| `src/api/*.ts` | Per-domain API functions with cache invalidation |
