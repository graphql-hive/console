---
'hive': patch
---

Restore the documented 60 second budget for external schema composition. `SCHEMA_COMPOSITION_TIMEOUT_MS` now defaults to 60 seconds, and `SCHEMA_EXTERNAL_COMPOSITION_TIMEOUT_MS` defaults to 5 seconds less than it. The external timeout is now one budget for the whole external composition call, shared by retries and contract compositions, instead of a per-attempt limit: a fast failure (connection refused, reset, 5xx) is retried with the time that is left, a slow service gets the whole budget on its first attempt, and a spent budget is not retried. The GraphQL API and the workflows service no longer cap schema service requests at 30 seconds, which silently limited any schema service setting; the cap is now 60 seconds.
