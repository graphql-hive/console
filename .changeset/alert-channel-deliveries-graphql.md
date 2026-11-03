---
'hive': minor
---

New GraphQL fields for alert channel deliveries: `Project.alertChannel(id)` and, on every `AlertChannel`, `deliveryStats(period)` (`totalDeliveries`, `totalFailures`, `deliveriesOverTime(resolution)`, `failuresOverTime(resolution)`, shaped like `operationsStats`), `deliveryHealth` and `deliveryLog(period, limit)`. They expose the recorded attempts: bucketed totals, the latest outcome with its status code and text, and the most recent attempts with what Hive sent to identify each call. The three fields are nullable: a null means the delivery history could not be read.
