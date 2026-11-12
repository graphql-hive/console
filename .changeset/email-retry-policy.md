---
'hive': minor
---

Emails are handed to the mail provider at most 5 times per job, about 90 seconds of retries, instead of graphile-worker's default of 25 attempts spread over days; the links they carry expire well before that. A refusal of the message itself ends the job at once: Postmark rejecting the recipient or the message (an invalid or inactive recipient, a malformed message) or an SMTP server's permanent reply to the recipient or the message (5xx, except 503). Such an attempt is recorded as the job's last one, so the invitations table and the Email Deliveries page show "attempt 1 of 1" and that Hive has stopped retrying, rather than promising retries that will not come. Rate limits, provider outages and transport failures are still retried, and so is a refusal of Hive's own account, credentials or message stream: that misconfiguration fails the job after its retries and shows up in the job error metrics.
