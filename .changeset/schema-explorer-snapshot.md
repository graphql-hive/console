---
'hive': minor
---

The schema explorer, the unused schema, the deprecated schema and the schema coordinate insights
are now served from a precomputed binary snapshot of each schema version, instead of parsing the
composite schema and the supergraph on every request. For large schemas these pages load much
faster, and the `server` service no longer blocks its event loop or needs hundreds of MB of memory
per request to serve them.

A snapshot is built once per schema version by the `workflows` service, stored compressed in Redis
and kept in memory by each `server` instance. While the first request for a schema version waits
for its snapshot, later requests reuse it.

The `workflows` service must be running for these pages to load. The behavior can be configured via
the following environment variables of the `server` service:

- `SCHEMA_EXPLORER_CACHE_MEMORY_MAX_MB`: memory for snapshots kept in memory per instance in MB
  (default: `512`).
- `SCHEMA_EXPLORER_SNAPSHOT_BUILD_TIMEOUT_MS`: how long a request waits for the `workflows` service
  to build a missing snapshot (default: `15000`). A request that waits longer fails with a hint to
  retry, while the build continues.
