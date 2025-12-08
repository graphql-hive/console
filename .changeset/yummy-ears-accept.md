---
'hive': patch
---

Do not swallow 4XX HTTP errors as 500 internal server errors when setry error reporting is enabled.

Send the same predictable error responses with and without the sentry plugin enabled.
