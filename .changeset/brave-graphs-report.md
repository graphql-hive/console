---
'@graphql-hive/core': minor
---

Report the `graphId` and `graphVersionId` of the executed graph alongside operations in usage reports.

**`@graphql-hive/core`**: `collectUsage`, `collectRequest` and `collectSubscriptionUsage` accept a
`graph: { graphId, graphVersionId }` option for attributing the operation to the graph version it is executed against.
Use the values returned from `createCDNArtifactFetcher().fetch()`. The graph version is only reported if both ids are
valid UUIDs.

```ts
const artifact = await fetcher.fetch()
const graph =
  artifact.graphId && artifact.graphVersionId
    ? { graphId: artifact.graphId, graphVersionId: artifact.graphVersionId }
    : null

// incoming request -> determine graph -> execute
const collect = hive.collectUsage({ graph })
```

**Self-hosting**: The usage service accepts the `graph` operation metadata starting with Hive `15.1.0`. Older versions
reject usage reports containing it, so upgrade your self-hosted Hive instance before passing the `graph` option to the
SDK.
