---
name: redis-patterns
description: Redis patterns — caching (cache-aside, write-through), sessions, pub/sub, work queues, distributed locks, data structures (sorted sets, streams, hashes). Covers ioredis, node-redis, Redis 7+. Use when designing Redis usage in Node.js/TypeScript apps
tokens: 2081
user-invocable: false
---

# Redis Patterns

Production patterns for Redis as a cache, session store, pub/sub bus, work-queue backbone, and distributed-coordination primitive in Node.js/TypeScript (ioredis, node-redis, Redis 7+).

## Use this skill when

- Implementing caching (cache-aside, write-through, write-back)
- Setting up pub/sub or BLPOP-based work queues
- Using Redis data structures (Sorted Sets, Streams, Hash, Sets, Lists)
- Configuring ioredis for Node.js production
- Designing key naming and TTL strategies
- Implementing distributed locks with atomic `SET NX PX`

## Do not use this skill when

- You need a message broker with guaranteed delivery — use BullMQ, RabbitMQ, or Kafka
- The task is Redis server-level configuration / cluster setup

## Hard Rules

1. **TTL on every SET** — the only no-TTL exception is queue keys (persistent until consumed). Locks always carry an expiry.
2. **SCAN, never `KEYS *`** in production — `KEYS *` blocks the server on large keyspaces.
3. **Dedicated subscriber connection** — a connection in subscribe mode cannot issue other commands.
4. **Error handler on every client** — an unhandled `error` event crashes the Node.js process.
5. **BullMQ clients set `maxRetriesPerRequest: null`** — otherwise connections fail under load.
6. **Shut down with `quit()`, not `disconnect()`** — `quit()` drains in-flight commands; `disconnect()` drops them.

## Workflow

1. Identify the use case: caching, pub/sub, queue, session, or rate limiting.
2. Choose the data structure that fits the access pattern (see Data Structures table).
3. Design keys with the `scope:entity:id` convention.
4. Set TTL on every key; the only no-TTL exception is queue keys (Hard Rule 1) — locks always carry an expiry.
5. Validate error handling (Hard Rule 4) and graceful shutdown (Hard Rule 6).

Done when: every key has a deliberate TTL or is a documented queue key, the client has an error handler attached before connecting, and shutdown calls `quit()`.

## Connection (ioredis — recommended for Node.js)

```typescript
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  lazyConnect: true,
  connectionName: 'api-server',
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => logger.error({ err }, 'redis'));
redis.on('ready', () => logger.info('redis ready'));
```

- Singleton client; `lazyConnect` defers connection until first command
- `retryStrategy` for exponential backoff
- Separate dedicated **subscriber** connection for pub/sub (Hard Rule 3)
- **BullMQ**: set `maxRetriesPerRequest: null` (Hard Rule 5)

## Cache-Aside Pattern

```typescript
async function getUser(id: string): Promise<User | null> {
  const key = `cache:user:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findUnique({ where: { id } });
  if (user) await redis.set(key, JSON.stringify(user), 'EX', 300);
  return user;
}

async function invalidateUser(id: string) {
  await redis.del(`cache:user:${id}`);
}
```

TTL strategy:
- Volatile data (counters, hot lists): seconds
- Stable data (config, user profiles): minutes to hours
- Rarely-changing reference data: hours to days

Bulk invalidation: `SCAN` + `DEL` (Hard Rule 2).

## Pub/Sub

```typescript
// Publisher (regular connection)
await redis.publish('orders:new', JSON.stringify({ orderId: 123 }));

// Subscriber (DEDICATED connection — can't issue other commands)
const sub = new Redis({ ...config });
await sub.subscribe('orders:new');
sub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  handleOrder(data);
});
```

Pub/sub is fire-and-forget — messages dropped if no subscriber. For durable messaging use **Streams**.

## BLPOP Wake Queue

```typescript
// Producer
await redis.lpush('queue:emails', JSON.stringify(payload));

// Consumer (blocks until item arrives)
while (true) {
  const [, raw] = await redis.brpop('queue:emails', 0);
  await processEmail(JSON.parse(raw));
}
```

Instant wake-up without polling. For complex queue needs use **BullMQ**, built on this primitive.

## Data Structures

| Structure | Use case |
|-----------|----------|
| **Sorted Set** | Leaderboards, sliding-window rate limit, scheduled jobs by score |
| **Stream** (`XADD`/`XREAD`) | Event sourcing, consumer groups, persistent log |
| **Hash** (`HSET`/`HGETALL`) | Object storage with partial updates (user sessions) |
| **Set** | Unique tag membership, set operations (union, intersect, diff) |
| **List** | FIFO/LIFO queues; recent activity via `LPUSH` + `LTRIM` |

## Batch Operations

```typescript
// Pipeline — multiple commands, one round-trip (no atomicity)
const results = await redis
  .pipeline()
  .get('a')
  .get('b')
  .incr('counter')
  .exec();

// Multi/Exec — atomic transaction (all-or-nothing)
const txResults = await redis
  .multi()
  .decrby('inventory:x', 1)
  .lpush('orders', orderId)
  .exec();
```

Pipeline for **performance**, multi/exec for **atomicity**.

## Distributed Locks

```typescript
async function acquireLock(key: string, ttlMs: number, token: string): Promise<boolean> {
  const r = await redis.set(key, token, 'PX', ttlMs, 'NX');
  return r === 'OK';
}

const releaseScript = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

async function releaseLock(key: string, token: string) {
  await redis.eval(releaseScript, 1, key, token);
}
```

The Lua release script prevents one process releasing another's lock. Always set expiry (the `PX` above) to prevent deadlock on crash — locks are never a no-TTL key (Hard Rule 1).

For production-grade locking with renewal use the **Redlock** algorithm or a hosted lock service.

## Lua Scripts

`redis.defineCommand()` caches EVALSHA automatically:

```typescript
redis.defineCommand('rateLimit', {
  numberOfKeys: 1,
  lua: `
    local current = redis.call('incr', KEYS[1])
    if current == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
    return current
  `,
});

const count = await redis.rateLimit(`rate:${userId}`, 60);
```

Use for atomic read-modify-write that can't be expressed with `MULTI`/`EXEC`.

## Key Naming Convention

Pattern: `scope:entity:id`

- `session:user:123`
- `cache:products:featured`
- `lock:payment:456`
- `rate:api:user:789`
- `queue:emails:high`
- `stream:events:user-activity`

Consistent colon separator enables prefix-based scanning and invalidation.

## TTL Strategy Guide

| Use case | Suggested TTL |
|----------|---------------|
| User session | 24h – 7 days |
| API response cache | 1 min – 1 hour |
| Rate limit window | = window size (60s for per-minute) |
| Distributed lock | Slightly longer than expected op duration |
| BLPOP queue keys | No TTL (persistent until consumed) |

## Eviction Policies

| Policy | Behavior | Use case |
|--------|----------|----------|
| `allkeys-lru` | Evict LRU from all keys | Pure caching |
| `volatile-lru` | Evict LRU from keys with TTL | Protect persistent queues |
| `allkeys-lfu` | Evict LFU | Repeated-access patterns |
| `noeviction` | Error on write when full | Required for BullMQ |

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await redis.quit();  // waits for pending commands
  process.exit(0);
});
```

Use `quit()`, not `disconnect()` (Hard Rule 6).

## Common Mistakes (symptom → cause)

- Redis stalls on a large keyspace → `KEYS *` in a hot path (Hard Rule 2).
- Node.js process crashes on a connection blip → no `error` handler attached before connect (Hard Rule 4).
- "Connection in subscriber mode" errors → subscribe + commands mixed on one connection (Hard Rule 3).
- Unbounded memory growth → cache keys written without TTL (Hard Rule 1).
- Jobs lost / commands dropped on deploy → `disconnect()` in shutdown instead of `quit()` (Hard Rule 6).
- BullMQ connection failures under load → missing `maxRetriesPerRequest: null` (Hard Rule 5).

## Recap — non-negotiables

- TTL on every SET except queue keys; locks always expire.
- SCAN, never `KEYS *`, in production.
- Dedicated subscriber connection; error handler on every client.
- BullMQ clients set `maxRetriesPerRequest: null`.
- Shutdown via `quit()`, not `disconnect()`.

Adapted from VKirill/codex-starter-kit (community skill).
