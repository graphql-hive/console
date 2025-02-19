---
'hive': patch
---

Adds an index to coordinates\_(daily,hourly,minutely) tables to speedup the
get_top_operations_for_types ClickHoue query.

Reading of type and fields usage statisticts should be noticeably faster now on big datasets.
