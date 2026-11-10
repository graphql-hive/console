---
'hive': minor
---

Add a graph manifest artifact to the CDN for federation projects.

The manifest is available at `/artifacts/v1/<targetId>/manifest.json` and lists all graphs of a
target (the main graph and its contracts), keyed by graph name, with their graph id and the id and
artifact path of their current graph version. It is updated whenever a schema is published, a
subgraph is deleted, or a contract is deleted, and is only written if all graphs are composable.

```json
{
  "graphs": {
    "<graph-name>": {
      "id": "<graph-id>",
      "currentVersion": {
        "id": "<graph-version-id>",
        "artifactPath": "version/<graph-version-id>"
      }
    }
  }
}
```

The `artifactPath` is relative to the location of the manifest, so it can be resolved both when
reading the manifest via the CDN and when reading it directly from the S3 bucket (e.g.
`new URL(artifactPath + '/supergraph', manifestUrl)`):

- CDN: `/artifacts/v1/<targetId>/manifest.json` → `/artifacts/v1/<targetId>/version/<graph-version-id>/supergraph`
- S3: `artifact/<targetId>/manifest.json` → `artifact/<targetId>/version/<graph-version-id>/supergraph`

CDN artifact responses now include the following additional headers:

- `x-hive-graph-id`: the id of the graph the artifact belongs to
- `x-hive-graph-version-id`: the id of the graph version the artifact belongs to (same value as the
  now deprecated `x-hive-schema-version-id` header)
- `last-modified`: when the artifact was last updated

These headers are also sent on `304 Not Modified` responses, as the graph metadata can change while
the artifact contents stay the same.
