---
'hive': minor
---

New GraphQL fields for alert channel deliveries: `Project.alertChannel(id)`, `AlertChannel.deliveryStats(period)` (returning `DeliveryStats.totalDeliveries`, `DeliveryStats.totalFailures`, `DeliveryStats.deliveriesOverTime(resolution)` and `DeliveryStats.failuresOverTime(resolution)`, shaped like `Target.operationsStats`), `AlertChannel.deliveryHealth` and `AlertChannel.deliveryLog(period, limit)`. They expose the recorded attempts: bucketed totals, the latest outcome with its status code and text, and the most recent attempts with what Hive sent to identify each call. The three `AlertChannel` fields are nullable: a null means the delivery history could not be read.
