---
'hive': minor
---

Add organization audit log.

Each organization now has an audit log of all user actions that can be exported by admins.
Exported audit logs are stored on the pre-configured S3 storage.

In case you want to store exported audit logs on a separate S3 bucket, you can use the `S3_AUDIT_LOG` prefixed environment variables for the configuration.
