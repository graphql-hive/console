---
'@graphql-hive/core': minor
'@graphql-hive/yoga': minor
'@graphql-hive/apollo': minor
---

Add Layer 2 (L2) cache support for persisted documents.

This feature adds a second layer of caching between the in-memory cache (L1) and the CDN for persisted documents. This is particularly useful for:

- **Serverless environments**: Where in-memory cache is lost between invocations
- **Multi-instance deployments**: To share cached documents across server instances
- **Reducing CDN calls**: By caching documents in Redis or similar external caches

The lookup flow is: L1 (memory) -> L2 (Redis/external) -> CDN

**Example with GraphQL Yoga:**

```typescript
import { createYoga } from 'graphql-yoga'
import { useHive } from '@graphql-hive/yoga'
import { createClient } from 'redis'

const redis = createClient()
await redis.connect()

const yoga = createYoga({
  plugins: [
    useHive({
      experimental__persistedDocuments: {
        cdn: {
          endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/<target_id>',
          accessToken: '<cdn_access_token>'
        },
        layer2Cache: {
          cache: {
            get: (key) => redis.get(`hive:pd:${key}`),
            set: (key, value, opts) =>
              redis.set(`hive:pd:${key}`, value, opts?.ttl ? { EX: opts.ttl } : {})
          },
          ttlSeconds: 3600,        // 1 hour for found documents
          notFoundTtlSeconds: 60   // 1 minute for not-found (negative caching)
        }
      }
    })
  ]
})
```

**Features:**
- Configurable TTL for found documents (`ttlSeconds`)
- Configurable TTL for negative caching (`notFoundTtlSeconds`)
- Graceful fallback to CDN if L2 cache fails
- Support for `waitUntil` in serverless environments
- Apollo Server integration auto-uses context cache if available
