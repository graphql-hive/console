---
'@graphql-hive/envelop': minor
'@graphql-hive/apollo': minor
'@graphql-hive/core': minor
'@graphql-hive/yoga': minor
---

Support circuit breaking for usage reporting.

Circuit breaking is a fault-tolerance pattern that prevents a system from repeatedly calling a failing service. When errors or timeouts exceed a set threshold, the circuit “opens,” blocking further requests until the service recovers.

This ensures that during a network issue or outage, the service using the Hive SDK remains healthy and is not overwhelmed by failed usage reports or repeated retries.

```ts
import { createClient } from "@graphql-hive/core"

const client = createClient({
  agent: {
    circuitBreaker: {
      /**
       * Count of requests before starting evaluating.
       * Default: 5
       */
      volumeThreshold: 5,
      /**
       * Percentage of requests failing before the circuit breaker kicks in.
       * Default: 50
       */
      errorThresholdPercentage: 1,
      /**
       * After what time the circuit breaker is attempting to retry sending requests in milliseconds
       * Default: 30_000
       */
      resetTimeout: 10_000,
    },
  }
})
```
