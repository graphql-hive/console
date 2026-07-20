---
'hive': minor
---

Added opt-in AWS IAM authentication for S3 connections. When IAM is enabled, services authenticate
to S3 using short-lived SigV4 pre-signed tokens instead of static passwords, since S3 connections
are HTTP requests a new token will be generate for each call.

### New environment variables

| Variable                            | Service | Description                                               |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `S3_AWS_IAM_AUTH_ENABLED`           | server  | Set to `1` to enable IAM authentication for S3.           |
| `S3_MIRROR_AWS_IAM_AUTH_ENABLED`    | server  | Set to `1` to enable IAM authentication for S3 Mirror.    |
| `S3_AUDIT_LOG_AWS_IAM_AUTH_ENABLED` | server  | Set to `1` to enable IAM authentication for S3 Audit Log. |

### To enable

- `S3_*_AWS_IAM_AUTH_ENABLED=1`.
- `S3_BUCKET_NAME` set to the AWS S3 bucket.
- `S3_ENDPOINT` set with the S3 endpoint with the AWS Region (i.e. https://s3.us-east-1.amazonaws.com)

When `CDN_API=1` is set on the server, the CDN artifact handler also uses IAM-authenticated S3 clients.
Adds support for S3 Audit Logs exported to AWS S3.
