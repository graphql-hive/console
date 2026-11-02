---
'hive': minor
---

Alert channel deliveries are now recorded in ClickHouse (new table `alert_channel_deliveries`, created by the migrations service). Every Slack, Microsoft Teams and Discord notification sent by the API records whether the destination accepted it, with the HTTP status and what Hive sent to identify the call.

Microsoft Teams and Discord webhook calls now carry `Hive-Request-ID`, `Hive-Event`, `Hive-Target-ID`, `Hive-Schema-ID` (schema changes), `Idempotency-Key` and a `User-Agent` of `Hive-Webhooks/<release>`. Slack messages carry the same values as message metadata.

Slack notifications now retry at most 3 times inside the Slack client, instead of the client default of 10 retries over about 30 minutes.
