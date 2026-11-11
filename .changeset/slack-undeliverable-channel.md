---
'hive': patch
---

A Slack metric alert notification whose channel can't receive messages (`channel_not_found`, `is_archived` or `not_in_channel`) now completes instead of retrying until the job's attempts run out. The delivery is recorded as failed on its final attempt.
