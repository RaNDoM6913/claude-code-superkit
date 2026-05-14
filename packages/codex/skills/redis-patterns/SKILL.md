---
name: redis-patterns
description: Redis patterns — caching (cache-aside, write-through), sessions, pub/sub, work queues, distributed locks, data structures (sorted sets, streams, hashes). Covers ioredis, node-redis, Redis 7+. Use when designing Redis usage in Node.js or Python apps
user-invocable: false
---

# Redis Patterns

Production patterns for Redis as a cache, session store, pub/sub bus, work queue backbone, and distributed coordination primitive.

## Use this skill when

- Implementing caching (cache-aside, write-through, write-back)
- Setting up pub/sub or BLPOP-based work queues
- Using Redis data structures (Sorted Sets, Streams, Hash, Sets)
- Configuring ioredis for Node.js production
- Designing key naming and TTL strategies
- Implementing distributed locks with atomic `SET NX EX`

## Do not use this skill when

- The task requires a message broker with guaranteed delivery — use BullMQ, RabbitMQ, or Kafka
- The task is about Redis server-level configuration / cluster setup

## Workflow

1. Identify the use case: caching, pub/sub, queue, session, or rate limiting
2. Choose the right data structure for the access pattern
3. Design keys with `namespace:entity:id` convention
4. Set TTL on every key (unless intentionally persistent: queues, locks-with-expiry)
5. Validate error handling and graceful shutdown

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
- Separate dedicated **subscriber** connection for pub/sub (can't mix with commands)
- **BullMQ**: `maxRetriesPerRequest: null` is mandatory

## Cache-Aside Pattern

```typescript
async function getUser(id: string): Promise<User> {
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

Bulk invalidation: `SCAN` + `DEL` (NEVER `KEYS *` in production).

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

Instant wake-up without polling. For complex queue needs use **BullMQ** built on this primitive.

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
const results = await redis
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

Lua script for release prevents one process releasing another's lock. Always set expiry to prevent deadlock on crash.

For production-grade locking with renewal use **Redlock** algorithm or a hosted lock service.

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

Use `quit()`, NOT `disconnect()` (latter drops in-flight commands).

## Behavioral Traits

- Sets TTL on every SET unless the key is intentionally persistent (queue, lock)
- Uses SCAN, never `KEYS *` in production
- Keeps subscriber connections separate from command connections
- Attaches error event handler before connecting
- Pipeline for batching, multi/exec for atomicity
- BullMQ clients have `maxRetriesPerRequest: null`
- Lua scripts for atomic read-modify-write

## Common Mistakes

- `KEYS *` in production — blocks Redis on large keyspaces
- Missing error handler — unhandled events crash the Node.js process
- Mixing subscribe + command mode on one connection
- No TTL on cache keys — unbounded memory growth
- `disconnect()` in shutdown — drops in-flight commands; use `quit()`
- Omitting `maxRetriesPerRequest: null` for BullMQ — connection failures under load

## Constraints

- **ALWAYS** set TTL on every SET unless intentionally persistent
- **NEVER** use `KEYS *` in production code — use SCAN
- **DEDICATED** connection for subscriber — never mix with commands
- **BullMQ** clients MUST have `maxRetriesPerRequest: null`
- **ERROR HANDLER** attached to every Redis client
- **GRACEFUL SHUTDOWN** uses `quit()`, not `disconnect()`

Adapted from VKirill/codex-starter-kit (community skill).
