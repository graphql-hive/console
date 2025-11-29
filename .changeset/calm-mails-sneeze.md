---
'@graphql-hive/core': minor
'@graphql-hive/apollo': minor
'@graphql-hive/yoga': minor
---

**Persisted Documents Improvements**

Persisted documents now support specifying a mirror endpoint that will be used in case the main CDN
is unreachable. Provide an array of endpoints to the client configuration.

```ts
import { createClient } from '@graphql-hive/core'

const client = createClient({
  experimental__persistedDocuments: {
    cdn: {
      endpoint: [
        'https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688',
        'https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688'
      ],
      accessToken: ''
    }
  }
})
```

In addition to that, the underlying logic for looking up documents now uses a circuit breaker. If a
single endpoint is unreachable, further lookups on that endpoint are skipped.

The behaviour of the circuit breaker can be customized via the `circuitBreaker` configuration.

```ts
import { createClient } from '@graphql-hive/core'

const client = createClient({
  experimental__persistedDocuments: {
    cdn: {
      endpoint: [
        'https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688',
        'https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688'
      ],
      accessToken: ''
    },
    circuitBreaker: {
      // open circuit if 50 percent of request result in an error
      errorThresholdPercentage: 50,
      // start monitoring the circuit after 10 requests
      volumeThreshold: 10,
      // time before the backend is tried again after the circuit is open
      resetTimeout: 30_000
    }
  }
})
```
