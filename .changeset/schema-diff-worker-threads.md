---
'hive': minor
---

Compute schema diffs in worker threads instead of on the main thread, so diffing large schemas no
longer blocks the event loop of the server.

The behavior can be configured via the following environment variables of the `server` service:

- `SCHEMA_DIFF_WORKER_COUNT`: number of worker threads computing schema diffs (default: `2`). Set to
  `0` to compute schema diffs on the main thread.
- `SCHEMA_DIFF_WORKER_MAX_OLD_GENERATION_SIZE_MB`: heap limit of a schema diff worker thread in MB
  (default: `1536`).
- `SCHEMA_DIFF_WORKER_TIMEOUT_MS`: a schema diff running longer than this fails and its worker
  thread is replaced (default: `15000`).
