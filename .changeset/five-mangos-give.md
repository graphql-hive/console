---
'hive': patch
---

Set usageEstimation year validation range at runtime to avoid issues during the new year. This fixes
an issue where the organization settings usage data was not loading for January until the service
was deployed again.
