---
'hive': minor
---

Alert channels can be paused. A toggle on the channel page stops a channel from receiving schema change and metric alert notifications until it is enabled again, and the project's Alerts page marks paused channels. In the GraphQL API this is the `disableAlertChannel` and `enableAlertChannel` mutations, with `disabledAt` and `disabledBy` on alert channels. A channel's delivery health starts afresh when it is enabled; its delivery history stays.
