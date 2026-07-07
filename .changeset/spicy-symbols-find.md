---
'hive': minor
---

Use the optimized operations_by_target_hourly table in the usage estimator if the start time is
after when the table was created. This table has dramatically better performance given the
selection, filters, and grouping.
