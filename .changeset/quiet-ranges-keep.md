---
'hive': minor
---

The date range lives in the URL and stays inside what the plan keeps: presets past the retention are greyed out, a link outside it resets with a toast, and the API rejects usage reads that start before the plan's retention (`PERIOD_OUTSIDE_RETENTION`).
