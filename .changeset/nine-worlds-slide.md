---
'@graphql-hive/apollo': minor
---

**Supergraph Manager Improvements**

Persisted documents now support specifying a mirror endpoint that will be used in case the main CDN
is unreachable. Provide an array of endpoints to the supergraph manager configuration.

```ts
import { createSupergraphManager } from '@graphql-hive/apollo'

const supergraphManager = createSupergraphManager({
  endpoint: [
    'https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph',
    'https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph'
  ],
  key: ''
})
```

In addition to that, the underlying logic for looking up documents now uses a circuit breaker. If a
single endpoint is unreachable, further lookups on that endpoint are skipped.

```ts
import { createSupergraphManager } from '@graphql-hive/apollo'

const supergraphManager = createSupergraphManager({
  endpoint: [
    'https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph',
    'https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph'
  ],
  key: '',
  circuitBreaker: {
    // open circuit if 50 percent of request result in an error
    errorThresholdPercentage: 50,
    // start monitoring the circuit after 10 requests
    volumeThreshold: 10,
    // time before the backend is tried again after the circuit is open
    resetTimeout: 30_000
  }
})
```
