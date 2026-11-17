---
'hive': minor
---

The "Edit channel" sheet of an alert channel has a "Test configuration" button under "Advanced". It
sends a test notification to the destination in the form, saved or not, so a Slack channel or an
endpoint can be tried before the channel is pointed at it. The sheet shows whether the destination accepted it, and the
idempotency key sent with it, to find the request on the receiving side. Tests are not part of the
channel's delivery history and are limited to 10 per minute for each channel.

Slack, MS Teams and Discord receive a one-line message. A webhook receives a schema change request
with made-up data and a `Hive-Test: true` header.
