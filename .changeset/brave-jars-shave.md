---
'@graphql-hive/laboratory': patch
---

Make Stop cancel a running subscription on every transport. Cancellation relied on the executor honouring `request.signal`, which `@graphql-tools/executor-legacy-ws` does not, so stopping a `LEGACY_WS` subscription did nothing and the run kept rendering events until the server completed on its own. The stream is now ended from the laboratory side as well.
