---
'@graphql-hive/core': minor
---

Expose the graph metadata of CDN artifacts on the result of `createCDNArtifactFetcher`.

The result now contains the following new properties, which are read from the CDN response headers:

- `graphId` (`x-hive-graph-id`): the id of the graph the artifact belongs to
- `graphVersionId` (`x-hive-graph-version-id`): the id of the graph version the artifact belongs to
- `lastModified` (`last-modified`): when the artifact was last modified

The `schemaVersionId` property is deprecated in favor of `graphVersionId`.

The graph metadata can change while the artifact contents stay the same (e.g. a new graph version
with the same supergraph, or a contract that got re-created with the same filter). When the CDN
responds with `304 Not Modified`, the fetcher now updates the cached metadata from the response
headers instead of returning stale values, without downloading the artifact again. If a `304`
response does not contain the metadata headers, the previously cached values are kept.
