---
'@graphql-hive/core': minor
---

**New CDN Artifact Fetcher**

We have a new interface for fetching CDN artifacts (such as supergraph and services) with a cache
from the CDN. This fetcher supports providing a mirror endpoint and comes with a circuit breaker
under the hood.

```ts
const supergraphFetcher = createCDNArtifactFetcher({
  endpoint: [
    'https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688',
    'https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688'
  ],
  accessKey: ''
})

supergraphFetcher.fetch()
```

---

`createSupergraphSDLFetcher` is now deprecated. Please upgrade to use `createCDNArtifactFetcher`.
