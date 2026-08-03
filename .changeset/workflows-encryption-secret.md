---
'hive': patch
---

Add `ENCRYPTION_SECRET` environment variable to the `workflows` service.

The service needs it to decrypt the Slack token stored by the API service when it dispatches
metric-alert notifications. Set it to the same value as `ENCRYPTION_SECRET` on the server and schema
services, otherwise the token cannot be decrypted and Slack notifications fail.

The variable is optional, so existing deployments keep booting after an upgrade. When it is not set
the service starts normally and every other task keeps running, but Slack metric-alert notifications
are skipped.
