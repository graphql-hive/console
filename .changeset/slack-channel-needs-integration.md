---
'hive': patch
---

Creating a Slack alert channel, or pointing one at a new Slack channel, now requires the organization's Slack integration. Without it the mutation returns an input error on the Slack channel field and writes nothing. Previously `addAlertChannel` created the channel and then failed on its confirmation message.
