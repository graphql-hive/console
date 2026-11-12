---
'hive': minor
---

Alert channels can be edited: the new `updateAlertChannel` mutation and the "Edit channel" sheet on the channel page change a channel's name or its destination (the Slack channel or the webhook endpoint). The type is fixed, since the channel's delivery history is kept by it. A new destination receives the same confirmation message a new channel receives, under the `Idempotency-Key` `channel-confirmation:updated:<channel id>:<hash of the destination>`; the previous destination is not told, and a rename sends nothing.

Creating, editing and deleting an alert channel do not produce audit log events.
