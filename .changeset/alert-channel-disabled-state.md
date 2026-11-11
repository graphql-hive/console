---
'hive': minor
---

Alert channels can be disabled and enabled. A toggle on the channel page pauses a channel, which then receives no schema change or metric alert notifications until it is enabled again; the alerts page and the channel page show it as "Paused". The API gains the `disableAlertChannel` and `enableAlertChannel` mutations and the `disabledAt` and `disabledBy` fields on alert channels. A channel's delivery health is counted from the moment it was last enabled, so enabling a channel starts it afresh; its delivery history stays visible. Hive does not disable channels by itself yet.
