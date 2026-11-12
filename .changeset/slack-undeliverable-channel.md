---
'hive': patch
---

A Slack metric alert notification that fails with an error no retry can fix (the channel is gone or restricted, the organization's Slack token is revoked or lacks a scope, or Slack rejects the message) now completes instead of retrying until the job's attempts run out. The delivery is recorded as failed on its final attempt.
