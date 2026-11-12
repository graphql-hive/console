---
'hive': patch
---

The commerce service now looks a target up in Postgres when it is missing from its in-memory rate-limit snapshot, which happens for every usage report or schema check of a target created since the last refresh (`LIMIT_CACHE_UPDATE_INTERVAL_MS`, 60 seconds by default). Previously each such request was reported to Sentry as `Failed to resolve/find rate limit information` and `Failed to resolve/find retention information` while the fallback values were used anyway. A target that no longer exists is logged at `warn` level and not looked up again until the next refresh.
