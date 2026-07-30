---
'hive': minor
---

Add opt-in AWS RDS IAM authentication for PostgreSQL connections. When enabled, services
authenticate to RDS/Aurora using short-lived IAM tokens (SigV4) instead of static passwords.

### New environment variables

| Variable                        | Services                                                         | Description                                                                |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `AWS_REGION`                    | server, commerce, tokens, usage, workflows, migrations           | Default AWS region for the service for all AWS connections.                |
| `POSTGRES_AWS_IAM_AUTH_ENABLED` | server, commerce, tokens, usage, workflows, migrations           | Set to `1` to enable RDS IAM authentication.                               |
| `POSTGRES_AWS_REGION`           | server, commerce, tokens, usage, workflows, migrations           | AWS region of the RDS instance. Falls back to `AWS_REGION` if not set.     |

### To enable

- `POSTGRES_SSL=1` must be set (RDS IAM requires TLS).
- `POSTGRES_AWS_REGION` or `AWS_REGION` must be set.
- The pod/instance must have AWS credentials available (e.g. IRSA, EKS Pod Identity, instance profile)
  with `rds-db:connect` permission for the configured `POSTGRES_USER`.

